-- ============================================================================
-- Atlas — diagrams for extracted (paper) questions.
-- Many paper questions refer to a figure/micrograph the student can't see.
-- This lets an admin generate a black-and-white diagram for them, stored in the
-- public 'study-images' bucket (created in 0017). Run AFTER 0005 + 0017.
-- Re-runnable.
-- ============================================================================

alter table extracted_questions add column if not exists image_url text;
