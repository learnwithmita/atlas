import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { friendlyGeminiError, generateAnswersForQuestions } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Admin: generate model answers + mark schemes for a topic's paper questions. */
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
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const { data: topic } = await supabase
    .from("topics")
    .select("name, subject:subjects(name)")
    .eq("id", topicId)
    .single();
  const topicName = topic?.name ?? "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subject = (topic as any)?.subject?.name ?? "science";

  // Fetch this topic's extracted questions lacking an answer (by id + name).
  const sel = "id, stem, marks, model_answer";
  const [byId, byName] = await Promise.all([
    supabase.from("extracted_questions").select(sel).eq("topic_id", topicId).limit(200),
    topicName
      ? supabase.from("extracted_questions").select(sel).is("topic_id", null).ilike("detected_topic_name", topicName).limit(200)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (byId.error || byName.error) {
    return NextResponse.json(
      { error: "Run migration 0019_extracted_answers.sql first (adds the answer columns)." },
      { status: 503 }
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = [...(byId.data ?? []), ...(byName.data ?? [])].filter((q: any) => !q.model_answer);
  if (rows.length === 0) {
    return NextResponse.json({ added: 0, message: "All paper questions already have answers." });
  }

  let answers;
  try {
    answers = await generateAnswersForQuestions(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rows.map((q: any) => ({ stem: q.stem, marks: q.marks ?? 2 })),
      subject
    );
  } catch (e) {
    return NextResponse.json({ error: friendlyGeminiError(e) }, { status: 502 });
  }

  let added = 0;
  for (let i = 0; i < rows.length; i++) {
    const a = answers[i];
    if (!a || !a.modelAnswer) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase
      .from("extracted_questions")
      .update({ model_answer: a.modelAnswer, mark_scheme: a.points })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .eq("id", (rows[i] as any).id);
    if (!error) added++;
  }

  return NextResponse.json({ added });
}
