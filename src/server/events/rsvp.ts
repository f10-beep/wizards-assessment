import { count, eq } from "drizzle-orm";
import type { db as Db } from "../db/index";
import { events, rsvps } from "../db/schema";

export type RsvpResult =
  | { status: "confirmed" }
  | { status: "already_rsvped" }
  | { status: "event_full" }
  | { status: "event_not_found" };

function hasPgErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

// Drizzle wraps the underlying driver error in a DrizzleQueryError (the
// Postgres error code lives on `.cause`), so check both.
function isUniqueViolation(error: unknown): boolean {
  return (
    hasPgErrorCode(error, "23505") ||
    (error instanceof Error && hasPgErrorCode(error.cause, "23505"))
  );
}

/**
 * Capacity-safe RSVP: locks the event row (SELECT ... FOR UPDATE) before
 * re-reading the attendee count, so the capacity check sees a guaranteed-
 * current count instead of racing a concurrent RSVP to the same event —
 * see docs/decisions/0003-neon-pooled-transactional-driver.md. The
 * player-name uniqueness check rides on the rsvps unique constraint
 * rather than a separate pre-check, since the constraint is already the
 * authoritative source and a duplicate attempt is rare.
 */
export async function rsvpToEvent(
  db: typeof Db,
  eventId: number,
  playerName: string,
): Promise<RsvpResult> {
  try {
    return await db.transaction(async (tx) => {
      const [event] = await tx
        .select({ capacity: events.capacity })
        .from(events)
        .where(eq(events.id, eventId))
        .for("update");

      if (!event) {
        return { status: "event_not_found" } as const;
      }

      // count() is an aggregate with no GROUP BY, so it always returns
      // exactly one row (0 if there are no matches, never zero rows).
      const [row] = await tx
        .select({ attendeeCount: count() })
        .from(rsvps)
        .where(eq(rsvps.eventId, eventId));

      if (row!.attendeeCount >= event.capacity) {
        return { status: "event_full" } as const;
      }

      await tx.insert(rsvps).values({ eventId, playerName });
      return { status: "confirmed" } as const;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { status: "already_rsvped" };
    }
    throw error;
  }
}
