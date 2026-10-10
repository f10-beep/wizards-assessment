import assert from "node:assert/strict";
import { after, before, suite, test } from "node:test";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { createTestDb } from "../db/testDb";
import { createEvent } from "./createEvent";

const HOUR = 60 * 60 * 1000;
const now = new Date("2026-06-01T12:00:00Z");

suite("createEvent", () => {
  let db: Awaited<ReturnType<typeof createTestDb>>["db"];
  let cleanup: () => Promise<void>;

  before(async () => {
    ({ db, cleanup } = await createTestDb());
  });

  after(() => cleanup());

  test("creates an event owned by the given organizer", async () => {
    const result = await createEvent(
      db,
      {
        title: "Friday Night Magic",
        gameType: "Magic: The Gathering",
        location: "The Round Table Games",
        startsAt: new Date(now.getTime() + HOUR),
        capacity: 8,
        organizerPrincipal: "store@example.com",
      },
      now,
    );

    assert.equal(result.status, "created");
    const [stored] = await db
      .select()
      .from(schema.events)
      .where(eq(schema.events.id, (result as { id: number }).id));
    assert.equal(stored!.organizerPrincipal, "store@example.com");
    assert.equal(stored!.title, "Friday Night Magic");
  });

  test("rejects an event that starts in the past", async () => {
    const result = await createEvent(
      db,
      {
        title: "Too Late Draft",
        gameType: "Magic: The Gathering",
        location: "The Round Table Games",
        startsAt: new Date(now.getTime() - HOUR),
        capacity: 8,
        organizerPrincipal: "store@example.com",
      },
      now,
    );

    assert.deepEqual(result, { status: "starts_in_past" });
  });
});
