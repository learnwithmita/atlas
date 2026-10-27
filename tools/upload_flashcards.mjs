#!/usr/bin/env node
/**
 * Upload curated flashcards from a markdown file into the flashcards table.
 * The file has one `## Section` per subtopic, each followed by an HTML comment
 * `<!-- subtopic: <uuid> -->` and a `| Front | Back |` table. Cards are inserted
 * with created_by = null (curated/shared) and deduped by front per subtopic.
 *
 * Env: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY.
 * Usage: node tools/upload_flashcards.mjs <topicId> <md-file>
 */
import { readFileSync } from "node:fs";

const [topicId, mdFile] = process.argv.slice(2);
if (!topicId || !mdFile) {
  console.error("Usage: node tools/upload_flashcards.mjs <topicId> <md-file>");
  process.exit(1);
}
const BASE = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
if (!BASE || !KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

// Parse the markdown into [{subtopicId, cards:[{front,back}]}].
const lines = readFileSync(mdFile, "utf8").split("\n");
const groups = [];
let cur = null;
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/<!--\s*subtopic:\s*([0-9a-f-]+)\s*-->/i);
  if (m) { cur = { subtopicId: m[1], cards: [] }; groups.push(cur); continue; }
  const row = lines[i].match(/^\|(.+)\|(.+)\|\s*$/);
  if (row && cur) {
    const front = row[1].trim(), back = row[2].trim();
    if (!front || /^-+$/.test(front) || front.toLowerCase() === "front") continue;
    cur.cards.push({ front, back });
  }
}

let added = 0, skipped = 0;
for (const g of groups) {
  // existing curated fronts for this subtopic
  const res = await fetch(
    `${BASE}/rest/v1/flashcards?select=front&created_by=is.null&subtopic_id=eq.${g.subtopicId}`,
    { headers: H }
  );
  const existing = new Set((await res.json()).map((r) => r.front));
  const toInsert = g.cards
    .filter((c) => !existing.has(c.front))
    .map((c) => ({ subtopic_id: g.subtopicId, topic_id: topicId, front: c.front, back: c.back, created_by: null }));
  skipped += g.cards.length - toInsert.length;
  if (toInsert.length) {
    const ins = await fetch(`${BASE}/rest/v1/flashcards`, {
      method: "POST",
      headers: { ...H, Prefer: "return=minimal" },
      body: JSON.stringify(toInsert),
    });
    if (!ins.ok) { console.error(`Insert failed (${ins.status}): ${await ins.text()}`); process.exit(1); }
    added += toInsert.length;
  }
  console.log(`subtopic ${g.subtopicId}: +${toInsert.length} (skipped ${g.cards.length - toInsert.length})`);
}
console.log(`Done. Added ${added}, skipped ${skipped} (already present).`);
