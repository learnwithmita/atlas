import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  friendlyGeminiError,
  isGeminiConfigured,
  markAgainstScheme,
  markAnswer,
  markOpenEnded,
  type MarkResult,
} from "@/lib/gemini";
import { getBankScheme } from "@/lib/data";
import { canMarkNow, recordMark } from "@/lib/entitlements";
import { cleanAnswer, isUuid } from "@/lib/validate";

export const runtime = "nodejs";

/**
 * Mark an open-ended answer. Three paths:
 *  - assignment question  → AI derives a scheme (markOpenEnded)
 *  - bank question (bankId) → HYBRID: free keyword match against the stored
 *    scheme, escalating to a single AI call only on borderline scores
 *  - ad-hoc (stem only)   → AI derives a scheme (markOpenEnded)
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase not connected." }, { status: 503 });
  }
  const body = (await req.json()) as {
    questionId?: string;
    bankId?: string | null;
    answer: string;
    stem?: string;
    marks?: number;
    topicId?: string | null;
  };

  // Validate untrusted input before any auth/DB/AI work.
  const checked = cleanAnswer(body.answer);
  if (!checked.ok) {
    return NextResponse.json({ error: checked.error }, { status: 400 });
  }
  body.answer = checked.answer;
  for (const id of [body.questionId, body.bankId, body.topicId]) {
    if (id != null && !isUuid(id)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
  }
  if (body.marks != null) {
    body.marks = Math.min(20, Math.max(1, Number(body.marks) || 3));
  }
  if (typeof body.stem === "string") {
    body.stem = body.stem.trim().slice(0, 4000);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const gate = await canMarkNow();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason, upgrade: true }, { status: 402 });
  }

  let stem = body.stem;
  let marks = body.marks ?? 3;

  // Assignment question: look it up (RLS scopes to the target student). For
  // ad-hoc generated papers the stem is passed directly (not secret).
  if (body.questionId) {
    const { data: q } = await supabase
      .from("assignment_questions")
      .select("stem, marks")
      .eq("id", body.questionId)
      .single();
    if (!q) return NextResponse.json({ error: "Question not found" }, { status: 404 });
    stem = q.stem;
    marks = q.marks ?? 3;
  }

  let result: MarkResult;
  let aiUsed = false; // only a real Gemini call counts against the daily cap

  // Bank question with a stored scheme → hybrid keyword+AI marking.
  const scheme = body.bankId && !body.questionId ? await getBankScheme(body.bankId) : null;
  if (scheme && scheme.scheme.length > 0) {
    stem = scheme.stem || stem;
    marks = scheme.marks || marks;
    const { result: kw, borderline } = markAgainstScheme({
      scheme: scheme.scheme,
      modelAnswer: scheme.modelAnswer,
      marks,
      studentAnswer: body.answer,
    });
    if (borderline && isGeminiConfigured) {
      try {
        result = await markAnswer({
          stem: stem ?? scheme.stem,
          marks,
          markingPoints: scheme.scheme.map((p) => p.point),
          acceptedKeywords: scheme.scheme.flatMap((p) => p.keywords),
          modelAnswer: scheme.modelAnswer,
          studentAnswer: body.answer,
        });
        aiUsed = true;
      } catch {
        result = kw; // AI busy — keep the free keyword result rather than failing
      }
    } else {
      result = kw;
    }
  } else {
    if (!stem) return NextResponse.json({ error: "No question provided" }, { status: 400 });
    try {
      result = await markOpenEnded({ stem, marks, studentAnswer: body.answer });
      aiUsed = true;
    } catch (e) {
      return NextResponse.json({ error: friendlyGeminiError(e) }, { status: 502 });
    }
  }

  // Count this against the daily cap only when a real AI call was made
  // (the keyword-only hybrid path has no Gemini cost). Best-effort.
  if (aiUsed) await recordMark(supabase, user.id, "open");

  // Ad-hoc / bank practice (no assignment question id): log it for review.
  if (!body.questionId) {
    await supabase.from("practice_log").insert({
      student_id: user.id,
      topic_id: body.topicId ?? null,
      question_id: body.bankId ?? null,
      stem,
      marks,
      answer: body.answer,
      awarded: result.awarded,
      awarded_points: result.awardedPoints,
      missing_points: result.missingPoints,
      model_answer: result.modelAnswer,
      improved_answer: result.improvedAnswer,
      feedback: result.feedback,
    });
  }

  // Generated practice: nudge topic-level mastery so the adaptive loop keeps
  // working even though these questions aren't outcome-mapped.
  if (body.topicId) {
    const pct = result.max ? (result.awarded / result.max) * 100 : 0;
    const { data: subs } = await supabase
      .from("subtopics")
      .select("learning_outcomes(id)")
      .eq("topic_id", body.topicId);
    const rows = (subs ?? []) as { learning_outcomes?: { id: string }[] }[];
    const outcomeIds: string[] = rows.flatMap((s) =>
      (s.learning_outcomes ?? []).map((o) => o.id)
    );
    for (const oid of outcomeIds) {
      const { data: existing } = await supabase
        .from("mastery")
        .select("mastery_score, attempts_count")
        .eq("student_id", user.id)
        .eq("learning_outcome_id", oid)
        .maybeSingle();
      const prev = existing?.mastery_score ?? 40;
      // Gentle nudge (0.15) since one question doesn't test the whole topic.
      const next = Math.round(Number(prev) * 0.85 + pct * 0.15);
      await supabase.from("mastery").upsert({
        student_id: user.id,
        learning_outcome_id: oid,
        mastery_score: next,
        confidence: Math.min(1, ((existing?.attempts_count ?? 0) + 1) / 10),
        attempts_count: (existing?.attempts_count ?? 0) + 1,
        last_practiced_at: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json(result);
}
