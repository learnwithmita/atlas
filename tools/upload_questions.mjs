#!/usr/bin/env node
/**
 * Upload curated question-bank questions from a JSON file into
 * generated_questions. The JSON has { topicId, subjectId, questions: [{ stem,
 * marks, type, commandWords, markScheme:[{point,keywords}], modelAnswer }] }.
 * Inserted with source='ai' and created_by=null (curated/shared), deduped by
 * stem per topic.
 *
 * Env: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY.
 * Usage: node tools/upload_questions.mjs <json-file>
 */
import { readFileSync } from "node:fs";

const [jsonFile] = process.argv.slice(2);
if (!jsonFile) {
  console.error("Usage: node tools/upload_questions.mjs <json-file>");
  process.exit(1);
}
const BASE = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
if (!BASE || !KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const doc = JSON.parse(readFileSync(jsonFile, "utf8"));
const { topicId, subjectId, questions } = doc;
if (!topicId || !Array.isArray(questions)) {
  console.error("JSON must have topicId and a questions array.");
  process.exit(1);
}

// Basic integrity check before touching the DB.
for (const q of questions) {
  if (!q.stem || !q.marks || !Array.isArray(q.markScheme)) {
    console.error("A question is missing stem/marks/markScheme:", q.stem?.slice(0, 40));
    process.exit(1);
  }
  if (q.markScheme.length !== q.marks) {
    console.error(`Mark-scheme length (${q.markScheme.length}) != marks (${q.marks}) for: ${q.stem.slice(0, 50)}`);
    process.exit(1);
  }
}

// Dedup by stem against existing bank questions for this topic.
const res = await fetch(
  `${BASE}/rest/v1/generated_questions?select=stem&topic_id=eq.${topicId}`,
  { headers: H }
);
const existing = new Set((await res.json()).map((r) => r.stem));

const toInsert = questions
  .filter((q) => !existing.has(q.stem))
  .map((q) => ({
    topic_id: topicId,
    subject_id: subjectId ?? null,
    stem: q.stem,
    marks: q.marks,
    type: q.type ?? "structured",
    command_words: q.commandWords ?? [],
    mark_scheme: q.markScheme,
    model_answer: q.modelAnswer ?? null,
    source: "ai",
    created_by: null,
  }));

const skipped = questions.length - toInsert.length;
if (toInsert.length) {
  const ins = await fetch(`${BASE}/rest/v1/generated_questions`, {
    method: "POST",
    headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify(toInsert),
  });
  if (!ins.ok) {
    console.error(`Insert failed (${ins.status}): ${await ins.text()}`);
    process.exit(1);
  }
}
console.log(`Done. Added ${toInsert.length}, skipped ${skipped} (already present). Topic ${topicId}.`);
