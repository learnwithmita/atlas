import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isUuid, sniffImageExt } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Which table + folder each target maps to.
const TARGETS: Record<string, { table: string; folder: string }> = {
  flashcard: { table: "flashcards", folder: "flashcards" },
  extracted: { table: "extracted_questions", folder: "extracted" },
  note: { table: "topic_notes", folder: "notes" },
};

/**
 * Admin: upload an image (made in Google Flow or anywhere) and attach it to a
 * flashcard, extracted question, or topic notes by setting its image_url.
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Supabase not connected." }, { status: 503 });
  }
  if (!isServiceConfigured) {
    return NextResponse.json({ error: "Uploads need SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "");
  const id = String(form.get("id") ?? "");
  const target = TARGETS[kind];
  if (!target || !id) return NextResponse.json({ error: "Bad target." }, { status: 400 });
  // id becomes part of the storage path — require the UUID shape it always has,
  // which also blocks path traversal.
  if (!isUuid(id)) return NextResponse.json({ error: "Bad id." }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "Attach an image." }, { status: 400 });
  const ext = EXT[file.type];
  if (!ext) return NextResponse.json({ error: "Use a PNG, JPG, WEBP or GIF image." }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "Image must be under 8 MB." }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  // Don't trust the declared MIME type — verify the real bytes, and make the
  // stored extension follow the sniffed type.
  const sniffed = sniffImageExt(bytes);
  if (!sniffed) {
    return NextResponse.json({ error: "That file isn't a valid image." }, { status: 400 });
  }

  const MIME: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
  };
  const svc = createServiceClient();
  const path = `${target.folder}/${id}.${sniffed}`;
  const up = await svc.storage
    .from("study-images")
    .upload(path, bytes, { contentType: MIME[sniffed], upsert: true });
  if (up.error) return NextResponse.json({ error: `Upload failed: ${up.error.message}` }, { status: 500 });
  const { data: pub } = svc.storage.from("study-images").getPublicUrl(path);
  const url = `${pub.publicUrl}?v=${Date.now()}`;

  const key = kind === "note" ? "topic_id" : "id";
  const { error } = await supabase.from(target.table).update({ image_url: url }).eq(key, id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ url });
}
