import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { friendlyGeminiError, generateFlashcards } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Admin: generate SHARED definition flashcards for a whole topic, covering
 * every learning outcome of each subtopic. Cards are stored with created_by
 * = null so every student sees them (curated content). Admin-only because
 * only admins may write shared cards (RLS).
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admins only (shared cards)." }, { status: 403 });
  }

  const { data: topic } = await supabase
    .from("topics")
    .select("id, name, subtopics(id, name, learning_outcomes(statement))")
    .eq("id", topicId)
    .single();
  if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subtopics = ((topic as any).subtopics ?? []) as any[];
  if (subtopics.length === 0) {
    return NextResponse.json({ error: "This topic has no subtopics to cover." }, { status: 400 });
  }

  let added = 0;
  try {
    for (const st of subtopics) {
      const outcomes = (st.learning_outcomes ?? []).map((o: { statement: string }) => o.statement);
      // One card per outcome plus a few key terms, minimum 8.
      const count = Math.min(24, Math.max(8, outcomes.length + 4));
      const cards = await generateFlashcards(st.name, outcomes, count);
      if (cards.length === 0) continue;
      // Replace this subtopic's existing shared cards so re-running stays clean.
      await supabase.from("flashcards").delete().eq("subtopic_id", st.id).is("created_by", null);
      const rows = cards.map((c) => ({
        subtopic_id: st.id,
        topic_id: topic.id,
        front: c.front,
        back: c.back,
        created_by: null, // shared / curated → visible to all students
      }));
      const { error } = await supabase.from("flashcards").insert(rows);
      if (!error) added += rows.length;
    }
  } catch (e) {
    if (added === 0) {
      return NextResponse.json({ error: friendlyGeminiError(e) }, { status: 502 });
    }
  }

  if (added === 0) {
    return NextResponse.json({ error: "No cards generated. Try again." }, { status: 502 });
  }
  return NextResponse.json({ added });
}
