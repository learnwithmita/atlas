-- ============================================================================
-- Atlas — answers for extracted (paper) questions.
-- Extracted questions have no answer by default. This lets an admin generate a
-- model answer + mark scheme for them (stored once, shown in the bank and in
-- the printable answer key). Run AFTER 0005. Re-runnable.
-- ============================================================================

alter table extracted_questions add column if not exists model_answer text;
alter table extracted_questions add column if not exists mark_scheme jsonb; -- array of point strings
