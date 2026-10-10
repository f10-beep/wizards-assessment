import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { requireOrganizer } from "../../auth/roles";
import { db } from "../../db/index";
import { createEvent } from "../../events/createEvent";
import {
  getEventById,
  listGameTypes,
  listMyEvents,
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

  // Organizer-facing: posts a new event owned by organizerPrincipal.
  // Gated by the organizer role claim (see
  // docs/decisions/0006-organizer-role-claim.md) — isOrganizer is
  // client-claimed today (no accounts yet), but requireOrganizer is the
  // same check a verified session would go through later.
  create: publicProcedure
    .input(
      z.object({
        title: z.string().trim().min(1).max(200),
        gameType: z.string().trim().min(1).max(100),
        location: z.string().trim().min(1).max(200),
        startsAt: z.iso.datetime(),
        capacity: z.number().int().positive().max(1000),
        organizerPrincipal: z.string().trim().min(1).max(100),
        isOrganizer: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      requireOrganizer({
        principal: input.organizerPrincipal,
        isOrganizer: input.isOrganizer,
      });

      const result = await createEvent(db, {
        title: input.title,
        gameType: input.gameType,
        location: input.location,
        capacity: input.capacity,
        organizerPrincipal: input.organizerPrincipal,
        startsAt: new Date(input.startsAt),
      });

      if (result.status === "starts_in_past") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Event start time must be in the future.",
        });
      }

      return { status: "created" as const, id: result.id };
    }),

  myEvents: publicProcedure
    .input(z.object({ userPrincipal: z.string().trim().min(1).max(100) }))
    .query(async ({ input }) => {
      const mine = await listMyEvents(db, input.userPrincipal);
      return mine.map((event) => ({
        ...event,
        startsAt: event.startsAt.toISOString(),
      }));
    }),

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
