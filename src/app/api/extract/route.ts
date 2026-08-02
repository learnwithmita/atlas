import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { extractQuestions, friendlyGeminiError } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export async function POST(req: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase not connected." }, { status: 503 });
  }
  const { resourceId } = (await req.json()) as { resourceId: string };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // RLS ensures the caller can only read their own (or, as admin, any) resource.
  const { data: resource } = await supabase
    .from("resources")
    .select("id, file_path, subject_id")
    .eq("id", resourceId)
    .single();
  if (!resource?.file_path) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  const ext = resource.file_path.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = MIME[ext];
  if (!mimeType) {
    return NextResponse.json(
      { error: "Extraction supports PDF and image files (PDF/PNG/JPG). Re-upload the paper in one of those formats." },
      { status: 400 }
    );
  }

  // Download the file from private Storage.
  const dl = await supabase.storage.from("resources").download(resource.file_path);
  if (dl.error || !dl.data) {
    return NextResponse.json({ error: `Couldn't read the file: ${dl.error?.message}` }, { status: 500 });
  }
  const base64 = Buffer.from(await dl.data.arrayBuffer()).toString("base64");

  // Topic list to classify against (subject-scoped when known).
  let topicQuery = supabase.from("topics").select("id, name, subject:subjects(name)");
  if (resource.subject_id) topicQuery = topicQuery.eq("subject_id", resource.subject_id);
  const { data: topicRows } = await topicQuery;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topics = (topicRows ?? []).map((t: any) => ({
    id: t.id as string,
    name: t.name as string,
    subject: (t.subject?.name as string) ?? "",
  }));
  const byName = new Map(topics.map((t) => [t.name.toLowerCase(), t.id]));

  await supabase.from("resources").update({ status: "processing" }).eq("id", resourceId);

  let extraction;
  try {
    extraction = await extractQuestions(base64, mimeType, topics.map((t) => ({ name: t.name, subject: t.subject })));
  } catch (e) {
    await supabase.from("resources").update({ status: "uploaded" }).eq("id", resourceId);
    return NextResponse.json({ error: friendlyGeminiError(e) }, { status: 502 });
  }
  const extracted = extraction.questions;

  if (extracted.length === 0) {
    await supabase.from("resources").update({ status: "uploaded" }).eq("id", resourceId);
    return NextResponse.json(
      { error: "Couldn't read any questions from this file. Make sure it's a clear PDF or image of an exam paper, then try again." },
      { status: 502 }
    );
  }

  // Map detected topic names to ids (exact, else contains).
  function topicIdFor(name: string): string | null {
    const key = name.trim().toLowerCase();
    if (byName.has(key)) return byName.get(key)!;
    const hit = topics.find(
      (t) => key.includes(t.name.toLowerCase()) || t.name.toLowerCase().includes(key)
    );
    return hit?.id ?? null;
  }

  // Replace any previous extraction for this resource.
  await supabase.from("extracted_questions").delete().eq("resource_id", resourceId);

  const rows = extracted.map((q) => {
    const topic_id = topicIdFor(q.topic);
    return {
      resource_id: resourceId,
      question_number: q.number,
      stem: q.stem,
      marks: Math.round(q.marks),
      type: q.type,
      command_words: q.commandWords,
      topic_id,
      detected_topic_name: q.topic,
      confidence: q.confidence,
    };
  });

  if (rows.length > 0) {
    const { error } = await supabase.from("extracted_questions").insert(rows);
    if (error) {
      await supabase.from("resources").update({ status: "uploaded" }).eq("id", resourceId);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const topicsTested = [...new Set(rows.map((r) => r.topic_id).filter(Boolean))] as string[];
  const m = extraction.meta;
  await supabase
    .from("resources")
    .update({
      status: "extracted",
      extracted_count: rows.length,
      topics_tested: topicsTested,
      // Only fill provenance we don't already have (admin may have typed it).
      school: m.school || undefined,
      year: m.year || undefined,
      paper_type: m.paperType || undefined,
    })
    .eq("id", resourceId);

  return NextResponse.json({ count: rows.length, topicsTested: topicsTested.length });
}
