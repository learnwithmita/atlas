import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { friendlyGeminiError, generateExamQuestions } from "@/lib/gemini";
import { getBackupExamQuestions, getTopicGenerationContext } from "@/lib/data";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase not connected." }, { status: 503 });
  }
  const { topicIds, count } = (await req.json()) as {
    topicIds: string[];
    count: number;
  };
  const n = Math.min(25, Math.max(1, Number(count) || 10));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Gather syllabus outcomes (scope) + example stems from uploaded papers
  // (style) so generation is grounded and fair, not random/obscure.
  const context = await getTopicGenerationContext(topicIds ?? []);
  const idByName = new Map(context.map((t) => [t.name.toLowerCase(), t.id]));
  if (context.length === 0) {
    return NextResponse.json({ error: "Pick at least one topic." }, { status: 400 });
  }

  // Backup: real questions from uploaded papers + the curated bank, used
  // whenever live generation fails or comes back empty, so practice never
  // dead-ends when Gemini is overloaded.
  async function backup(notice: string) {
    const questions = await getBackupExamQuestions(topicIds ?? [], n);
    if (questions.length === 0) return null;
    return NextResponse.json({ questions, source: "backup", notice });
  }

  try {
    const generated = await generateExamQuestions(
      context.map((t) => ({ name: t.name, outcomes: t.outcomes, examples: t.examples })),
      n
    );
    if (generated.length === 0) {
      const fb = await backup(
        "Showing questions from your uploaded papers and bank while the AI writer is busy."
      );
      if (fb) return fb;
      return NextResponse.json({ error: "Couldn't generate questions. Try again." }, { status: 502 });
    }
    const questions = generated.map((q) => ({
      id: randomUUID(),
      topicId: idByName.get(q.topic.toLowerCase()) ?? null,
      source: null,
      ...q,
    }));
    return NextResponse.json({ questions, source: "ai" });
  } catch (e) {
    const fb = await backup(
      "Gemini is busy right now — these are drawn from your uploaded papers and bank. Tap “New set” in a moment for fresh AI questions."
    );
    if (fb) return fb;
    return NextResponse.json({ error: friendlyGeminiError(e) }, { status: 502 });
  }
}
