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
