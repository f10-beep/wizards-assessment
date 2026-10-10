import assert from "node:assert/strict";
import { after, before, suite, test } from "node:test";
import { and, count, eq, sql } from "drizzle-orm";
import * as schema from "../db/schema";
import { createTestDb } from "../db/testDb";
import { cancelRsvp, hasRsvped, rsvpToEvent } from "./rsvp";

const HOUR = 60 * 60 * 1000;
const now = new Date("2026-06-01T12:00:00Z");

suite("rsvpToEvent", () => {
  let db: Awaited<ReturnType<typeof createTestDb>>["db"];
  let cleanup: () => Promise<void>;
  let openEventId: number;
  let fullEventId: number;

  before(async () => {
    ({ db, cleanup } = await createTestDb());

    const [openEvent] = await db
      .insert(schema.events)
      .values({
        title: "Friday Night Magic",
        gameType: "Magic: The Gathering",
        location: "The Round Table Games",
        startsAt: new Date(now.getTime() + HOUR),
        capacity: 5,
        organizerPrincipal: "organizer@example.com",
      })
      .returning({ id: schema.events.id });
    openEventId = openEvent!.id;

    const [fullEvent] = await db
      .insert(schema.events)
      .values({
        title: "Catan Night",
        gameType: "Catan",
        location: "Board & Brew Café",
        startsAt: new Date(now.getTime() + HOUR),
        capacity: 1,
        organizerPrincipal: "organizer@example.com",
      })
      .returning({ id: schema.events.id });
    fullEventId = fullEvent!.id;

    await db
      .insert(schema.rsvps)
      .values({ eventId: fullEventId, userPrincipal: "Sam" });
  });

  after(() => cleanup());

  test("confirms an RSVP when seats are open", async () => {
    const result = await rsvpToEvent(db, openEventId, "Alex");
    assert.deepEqual(result, { status: "confirmed" });
  });

  test("rejects a duplicate RSVP from the same principal", async () => {
    await rsvpToEvent(db, openEventId, "Priya");
    const result = await rsvpToEvent(db, openEventId, "Priya");
    assert.deepEqual(result, { status: "already_rsvped" });
  });

  test("rejects an RSVP once the event is full", async () => {
    const result = await rsvpToEvent(db, fullEventId, "Jordan");
    assert.deepEqual(result, { status: "event_full" });
  });

  test("rejects an RSVP for a nonexistent event", async () => {
    const result = await rsvpToEvent(db, 999_999, "Alex");
    assert.deepEqual(result, { status: "event_not_found" });
  });

  test("never double-counts a retried/double-submitted RSVP from the same principal", async () => {
    const [raceEvent] = await db
      .insert(schema.events)
      .values({
        title: "Resubmit Stress Test",
        gameType: "Magic: The Gathering",
        location: "The Round Table Games",
        startsAt: new Date(now.getTime() + HOUR),
        capacity: 10,
        organizerPrincipal: "organizer@example.com",
      })
      .returning({ id: schema.events.id });
    const raceEventId = raceEvent!.id;

    // Same pool pre-warm as the overbooking race test above: without it,
    // connection-establishment latency serializes these calls by accident,
    // passing even if the duplicate-RSVP handling were broken.
    await Promise.all(Array.from({ length: 10 }, () => db.execute(sql`select 1`)));

    const results = await Promise.all(
      Array.from({ length: 10 }, () => rsvpToEvent(db, raceEventId, "Quinn")),
    );

    const confirmed = results.filter((r) => r.status === "confirmed");
    const duplicate = results.filter((r) => r.status === "already_rsvped");
    assert.equal(confirmed.length, 1);
    assert.equal(duplicate.length, 9);

    const [row] = await db
      .select({ attendeeCount: count() })
      .from(schema.rsvps)
      .where(
        and(
          eq(schema.rsvps.eventId, raceEventId),
          eq(schema.rsvps.userPrincipal, "Quinn"),
        ),
      );
    assert.equal(row!.attendeeCount, 1);
  });

  test("never overbooks under concurrent RSVP attempts", async () => {
    const [raceEvent] = await db
      .insert(schema.events)
      .values({
        title: "One-Seat Draft",
        gameType: "Magic: The Gathering",
        location: "The Round Table Games",
        startsAt: new Date(now.getTime() + HOUR),
        capacity: 1,
        organizerPrincipal: "organizer@example.com",
      })
      .returning({ id: schema.events.id });
    const raceEventId = raceEvent!.id;

    const players = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

    // Open one pool connection per player before racing. Without this,
    // pool.connect()'s connection-establishment latency dominates and
    // the calls below end up serialized by accident — passing even if
    // the capacity check in rsvp.ts were broken — instead of genuinely
    // racing, which is the thing this test exists to catch.
    await Promise.all(players.map(() => db.execute(sql`select 1`)));

    const results = await Promise.all(
      players.map((name) => rsvpToEvent(db, raceEventId, name)),
    );

    const confirmed = results.filter((r) => r.status === "confirmed");
    const full = results.filter((r) => r.status === "event_full");
    assert.equal(confirmed.length, 1);
    assert.equal(full.length, players.length - 1);
  });
});

suite("cancelRsvp", () => {
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
        startsAt: new Date(now.getTime() + HOUR),
        capacity: 1,
        organizerPrincipal: "organizer@example.com",
      })
      .returning({ id: schema.events.id });
    eventId = event!.id;

    await db
      .insert(schema.rsvps)
      .values({ eventId, userPrincipal: "Sam" });
  });

  after(() => cleanup());

  test("cancels an existing RSVP", async () => {
    const result = await cancelRsvp(db, eventId, "Sam");
    assert.deepEqual(result, { status: "cancelled" });
    assert.equal(await hasRsvped(db, eventId, "Sam"), false);
  });

  test("frees the seat for someone else once cancelled", async () => {
    const rsvpResult = await rsvpToEvent(db, eventId, "Priya");
    assert.deepEqual(rsvpResult, { status: "confirmed" });
  });

  test("reports not_found for a principal with no RSVP", async () => {
    const result = await cancelRsvp(db, eventId, "Nobody");
    assert.deepEqual(result, { status: "not_found" });
  });
});

suite("hasRsvped", () => {
  let db: Awaited<ReturnType<typeof createTestDb>>["db"];
  let cleanup: () => Promise<void>;
  let eventId: number;

  before(async () => {
    ({ db, cleanup } = await createTestDb());

    const [event] = await db
      .insert(schema.events)
      .values({
        title: "Catan Night",
        gameType: "Catan",
        location: "Board & Brew Café",
        startsAt: new Date(now.getTime() + HOUR),
        capacity: 4,
        organizerPrincipal: "organizer@example.com",
      })
      .returning({ id: schema.events.id });
    eventId = event!.id;

    await db
      .insert(schema.rsvps)
      .values({ eventId, userPrincipal: "Jordan" });
  });

  after(() => cleanup());

  test("is true for a principal who has RSVPed", async () => {
    assert.equal(await hasRsvped(db, eventId, "Jordan"), true);
  });

  test("is false for a principal who hasn't RSVPed", async () => {
    assert.equal(await hasRsvped(db, eventId, "Alex"), false);
  });
});
