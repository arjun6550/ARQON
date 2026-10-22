-- LOCAL DEV ONLY. Runs once, on first initialisation of the Postgres volume.
-- The application connects as arqon_app: not superuser, not table owner, NOBYPASSRLS => Row-Level Security applies.
-- The POSTGRES_USER (owner, superuser in this image) is used only by Flyway migrations.
CREATE ROLE arqon_app LOGIN PASSWORD 'change_me_local_app' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
