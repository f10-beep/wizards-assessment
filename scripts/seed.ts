import { db } from "../src/server/db/index";
import { events, rsvps } from "../src/server/db/schema";

function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

const sampleEvents = [
  {
    title: "Last Week's Draft",
    gameType: "Magic: The Gathering",
    location: "The Round Table Games, 123 Main St",
    startsAt: hoursFromNow(-48), // in the past — should never show up as "upcoming"
    capacity: 8,
    attendees: ["Alex", "Priya"],
  },
  {
    title: "Pokémon TCG League Night",
    gameType: "Pokémon TCG",
    location: "The Round Table Games, 123 Main St",
    startsAt: hoursFromNow(24),
    capacity: 10,
    attendees: ["Sam", "Jordan", "Casey"],
  },
  {
    title: "Friday Night Magic: Draft",
    gameType: "Magic: The Gathering",
    location: "The Round Table Games, 123 Main St",
    startsAt: hoursFromNow(48),
    capacity: 8,
    attendees: ["Alex", "Morgan", "Riley", "Taylor", "Priya"],
  },
  {
    title: "Beginner D&D One-Shot",
    gameType: "Dungeons & Dragons",
    location: "Spellbound Hobbies, 45 Oak Ave",
    startsAt: hoursFromNow(72),
    capacity: 6,
    attendees: ["Jordan", "Casey"],
  },
  {
    title: "Warhammer 40k Open Play",
    gameType: "Warhammer 40,000",
    location: "Battle Bunker, 900 Industrial Way",
    startsAt: hoursFromNow(96),
    capacity: 4,
    attendees: ["Sam", "Alex", "Riley", "Morgan"], // full
  },
  {
    title: "Catan Tournament",
    gameType: "Catan",
    location: "Board & Brew Café, 12 Elm St",
    startsAt: hoursFromNow(120),
    capacity: 12,
    attendees: ["Taylor", "Priya", "Casey", "Jordan"],
  },
  {
    title: "Settlers & Strategy Meetup",
    gameType: "Catan",
    location: "Board & Brew Café, 12 Elm St",
    startsAt: hoursFromNow(168),
    capacity: 10,
    attendees: [],
  },
] as const;

async function main() {
  // Cascades to rsvps via the FK's onDelete, so this alone resets both tables.
  await db.delete(events);

  for (const sample of sampleEvents) {
    const insertedRows = await db
      .insert(events)
      .values({
        title: sample.title,
        gameType: sample.gameType,
        location: sample.location,
        startsAt: sample.startsAt,
        capacity: sample.capacity,
      })
      .returning();
    const inserted = insertedRows[0];
    if (!inserted) throw new Error(`insert of "${sample.title}" returned no rows`);

    if (sample.attendees.length > 0) {
      await db.insert(rsvps).values(
        sample.attendees.map((userPrincipal) => ({
          eventId: inserted.id,
          userPrincipal,
        })),
      );
    }
  }

  console.log(`Seeded ${sampleEvents.length} events.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
