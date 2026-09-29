import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { friendlyGeminiError, generateFlashcards } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Admin: generate ONE shared flashcard deck for a topic, covering every
 * learning outcome across its subtopics. All cards go under the topic's first
 * subtopic (so there is exactly one deck per topic and "View deck" always finds
 * them), with created_by = null so every student sees them. One AI call.
 */
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

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admins only (shared cards)." }, { status: 403 });
  }

  const { data: topic } = await supabase
    .from("topics")
    .select("id, name, subtopics(id, sort_order, learning_outcomes(statement))")
    .eq("id", topicId)
    .single();
  if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subtopics = (((topic as any).subtopics ?? []) as any[]).sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  if (subtopics.length === 0) {
    return NextResponse.json({ error: "This topic has no subtopics yet." }, { status: 400 });
  }
  const deckSubtopicId = subtopics[0].id;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const outcomes: string[] = subtopics.flatMap((s: any) =>
    (s.learning_outcomes ?? []).map((o: { statement: string }) => o.statement)
  );
  // One card per outcome plus a few key terms; sensible bounds.
  const count = Math.min(40, Math.max(10, outcomes.length + 5));

  try {
    const cards = await generateFlashcards(topic.name, outcomes, count);
    if (cards.length === 0) {
      return NextResponse.json({ error: "No cards generated. Try again." }, { status: 502 });
    }
    // Replace this topic's shared deck so re-running stays clean.
    await supabase.from("flashcards").delete().eq("subtopic_id", deckSubtopicId).is("created_by", null);
    const rows = cards.map((c) => ({
      subtopic_id: deckSubtopicId,
      topic_id: topic.id,
      front: c.front,
      back: c.back,
      created_by: null, // shared / curated → visible to all students
    }));
    const { error } = await supabase.from("flashcards").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ added: rows.length, subtopicId: deckSubtopicId });
  } catch (e) {
    return NextResponse.json({ error: friendlyGeminiError(e) }, { status: 502 });
  }
}
