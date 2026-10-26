#!/usr/bin/env node
/**
 * Upload a markdown notes document into topic_notes.body (requires migration
 * 0027). Rewrites repo-relative diagram paths to their /public URLs so the
 * images resolve in the app.
 *
 * Env: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY.
 * Usage:
 *   node tools/upload_notes.mjs <topicId> <md-file> [fromPath=toUrl ...]
 * Example (Cell Structure):
 *   node tools/upload_notes.mjs d68d5046-49f0-4bc9-b226-3a490d2ace3f \
 *     docs/guides/cell-structure-and-organisation.md \
 *     ../diagrams/cell-structure/cells-labelled.png=/notes/cell-structure/cells-labelled.png
 */
import { readFileSync } from "node:fs";

const [topicId, mdFile, ...rewrites] = process.argv.slice(2);
if (!topicId || !mdFile) {
  console.error("Usage: node tools/upload_notes.mjs <topicId> <md-file> [from=to ...]");
  process.exit(1);
}

const BASE = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
if (!BASE || !KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

let body = readFileSync(mdFile, "utf8");
for (const r of rewrites) {
  const [from, to] = r.split("=");
  if (from && to) body = body.split(from).join(to);
}

// Upsert on topic_id so it works whether or not a notes row already exists.
const res = await fetch(`${BASE}/rest/v1/topic_notes?on_conflict=topic_id`, {
  method: "POST",
  headers: {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=representation",
  },
  body: JSON.stringify({ topic_id: topicId, body }),
});
const text = await res.text();
if (!res.ok) {
  console.error(`Failed (${res.status}): ${text}`);
  process.exit(1);
}
console.log(`Uploaded ${body.length} chars of markdown to topic_notes.body for ${topicId}.`);
