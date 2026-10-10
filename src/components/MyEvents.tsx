"use client";

import Link from "next/link";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  getStoredUserPrincipal,
  USER_PRINCIPAL_STORAGE_KEY,
} from "@/lib/userPrincipal";
import { EventCard } from "./EventCard";

// Refetch periodically so attendee counts stay close to current while
// someone is viewing — see docs/decisions/0002-mvp-stack.md.
const POLL_INTERVAL_MS = 30_000;

export function MyEvents() {
  const [userPrincipal, setUserPrincipal] = useState(getStoredUserPrincipal);
  const trimmedPrincipal = userPrincipal.trim();

  const myEventsQuery = trpc.events.myEvents.useQuery(
    { userPrincipal: trimmedPrincipal },
    { enabled: trimmedPrincipal.length > 0, refetchInterval: POLL_INTERVAL_MS },
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link
        href="/"
        className="mb-4 inline-block text-sm text-slate-500 hover:text-slate-700"
      >
        ← Back to all events
      </Link>

      <header className="mb-4">
        <h1 className="text-xl font-bold text-slate-900">My events</h1>
        <p className="text-sm text-slate-500">
          Everything you&apos;ve RSVPed to, soonest first.
        </p>
      </header>

      <input
        type="text"
        placeholder="you@example.com"
        value={userPrincipal}
        onChange={(event) => {
          const principal = event.target.value;
          setUserPrincipal(principal);
          window.localStorage.setItem(USER_PRINCIPAL_STORAGE_KEY, principal);
        }}
        className="mb-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none sm:max-w-xs"
      />

      {trimmedPrincipal.length === 0 && (
        <p className="text-sm text-slate-500">
          Enter your user principal to see the events you&apos;ve RSVPed to.
        </p>
      )}

      {myEventsQuery.isLoading && (
        <p className="text-sm text-slate-500">Loading your events…</p>
      )}

      {myEventsQuery.isError && (
        <p className="text-sm text-rose-600">
          Couldn&apos;t load your events. Try refreshing.
        </p>
      )}

      {myEventsQuery.data && myEventsQuery.data.length === 0 && (
        <p className="text-sm text-slate-500">
          You haven&apos;t RSVPed to any events yet.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {myEventsQuery.data?.map((event) => (
          <li key={event.id}>
            <EventCard event={event} />
          </li>
        ))}
      </ul>
    </div>
  );
}
