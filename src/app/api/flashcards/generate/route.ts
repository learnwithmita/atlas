import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { friendlyGeminiError, generateFlashcards } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase not connected." }, { status: 503 });
  }
  const { subtopicId } = (await req.json()) as { subtopicId: string };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: st } = await supabase
    .from("subtopics")
    .select("id, name, topic_id, learning_outcomes(statement)")
    .eq("id", subtopicId)
    .single();
  if (!st) return NextResponse.json({ error: "Subtopic not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const outcomes = ((st as any).learning_outcomes ?? []).map((o: any) => o.statement);

  try {
    const cards = await generateFlashcards(st.name, outcomes, 8);
    if (cards.length === 0) {
      return NextResponse.json({ error: "No cards generated. Try again." }, { status: 502 });
    }
    const rows = cards.map((c) => ({
      subtopic_id: st.id,
      topic_id: st.topic_id,
      front: c.front,
      back: c.back,
      created_by: user.id,
    }));
    const { error } = await supabase.from("flashcards").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ count: rows.length });
  } catch (e) {
    return NextResponse.json({ error: friendlyGeminiError(e) }, { status: 502 });
  }
}
