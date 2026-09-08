-- 0052: health_search_queries — anonymous aggregate of what people search
-- for on health topics, so /reports in the admin panel can show a top-queries
-- table without touching Yandex Metrika/AppMetrica (which must never see
-- search text — analytics there stays structural-only, per this round of
-- work's D task).
--
-- Deliberately NO user_id / patient_id column: this table is a frequency
-- count of NORMALIZED query text, not a per-user search history. One row
-- per distinct normalized query; POST /v1/aivita/health-search/log is an
-- upsert keyed on that text (see the unique constraint below), incrementing
-- `count` and bumping `last_searched_at` rather than inserting a new row
-- per search.
--
-- No client currently calls that endpoint — no free-text "search by
-- symptom" UI exists yet anywhere in apps/aivita (symptom-checker is a
-- fixed body-map + picklist, not free text). This is infrastructure ahead
-- of that feature, not a bug: the top-queries table in admin will show
-- nothing until something starts logging to it.
--
-- CREATE TABLE/INDEX IF NOT EXISTS — idempotent on a database this has
-- already been applied to.

CREATE TABLE IF NOT EXISTS "health_search_queries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query_normalized" text NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"last_searched_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "health_search_queries_query_unique" UNIQUE("query_normalized")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_search_queries_count_idx" ON "health_search_queries" ("count");
