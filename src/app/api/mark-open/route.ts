import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { friendlyGeminiError, markOpenEnded } from "@/lib/gemini";

export const runtime = "nodejs";

/** Mark an answer to an assignment question (no stored scheme — Gemini derives one). */
export async function POST(req: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase not connected." }, { status: 503 });
  }
  const body = (await req.json()) as {
    questionId?: string;
    answer: string;
    stem?: string;
    marks?: number;
    topicId?: string | null;
  };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

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

  if (!stem) return NextResponse.json({ error: "No question provided" }, { status: 400 });

  let result;
  try {
    result = await markOpenEnded({ stem, marks, studentAnswer: body.answer });
  } catch (e) {
    return NextResponse.json({ error: friendlyGeminiError(e) }, { status: 502 });
  }

  // Ad-hoc generated practice (no assignment question id): log it for review.
  if (!body.questionId) {
    await supabase.from("practice_log").insert({
      student_id: user.id,
      topic_id: body.topicId ?? null,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const outcomeIds: string[] = (subs ?? []).flatMap((s: any) =>
      (s.learning_outcomes ?? []).map((o: any) => o.id)
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
