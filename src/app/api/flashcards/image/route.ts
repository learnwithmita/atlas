import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { friendlyGeminiError, generateDiagram } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 120;

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** Admin: generate a black-and-white diagram for a flashcard and attach it. */
export async function POST(req: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase not connected." }, { status: 503 });
  }
  if (!isServiceConfigured) {
    return NextResponse.json(
      { error: "Image upload needs SUPABASE_SERVICE_ROLE_KEY in .env.local." },
      { status: 503 }
    );
  }
  const { cardId } = (await req.json()) as { cardId: string };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const { data: card } = await supabase
    .from("flashcards")
    .select("id, front, subtopic:subtopics(topic:topics(subject:subjects(name)))")
    .eq("id", cardId)
    .single();
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subject = (card as any).subtopic?.topic?.subject?.name ?? "science";

  let img;
  try {
    img = await generateDiagram(card.front, subject);
  } catch (e) {
    return NextResponse.json({ error: friendlyGeminiError(e) }, { status: 502 });
  }
  if (!img) {
    return NextResponse.json({ error: "No image returned. Try again." }, { status: 502 });
  }

  const svc = createServiceClient();
  const ext = EXT[img.mimeType] ?? "png";
  const path = `flashcards/${cardId}.${ext}`;
  const bytes = Buffer.from(img.data, "base64");
  const up = await svc.storage
    .from("study-images")
    .upload(path, bytes, { contentType: img.mimeType, upsert: true });
  if (up.error) {
    return NextResponse.json({ error: `Upload failed: ${up.error.message}` }, { status: 500 });
  }
  const { data: pub } = svc.storage.from("study-images").getPublicUrl(path);
  // Cache-bust so a regenerated image refreshes.
  const url = `${pub.publicUrl}?v=${Date.now()}`;

  const { error: updErr } = await supabase
    .from("flashcards")
    .update({ image_url: url })
    .eq("id", cardId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ url });
}
