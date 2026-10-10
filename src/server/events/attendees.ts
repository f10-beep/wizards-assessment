import { and, asc, eq } from "drizzle-orm";
import type { db as Db } from "../db/index";
import { events, rsvps } from "../db/schema";

export type EventAttendee = {
  userPrincipal: string;
  rsvpedAt: Date;
};

export type OrganizerEventSummary = {
  id: number;
  title: string;
  gameType: string;
  location: string;
  startsAt: Date;
  capacity: number;
};

/**
 * An event and its attendee roster, for the organizer who posted it.
 * organizerPrincipal is filtered in the same query that looks up the
 * event (not checked after the fact), per ADR 0006: a caller can't tell
 * "this event doesn't exist" apart from "this event isn't yours," and
 * can never read another organizer's roster — plausibly real contact
 * info, since userPrincipal is email-shaped. Returns undefined for
 * either case.
 */
export async function getEventWithAttendees(
  db: typeof Db,
  eventId: number,
  organizerPrincipal: string,
): Promise<
  { event: OrganizerEventSummary; attendees: EventAttendee[] } | undefined
> {
  const [event] = await db
    .select({
      id: events.id,
      title: events.title,
      gameType: events.gameType,
      location: events.location,
      startsAt: events.startsAt,
      capacity: events.capacity,
    })
    .from(events)
    .where(
      and(
        eq(events.id, eventId),
        eq(events.organizerPrincipal, organizerPrincipal),
      ),
    );

  if (!event) {
    return undefined;
  }

  // RSVP order doubles as the first-come-first-served seating order.
  const attendees = await db
    .select({ userPrincipal: rsvps.userPrincipal, rsvpedAt: rsvps.createdAt })
    .from(rsvps)
    .where(eq(rsvps.eventId, eventId))
    .orderBy(asc(rsvps.createdAt));

  return { event, attendees };
}
