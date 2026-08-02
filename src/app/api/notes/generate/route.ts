import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { friendlyGeminiError, generateTopicNotes } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase not connected." }, { status: 503 });
  }
  const { topicId } = (await req.json()) as { topicId: string };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: topic } = await supabase
    .from("topics")
    .select("id, name, subtopics(learning_outcomes(statement))")
    .eq("id", topicId)
    .single();
  if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const outcomes = ((topic as any).subtopics ?? []).flatMap((s: any) =>
    (s.learning_outcomes ?? []).map((o: any) => o.statement)
  );

  try {
    const notes = await generateTopicNotes(topic.name, outcomes);
    await supabase.from("topic_notes").upsert({
      topic_id: topicId,
      key_points: notes.keyPoints,
      misconceptions: notes.misconceptions,
      updated_at: new Date().toISOString(),
    });
    return NextResponse.json(notes);
  } catch (e) {
    return NextResponse.json({ error: friendlyGeminiError(e) }, { status: 502 });
  }
}
