-- ============================================================================
-- Atlas — flashcard diagrams.
-- Adds an image to a flashcard (AI-generated black-and-white diagram, e.g. of
-- an organelle) stored in a public 'study-images' bucket. Run AFTER 0007.
-- Re-runnable.
-- ============================================================================

alter table flashcards add column if not exists image_url text;

-- Public bucket so <img src> works directly; the app writes to it with the
-- service-role key (uploads are admin-only in the API layer).
insert into storage.buckets (id, name, public)
values ('study-images', 'study-images', true)
on conflict (id) do nothing;
