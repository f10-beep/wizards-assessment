import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "../../db/index";
import {
  getEventById,
  listGameTypes,
  listUpcomingEvents,
} from "../../events/listEvents";
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
});
