-- Added without a DEFAULT; backfilled before the NOT NULL is enforced so
-- this doesn't fail against an events table that already has rows (e.g.
-- a local dev DB seeded before this migration existed).
ALTER TABLE "events" ADD COLUMN "organizer_principal" text;
--> statement-breakpoint
UPDATE "events" SET "organizer_principal" = '' WHERE "organizer_principal" IS NULL;
--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "organizer_principal" SET NOT NULL;