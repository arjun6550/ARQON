-- Runtime role used by the app in tests: not superuser, not owner, no BYPASSRLS => RLS applies.
CREATE ROLE arqon_app LOGIN PASSWORD 'app_pw' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
