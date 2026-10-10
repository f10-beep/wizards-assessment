import { integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

export const events = pgTable("events", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  gameType: text("game_type").notNull(),
  location: text("location").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  capacity: integer("capacity").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const rsvps = pgTable(
  "rsvps",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    // drizzle-kit always schema-qualifies a generated FK target to
    // "public" even though this table declares no schema — fine for the
    // one real database, but it broke per-test-suite Postgres-schema
    // isolation (src/server/db/testDb.ts), since the FK ended up bound to
    // the real public.events instead of each test's own schema. Fixed in
    // drizzle/0002_fix_rsvp_event_fk_schema_qualification.sql by
    // re-adding the constraint unqualified. If schema.ts changes trigger
    // a fresh `drizzle-kit generate` touching this FK, re-check the
    // generated SQL doesn't reintroduce the "public" qualifier.
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    // Opaque identity key for the MVP (no real auth yet) — see
    // docs/decisions/0005-user-principal-identity.md. Everything above
    // this layer treats it as a read-only identifier (email-shaped, but
    // not validated as one), never parsed, split, or displayed as if it
    // were a display name.
    userPrincipal: text("user_principal").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique().on(table.eventId, table.userPrincipal)],
);
