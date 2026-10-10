import type { db as Db } from "../db/index";
import { events } from "../db/schema";

export type NewEvent = {
  title: string;
  gameType: string;
  location: string;
  startsAt: Date;
  capacity: number;
  organizerPrincipal: string;
};

export type CreateEventResult =
  | { status: "created"; id: number }
  | { status: "starts_in_past" };

/**
 * Creates an event owned by organizerPrincipal. The only business-rule
 * check belongs here, not just at the API boundary (zod handles shape —
 * title length, capacity > 0 — but "is this a plausible event to post"
 * needs the current time, so it's a function argument like
 * listUpcomingEvents' `now`, not hardcoded `new Date()`).
 */
export async function createEvent(
  db: typeof Db,
  input: NewEvent,
  now: Date = new Date(),
): Promise<CreateEventResult> {
  if (input.startsAt.getTime() <= now.getTime()) {
    return { status: "starts_in_past" };
  }

  const [inserted] = await db.insert(events).values(input).returning({
    id: events.id,
  });

  return { status: "created", id: inserted!.id };
}
