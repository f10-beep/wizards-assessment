import assert from "node:assert/strict";
import { after, before, suite, test } from "node:test";
import * as schema from "../db/schema";
import { createTestDb } from "../db/testDb";
import { getEventWithAttendees } from "./attendees";

const HOUR = 60 * 60 * 1000;
const now = new Date("2026-06-01T12:00:00Z");

suite("getEventWithAttendees", () => {
  let db: Awaited<ReturnType<typeof createTestDb>>["db"];
  let cleanup: () => Promise<void>;
  let eventId: number;

  before(async () => {
    ({ db, cleanup } = await createTestDb());

    const [event] = await db
      .insert(schema.events)
      .values({
        title: "Friday Night Magic",
        gameType: "Magic: The Gathering",
        location: "The Round Table Games",
        startsAt: new Date(now.getTime() + 2 * HOUR),
        capacity: 4,
        organizerPrincipal: "organizer@example.com",
      })
      .returning({ id: schema.events.id });
    eventId = event!.id;

    await db.insert(schema.rsvps).values([
      { eventId, userPrincipal: "priya@example.com" },
      { eventId, userPrincipal: "alex@example.com" },
    ]);
  });

  after(() => cleanup());

  test("returns the event and its attendees for the owning organizer", async () => {
    const result = await getEventWithAttendees(
      db,
      eventId,
      "organizer@example.com",
    );

    assert.equal(result?.event.title, "Friday Night Magic");
    assert.deepEqual(
      result?.attendees.map((a) => a.userPrincipal),
      ["priya@example.com", "alex@example.com"],
    );
  });

  test("lists attendees in RSVP order", async () => {
    const result = await getEventWithAttendees(
      db,
      eventId,
      "organizer@example.com",
    );

    const timestamps = result!.attendees.map((a) => a.rsvpedAt.getTime());
    assert.deepEqual(
      timestamps,
      [...timestamps].sort((a, b) => a - b),
    );
  });

  test("returns undefined for a different organizer principal", async () => {
    const result = await getEventWithAttendees(
      db,
      eventId,
      "someone-else@example.com",
    );
    assert.equal(result, undefined);
  });

  test("returns undefined for a nonexistent event id", async () => {
    const result = await getEventWithAttendees(
      db,
      999_999,
      "organizer@example.com",
    );
    assert.equal(result, undefined);
  });
});
