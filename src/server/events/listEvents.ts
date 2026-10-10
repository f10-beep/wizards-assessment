import { and, asc, count, eq, gte, ilike, or, type SQL } from "drizzle-orm";
import type { db as Db } from "../db/index";
import { events, rsvps } from "../db/schema";

export type EventListFilters = {
  /** Exact match against events.gameType. */
  gameType?: string;
  /** Case-insensitive substring match against title or location. */
  search?: string;
};

export type EventListItem = {
  id: number;
  title: string;
  gameType: string;
  location: string;
  startsAt: Date;
  capacity: number;
  attendeeCount: number;
};

// Escape ILIKE wildcard characters so a search term like "50% off" is
// matched literally instead of being interpreted as a pattern.
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * Upcoming events (startsAt in the future), soonest first, optionally
 * filtered by game type and/or a text search over title/location.
 * attendeeCount is derived from live rsvps rows (never a cached counter)
 * so it can never drift from reality — see docs/decisions/0002-mvp-stack.md.
 */
export async function listUpcomingEvents(
  db: typeof Db,
  filters: EventListFilters,
  now: Date = new Date(),
): Promise<EventListItem[]> {
  const conditions: SQL[] = [gte(events.startsAt, now)];

  if (filters.gameType) {
    conditions.push(eq(events.gameType, filters.gameType));
  }

  if (filters.search?.trim()) {
    const pattern = `%${escapeLikePattern(filters.search.trim())}%`;
    conditions.push(
      or(ilike(events.title, pattern), ilike(events.location, pattern))!,
    );
  }

  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      gameType: events.gameType,
      location: events.location,
      startsAt: events.startsAt,
      capacity: events.capacity,
      attendeeCount: count(rsvps.id),
    })
    .from(events)
    .leftJoin(rsvps, eq(rsvps.eventId, events.id))
    .where(and(...conditions))
    .groupBy(events.id)
    .orderBy(asc(events.startsAt));

  return rows;
}

/**
 * A single event by id, with its live attendee count — regardless of
 * whether it has already started (a direct link to an event shouldn't
 * 404 just because it's in progress, unlike the "upcoming" browse list).
 * Returns undefined if no event with that id exists.
 */
export async function getEventById(
  db: typeof Db,
  id: number,
): Promise<EventListItem | undefined> {
  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      gameType: events.gameType,
      location: events.location,
      startsAt: events.startsAt,
      capacity: events.capacity,
      attendeeCount: count(rsvps.id),
    })
    .from(events)
    .leftJoin(rsvps, eq(rsvps.eventId, events.id))
    .where(eq(events.id, id))
    .groupBy(events.id);

  return rows[0];
}

/** Distinct game types currently in use, for populating a filter control. */
export async function listGameTypes(db: typeof Db): Promise<string[]> {
  const rows = await db
    .selectDistinct({ gameType: events.gameType })
    .from(events)
    .orderBy(asc(events.gameType));
  return rows.map((row) => row.gameType);
}
