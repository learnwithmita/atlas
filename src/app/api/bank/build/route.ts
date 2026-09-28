import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { friendlyGeminiError, generateBankBatch } from "@/lib/gemini";
import { getTopicGenerationContext, insertBankQuestions } from "@/lib/data";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Admin/tutor: pre-generate a batch of bank questions for a topic. */
export async function POST(req: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase not connected." }, { status: 503 });
  }
  const { topicId, count } = (await req.json()) as { topicId: string; count?: number };
  const n = Math.min(30, Math.max(1, Number(count) || 20));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin" && profile?.role !== "tutor") {
    return NextResponse.json({ error: "Admins or tutors only." }, { status: 403 });
  }
  if (!topicId) return NextResponse.json({ error: "No topic." }, { status: 400 });

  const context = await getTopicGenerationContext([topicId]);
  if (context.length === 0) {
    return NextResponse.json({ error: "Topic not found." }, { status: 404 });
  }
  const { data: topic } = await supabase
    .from("topics")
    .select("subject_id")
    .eq("id", topicId)
    .single();

  try {
    const batch = await generateBankBatch(
      context.map((t) => ({ name: t.name, outcomes: t.outcomes, examples: t.examples })),
      n
    );
    const inserted = await insertBankQuestions(
      batch.map((q) => ({
        topicId,
        subjectId: topic?.subject_id ?? null,
        stem: q.stem,
        marks: q.marks,
        type: q.type,
        commandWords: q.commandWords,
        markScheme: q.markScheme,
        modelAnswer: q.modelAnswer,
        createdBy: user.id,
      }))
    );
    return NextResponse.json({ added: inserted.length });
  } catch (e) {
    return NextResponse.json({ error: friendlyGeminiError(e) }, { status: 502 });
  }
}
