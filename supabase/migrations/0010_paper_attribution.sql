-- ============================================================================
-- Atlas — paper provenance (school / year / exam type) so extracted practice
-- questions can be credited to their source. Run AFTER 0003. Re-runnable.
-- ============================================================================

alter table resources add column if not exists school     text;
alter table resources add column if not exists year       text;
alter table resources add column if not exists paper_type text;
