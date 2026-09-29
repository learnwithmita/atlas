-- ============================================================================
-- Atlas — a diagram for topic notes.
-- Biology/Chemistry notes benefit from a visual (organelle, apparatus, etc.).
-- Adds a topic-level diagram to notes, stored in the public 'study-images'
-- bucket (0017). Run AFTER 0011 + 0017. Re-runnable.
-- ============================================================================

alter table topic_notes add column if not exists image_url text;
