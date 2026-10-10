"use client";

import Link from "next/link";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { EventCard } from "./EventCard";

// Refetch periodically so attendee counts / fullness stay close to current
// while someone is browsing (MVP polling — see docs/decisions/0002-mvp-stack.md).
const POLL_INTERVAL_MS = 30_000;

export function EventBrowser() {
  const [search, setSearch] = useState("");
  const [gameType, setGameType] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const gameTypesQuery = trpc.events.gameTypes.useQuery();
  const eventsQuery = trpc.events.list.useQuery(
    {
      search: debouncedSearch || undefined,
      gameType: gameType || undefined,
    },
    { refetchInterval: POLL_INTERVAL_MS },
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Game Night</h1>
          <p className="text-sm text-slate-500">
            Upcoming tabletop events near you.
          </p>
        </div>
        <Link
          href="/my-events"
          className="shrink-0 text-sm text-slate-500 underline hover:text-slate-700"
        >
          My events
        </Link>
      </header>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          inputMode="search"
          placeholder="Search by title or location"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
        />
        <select
          value={gameType}
          onChange={(event) => setGameType(event.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none sm:w-48"
        >
          <option value="">All game types</option>
          {gameTypesQuery.data?.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {eventsQuery.isLoading && (
        <p className="text-sm text-slate-500">Loading events…</p>
      )}

      {eventsQuery.isError && (
        <p className="text-sm text-rose-600">
          Couldn&apos;t load events. Try refreshing.
        </p>
      )}

      {eventsQuery.data && eventsQuery.data.length === 0 && (
        <p className="text-sm text-slate-500">
          No upcoming events match your search.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {eventsQuery.data?.map((event) => (
          <li key={event.id}>
            <EventCard event={event} />
          </li>
        ))}
      </ul>
    </div>
  );
}
