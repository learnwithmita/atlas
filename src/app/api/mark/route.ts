import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { friendlyGeminiError, markAnswer } from "@/lib/gemini";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { questionId, answer, timeTaken } = (await req.json()) as {
      questionId: string;
      answer: string;
      timeTaken?: number;
    };

    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: "Supabase not connected." },
        { status: 503 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { data: q } = await supabase
      .from("questions")
      .select(
        `id, stem, marks, mark_schemes ( marking_points, model_answer, accepted_keywords ),
         question_outcomes ( learning_outcome_id )`
      )
      .eq("id", questionId)
      .single();

    if (!q) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ms = (Array.isArray((q as any).mark_schemes)
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (q as any).mark_schemes[0]
      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (q as any).mark_schemes) ?? {};

    let result;
    try {
      result = await markAnswer({
        stem: q.stem,
        marks: q.marks,
        markingPoints: ms.marking_points ?? [],
        modelAnswer: ms.model_answer ?? "",
        acceptedKeywords: ms.accepted_keywords ?? [],
        studentAnswer: answer,
      });
    } catch (e) {
      // AI failed (e.g. rate limit) — return a clean message, persist nothing.
      return NextResponse.json({ error: friendlyGeminiError(e) }, { status: 502 });
    }

    // Persist the attempt.
    const { data: attempt } = await supabase
      .from("attempts")
      .insert({
        student_id: user.id,
        question_id: questionId,
        response_text: answer,
        is_correct: result.awarded >= result.max,
        awarded_marks: result.awarded,
        max_marks: result.max,
        time_taken_s: timeTaken ?? null,
        source: "practice",
      })
      .select("id")
      .single();

    if (attempt) {
      await supabase.from("ai_feedback").insert({
        attempt_id: attempt.id,
        awarded_marks: result.awarded,
        missing_points: result.missingPoints,
        error_type: result.errorType,
        model_answer: result.modelAnswer,
        improved_answer: result.improvedAnswer,
        model_used: process.env.GEMINI_MARKING_MODEL ?? "gemini-2.5-pro",
      });
    }

    // Nudge mastery for each mapped outcome (EMA toward this score).
    const pct = result.max ? (result.awarded / result.max) * 100 : 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const outcomeIds: string[] = ((q as any).question_outcomes ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (o: any) => o.learning_outcome_id
    );
    for (const oid of outcomeIds) {
      const { data: existing } = await supabase
        .from("mastery")
        .select("mastery_score, attempts_count")
        .eq("student_id", user.id)
        .eq("learning_outcome_id", oid)
        .maybeSingle();
      const prev = existing?.mastery_score ?? 40;
      const next = Math.round(prev * 0.7 + pct * 0.3);
      await supabase.from("mastery").upsert({
        student_id: user.id,
        learning_outcome_id: oid,
        mastery_score: next,
        confidence: Math.min(1, ((existing?.attempts_count ?? 0) + 1) / 8),
        attempts_count: (existing?.attempts_count ?? 0) + 1,
        last_practiced_at: new Date().toISOString(),
      });
    }

    // Streak + XP.
    await supabase.rpc("touch_streak", {
      p_xp: 10 + Math.round(pct / 10),
      p_minutes: 2,
    });

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Marking error" },
      { status: 500 }
    );
  }
}
