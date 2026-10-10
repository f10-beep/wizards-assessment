import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "../../db/index";
import {
  getEventById,
  listGameTypes,
  listUpcomingEvents,
} from "../../events/listEvents";
import { cancelRsvp, hasRsvped, rsvpToEvent } from "../../events/rsvp";
import { publicProcedure, router } from "../init";

export const eventsRouter = router({
  // Any visitor may browse events — no role restriction.
  list: publicProcedure
    .input(
      z.object({
        gameType: z.string().trim().min(1).optional(),
        search: z.string().trim().max(200).optional(),
      }),
    )
    .query(async ({ input }) => {
      const upcoming = await listUpcomingEvents(db, input);
      // Dates don't survive the plain-JSON tRPC wire format as Date
      // instances, so serialize explicitly and keep the client type honest.
      return upcoming.map((event) => ({
        ...event,
        startsAt: event.startsAt.toISOString(),
      }));
    }),

  byId: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const event = await getEventById(db, input.id);
      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }
      return { ...event, startsAt: event.startsAt.toISOString() };
    }),

  gameTypes: publicProcedure.query(() => listGameTypes(db)),

  rsvp: publicProcedure
    .input(
      z.object({
        eventId: z.number().int().positive(),
        userPrincipal: z.string().trim().min(1).max(100),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await rsvpToEvent(db, input.eventId, input.userPrincipal);

      if (result.status === "event_not_found") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }
      if (result.status === "event_full") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This event is full.",
        });
      }
      if (result.status === "already_rsvped") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You've already RSVPed to this event.",
        });
      }

      return { status: "confirmed" as const };
    }),

  myRsvp: publicProcedure
    .input(
      z.object({
        eventId: z.number().int().positive(),
        userPrincipal: z.string().trim().min(1).max(100),
      }),
    )
    .query(async ({ input }) => {
      const rsvped = await hasRsvped(db, input.eventId, input.userPrincipal);
      return { rsvped };
    }),

  cancelRsvp: publicProcedure
    .input(
      z.object({
        eventId: z.number().int().positive(),
        userPrincipal: z.string().trim().min(1).max(100),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await cancelRsvp(db, input.eventId, input.userPrincipal);

      if (result.status === "not_found") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "You don't have an RSVP for this event.",
        });
      }

      return { status: "cancelled" as const };
    }),
});
