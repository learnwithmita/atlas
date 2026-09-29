import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { friendlyGeminiError, generateSyllabusTree } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 120;

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Admin only — seeding the curriculum writes platform-wide content.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Attach a syllabus PDF." }, { status: 400 });
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = MIME[ext];
  if (!mimeType) {
    return NextResponse.json(
      { error: "Upload the syllabus as a PDF, PNG or JPG." },
      { status: 400 }
    );
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  // Optional admin overrides from the form.
  const override = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v.trim() : "";
  };

  let tree;
  try {
    tree = await generateSyllabusTree(base64, mimeType);
  } catch (e) {
    return NextResponse.json({ error: friendlyGeminiError(e) }, { status: 502 });
  }

  const subjectName = override("subjectName") || tree.subjectName;
  const level = override("level") || tree.level || "G3";
  const track =
    override("track") ||
    tree.track ||
    (/(combined)/i.test(subjectName) ? "Combined" : "Pure");
  const code = override("code") || tree.code || null;

  if (!subjectName || tree.topics.length === 0) {
    return NextResponse.json(
      {
        error:
          "Couldn't read a topic structure from this document. Make sure it's the official syllabus PDF (with topics and learning outcomes), then try again.",
      },
      { status: 502 }
    );
  }

  // ---- Seed the curriculum spine idempotently --------------------------------
  // Find-or-create the subject by (name, level, track).
  const { data: existingSubj } = await supabase
    .from("subjects")
    .select("id")
    .eq("name", subjectName)
    .eq("level", level)
    .eq("track", track)
    .maybeSingle();

  let subjectId = existingSubj?.id as string | undefined;
  if (!subjectId) {
    const { data: created, error: subjErr } = await supabase
      .from("subjects")
      .insert({
        name: subjectName,
        exam_body: tree.examBody || "SEAB",
        syllabus_code: code,
        level,
        track,
        icon: /chem/i.test(subjectName) ? "flask" : /combined/i.test(subjectName) ? "atom" : "leaf",
      })
      .select("id")
      .single();
    if (subjErr || !created) {
      return NextResponse.json(
        { error: `Couldn't create the subject: ${subjErr?.message ?? "unknown error"}` },
        { status: 500 }
      );
    }
    subjectId = created.id;
  } else {
    // Keep code/exam-body fresh on re-ingest.
    await supabase
      .from("subjects")
      .update({ syllabus_code: code, exam_body: tree.examBody || "SEAB" })
      .eq("id", subjectId);
  }

  let topicCount = 0;
  let subtopicCount = 0;
  let outcomeCount = 0;

  // Normalise names so re-ingesting the same syllabus doesn't create numbered
  // duplicates ("1. Cell Structure" vs "Cell Structure").
  const clean = (s: string) => s.replace(/^\s*\d+[.)]\s*/, "").trim();

  for (let ti = 0; ti < tree.topics.length; ti++) {
    const t = tree.topics[ti];
    const topicNameClean = clean(t.name);
    // Find-or-create topic (case-insensitive match on the cleaned name).
    const { data: exTopic } = await supabase
      .from("topics")
      .select("id")
      .eq("subject_id", subjectId)
      .ilike("name", topicNameClean)
      .maybeSingle();
    let topicId = exTopic?.id as string | undefined;
    if (!topicId) {
      const { data: newTopic } = await supabase
        .from("topics")
        .insert({ subject_id: subjectId, name: topicNameClean, sort_order: ti })
        .select("id")
        .single();
      topicId = newTopic?.id;
    } else {
      await supabase.from("topics").update({ sort_order: ti }).eq("id", topicId);
    }
    if (!topicId) continue;
    topicCount++;

    for (let si = 0; si < t.subtopics.length; si++) {
      const s = t.subtopics[si];
      const { data: exSub } = await supabase
        .from("subtopics")
        .select("id")
        .eq("topic_id", topicId)
        .eq("name", s.name)
        .maybeSingle();
      let subId = exSub?.id as string | undefined;
      if (!subId) {
        const { data: newSub } = await supabase
          .from("subtopics")
          .insert({ topic_id: topicId, name: s.name, sort_order: si })
          .select("id")
          .single();
        subId = newSub?.id;
      } else {
        await supabase.from("subtopics").update({ sort_order: si }).eq("id", subId);
      }
      if (!subId) continue;
      subtopicCount++;

      // Replace outcomes for this subtopic so re-ingest stays clean.
      await supabase.from("learning_outcomes").delete().eq("subtopic_id", subId);
      if (s.outcomes.length > 0) {
        const rows = s.outcomes.map((o) => ({
          subtopic_id: subId,
          code: o.code || null,
          statement: o.statement,
        }));
        const { error: outErr } = await supabase.from("learning_outcomes").insert(rows);
        if (!outErr) outcomeCount += rows.length;
      }
    }
  }

  // ---- Record the syllabus in the "what's loaded" overview -------------------
  const title = `${subjectName} (${level}${track ? `, ${track}` : ""})`;
  const summary = {
    subject_id: subjectId,
    code,
    title,
    subject_name: subjectName,
    exam_body: tree.examBody || "SEAB",
    level,
    track,
    topic_count: topicCount,
    subtopic_count: subtopicCount,
    outcome_count: outcomeCount,
    uploaded_by: user.id,
    updated_at: new Date().toISOString(),
  };

  // One row per subject/level/track — update if it already exists.
  const { data: exSyl } = await supabase
    .from("syllabuses")
    .select("id")
    .eq("subject_name", subjectName)
    .eq("level", level)
    .eq("track", track)
    .maybeSingle();
  if (exSyl?.id) {
    await supabase.from("syllabuses").update(summary).eq("id", exSyl.id);
  } else {
    await supabase.from("syllabuses").insert(summary);
  }

  return NextResponse.json({
    ok: true,
    subject: { id: subjectId, name: subjectName, level, track, code },
    counts: { topics: topicCount, subtopics: subtopicCount, outcomes: outcomeCount },
    tree,
  });
}
