import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { friendlyGeminiError, generateQuestionDiagram, referencesDiagram } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 300;

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

/** Admin: generate diagrams for a topic's paper questions that reference one. */
export async function POST(req: Request) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Supabase not connected." }, { status: 503 });
  if (!isServiceConfigured) {
    return NextResponse.json({ error: "Image upload needs SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 });
  }
  const { topicId } = (await req.json()) as { topicId: string };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const { data: topic } = await supabase
    .from("topics")
    .select("name, subject:subjects(name)")
    .eq("id", topicId)
    .single();
  const topicName = topic?.name ?? "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subject = (topic as any)?.subject?.name ?? "science";

  const sel = "id, stem, image_url";
  const [byId, byName] = await Promise.all([
    supabase.from("extracted_questions").select(sel).eq("topic_id", topicId).limit(200),
    topicName
      ? supabase.from("extracted_questions").select(sel).is("topic_id", null).ilike("detected_topic_name", topicName).limit(200)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (byId.error || byName.error) {
    return NextResponse.json(
      { error: "Run migration 0020_extracted_images.sql first (adds the image column)." },
      { status: 503 }
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = [...(byId.data ?? []), ...(byName.data ?? [])].filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (q: any) => !q.image_url && referencesDiagram(q.stem)
  );
  if (rows.length === 0) {
    return NextResponse.json({ added: 0, message: "No paper questions here need a diagram." });
  }

  const svc = createServiceClient();
  let added = 0;
  // Cap per call so we don't run forever on quota-limited image models.
  for (const q of rows.slice(0, 10)) {
    let img;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      img = await generateQuestionDiagram((q as any).stem, subject);
    } catch (e) {
      if (added === 0) return NextResponse.json({ error: friendlyGeminiError(e) }, { status: 502 });
      break; // partial success — stop on first failure
    }
    if (!img) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const id = (q as any).id;
    const ext = EXT[img.mimeType] ?? "png";
    const path = `extracted/${id}.${ext}`;
    const up = await svc.storage
      .from("study-images")
      .upload(path, Buffer.from(img.data, "base64"), { contentType: img.mimeType, upsert: true });
    if (up.error) continue;
    const { data: pub } = svc.storage.from("study-images").getPublicUrl(path);
    const url = `${pub.publicUrl}?v=${Date.now()}`;
    const { error } = await supabase.from("extracted_questions").update({ image_url: url }).eq("id", id);
    if (!error) added++;
  }

  return NextResponse.json({ added, remaining: Math.max(0, rows.length - added) });
}
