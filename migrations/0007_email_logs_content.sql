-- =========================================================
-- SubShare — Email Log Content
-- Depends on: 0001_initial_schema.sql
-- =========================================================

alter table email_logs add column subject text;
alter table email_logs add column body text;
