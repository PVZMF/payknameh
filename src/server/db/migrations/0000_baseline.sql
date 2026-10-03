-- Baseline (PK-006). Tech §7.2: every time is timestamptz; pinning the database time zone
-- to UTC keeps server-side defaults and text output identical in every environment.
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'UTC');
END
$$;
