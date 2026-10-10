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
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    // Identity is a simple name string for the MVP (no accounts) — see
    // AGENTS.md ambiguity note in README. Revisit if a real identity
    // system lands later.
    playerName: text("player_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique().on(table.eventId, table.playerName)],
);
