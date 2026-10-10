import { TRPCError } from "@trpc/server";

/**
 * The current caller's identity and role claims. Deliberately decoupled
 * from *how* those claims get populated: today an Actor is built straight
 * from client-supplied tRPC input (see docs/decisions/0006-organizer-role-claim.md),
 * since there's no session to read it from — but requireOrganizer and its
 * call sites don't need to change when that source becomes a verified
 * session/IdP token instead. Only the Actor-construction call sites
 * (the routers) would change.
 */
export type Actor = {
  principal: string;
  isOrganizer: boolean;
};

/** Throws if the actor hasn't claimed the organizer role. */
export function requireOrganizer(actor: Actor): void {
  if (!actor.isOrganizer) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only organizers may do this.",
    });
  }
}
