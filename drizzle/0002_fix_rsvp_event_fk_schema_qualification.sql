-- Un-qualifies the FK target that 0000 generated as "public"."events" —
-- see the comment on rsvps.eventId in src/server/db/schema.ts for why.
ALTER TABLE "rsvps" DROP CONSTRAINT "rsvps_event_id_events_id_fk";
--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE cascade ON UPDATE no action;
