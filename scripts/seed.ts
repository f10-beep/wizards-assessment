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
    organizerPrincipal: "store@roundtablegames.example.com",
    attendees: ["alex@example.com", "priya@example.com"],
  },
  {
    title: "Pokémon TCG League Night",
    gameType: "Pokémon TCG",
    location: "The Round Table Games, 123 Main St",
    startsAt: hoursFromNow(24),
    capacity: 10,
    organizerPrincipal: "store@roundtablegames.example.com",
    attendees: ["sam@example.com", "jordan@example.com", "casey@example.com"],
  },
  {
    title: "Friday Night Magic: Draft",
    gameType: "Magic: The Gathering",
    location: "The Round Table Games, 123 Main St",
    startsAt: hoursFromNow(48),
    capacity: 8,
    organizerPrincipal: "store@roundtablegames.example.com",
    attendees: [
      "alex@example.com",
      "morgan@example.com",
      "riley@example.com",
      "taylor@example.com",
      "priya@example.com",
    ],
  },
  {
    title: "One Seat Left: Commander Pod",
    gameType: "Magic: The Gathering",
    location: "The Round Table Games, 123 Main St",
    startsAt: hoursFromNow(60),
    capacity: 4,
    organizerPrincipal: "store@roundtablegames.example.com",
    attendees: ["sam@example.com", "jordan@example.com", "casey@example.com"], // capacity - 1, for testing the avail-to-full transition
  },
  {
    title: "Beginner D&D One-Shot",
    gameType: "Dungeons & Dragons",
    location: "Spellbound Hobbies, 45 Oak Ave",
    startsAt: hoursFromNow(72),
    capacity: 6,
    organizerPrincipal: "host@spellboundhobbies.example.com",
    attendees: ["jordan@example.com", "casey@example.com"],
  },
  {
    title: "Warhammer 40k Open Play",
    gameType: "Warhammer 40,000",
    location: "Battle Bunker, 900 Industrial Way",
    startsAt: hoursFromNow(96),
    capacity: 4,
    organizerPrincipal: "events@battlebunker.example.com",
    attendees: [
      "sam@example.com",
      "alex@example.com",
      "riley@example.com",
      "morgan@example.com",
    ], // full
  },
  {
    title: "Catan Tournament",
    gameType: "Catan",
    location: "Board & Brew Café, 12 Elm St",
    startsAt: hoursFromNow(120),
    capacity: 12,
    organizerPrincipal: "events@boardandbrew.example.com",
    attendees: [
      "taylor@example.com",
      "priya@example.com",
      "casey@example.com",
      "jordan@example.com",
    ],
  },
  {
    title: "Settlers & Strategy Meetup",
    gameType: "Catan",
    location: "Board & Brew Café, 12 Elm St",
    startsAt: hoursFromNow(168),
    capacity: 10,
    organizerPrincipal: "events@boardandbrew.example.com",
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
        organizerPrincipal: sample.organizerPrincipal,
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
