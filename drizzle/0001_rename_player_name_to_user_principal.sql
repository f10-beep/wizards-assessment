ALTER TABLE "rsvps" RENAME COLUMN "player_name" TO "user_principal";--> statement-breakpoint
ALTER TABLE "rsvps" DROP CONSTRAINT "rsvps_event_id_player_name_unique";--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_event_id_user_principal_unique" UNIQUE("event_id","user_principal");