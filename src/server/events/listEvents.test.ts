import assert from "node:assert/strict";
import { before, suite, test } from "node:test";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "../db/schema";
import { getEventById, listGameTypes, listUpcomingEvents } from "./listEvents";

const HOUR = 60 * 60 * 1000;
const now = new Date("2026-06-01T12:00:00Z");

async function createTestDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  return db;
}

suite("listUpcomingEvents", () => {
  let db: Awaited<ReturnType<typeof createTestDb>>;

  before(async () => {
    db = await createTestDb();

    const seeded = await db
      .insert(schema.events)
      .values([
        {
          title: "Past Draft Night",
          gameType: "Magic: The Gathering",
          location: "Old Store",
          startsAt: new Date(now.getTime() - HOUR),
          capacity: 8,
        },
        {
          title: "Friday Night Magic",
          gameType: "Magic: The Gathering",
          location: "The Round Table Games",
          startsAt: new Date(now.getTime() + 2 * HOUR),
          capacity: 4,
        },
        {
          title: "Beginner D&D One-Shot",
          gameType: "Dungeons & Dragons",
          location: "Spellbound Hobbies",
          startsAt: new Date(now.getTime() + HOUR),
          capacity: 6,
        },
        {
          title: "Catan Night",
          gameType: "Catan",
          location: "Board & Brew Café",
          startsAt: new Date(now.getTime() + 3 * HOUR),
          capacity: 2,
        },
      ])
      .returning({ id: schema.events.id, title: schema.events.title });

    const byTitle = Object.fromEntries(seeded.map((e) => [e.title, e.id]));

    await db.insert(schema.rsvps).values([
      { eventId: byTitle["Friday Night Magic"]!, playerName: "Alex" },
      { eventId: byTitle["Friday Night Magic"]!, playerName: "Priya" },
      { eventId: byTitle["Catan Night"]!, playerName: "Sam" },
      { eventId: byTitle["Catan Night"]!, playerName: "Jordan" }, // fills capacity 2
    ]);
  });

  test("excludes events that already started", async () => {
    const results = await listUpcomingEvents(db, {}, now);
    assert.ok(!results.some((e) => e.title === "Past Draft Night"));
  });

  test("sorts soonest first", async () => {
    const results = await listUpcomingEvents(db, {}, now);
    assert.deepEqual(
      results.map((e) => e.title),
      ["Beginner D&D One-Shot", "Friday Night Magic", "Catan Night"],
    );
  });

  test("computes attendeeCount from rsvps, including a full event", async () => {
    const results = await listUpcomingEvents(db, {}, now);
    const catan = results.find((e) => e.title === "Catan Night");
    assert.equal(catan?.attendeeCount, 2);
    assert.equal(catan?.capacity, 2);

    const dnd = results.find((e) => e.title === "Beginner D&D One-Shot");
    assert.equal(dnd?.attendeeCount, 0);
  });

  test("filters by exact game type", async () => {
    const results = await listUpcomingEvents(db, { gameType: "Catan" }, now);
    assert.deepEqual(results.map((e) => e.title), ["Catan Night"]);
  });

  test("filters by case-insensitive text search across title and location", async () => {
    const byTitle = await listUpcomingEvents(db, { search: "magic" }, now);
    assert.deepEqual(byTitle.map((e) => e.title), ["Friday Night Magic"]);

    const byLocation = await listUpcomingEvents(
      db,
      { search: "spellbound" },
      now,
    );
    assert.deepEqual(byLocation.map((e) => e.title), ["Beginner D&D One-Shot"]);
  });

  test("treats % and _ in search text literally, not as SQL wildcards", async () => {
    const results = await listUpcomingEvents(db, { search: "%" }, now);
    assert.deepEqual(results, []);
  });

  test("combines game type and search filters", async () => {
    const results = await listUpcomingEvents(
      db,
      { gameType: "Magic: The Gathering", search: "friday" },
      now,
    );
    assert.deepEqual(results.map((e) => e.title), ["Friday Night Magic"]);
  });

  test("lists distinct game types in use", async () => {
    const gameTypes = await listGameTypes(db);
    assert.deepEqual(gameTypes, [
      "Catan",
      "Dungeons & Dragons",
      "Magic: The Gathering",
    ]);
  });
});

suite("getEventById", () => {
  let db: Awaited<ReturnType<typeof createTestDb>>;
  let eventId: number;
  let pastEventId: number;

  before(async () => {
    db = await createTestDb();

    const [event] = await db
      .insert(schema.events)
      .values({
        title: "Friday Night Magic",
        gameType: "Magic: The Gathering",
        location: "The Round Table Games",
        startsAt: new Date(now.getTime() + 2 * HOUR),
        capacity: 2,
      })
      .returning({ id: schema.events.id });
    eventId = event!.id;

    const [pastEvent] = await db
      .insert(schema.events)
      .values({
        title: "Past Draft Night",
        gameType: "Magic: The Gathering",
        location: "Old Store",
        startsAt: new Date(now.getTime() - HOUR),
        capacity: 8,
      })
      .returning({ id: schema.events.id });
    pastEventId = pastEvent!.id;

    await db.insert(schema.rsvps).values([
      { eventId, playerName: "Alex" },
      { eventId, playerName: "Priya" }, // fills capacity 2
    ]);
  });

  test("returns the event with its live attendee count", async () => {
    const result = await getEventById(db, eventId);
    assert.equal(result?.title, "Friday Night Magic");
    assert.equal(result?.attendeeCount, 2);
    assert.equal(result?.capacity, 2);
  });

  test("returns the event even if it has already started", async () => {
    const result = await getEventById(db, pastEventId);
    assert.equal(result?.title, "Past Draft Night");
  });

  test("returns undefined for a nonexistent id", async () => {
    const result = await getEventById(db, 999_999);
    assert.equal(result, undefined);
  });
});
