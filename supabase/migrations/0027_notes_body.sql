-- Full markdown body for topic notes. The curated notes are authored as a single
-- markdown document (headings, tables, images, worked examples), so store and
-- render that verbatim instead of squashing it into key-point bullets. The old
-- key_points / misconceptions columns stay for backward compatibility.
alter table topic_notes add column if not exists body text;
