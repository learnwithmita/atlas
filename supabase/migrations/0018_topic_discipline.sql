-- ============================================================================
-- Atlas — discipline tag on topics.
-- Combined Science mixes Biology, Chemistry (and Physics) topics under one
-- subject. Tagging each topic's discipline lets the app present them as
-- "Science (Biology)" and "Science (Chemistry)". Run AFTER 0001. Re-runnable.
-- ============================================================================

alter table topics add column if not exists discipline text; -- 'biology' | 'chemistry' | 'physics' | null
