"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

// Refetch periodically so seats-left stays close to current while someone
// is viewing (MVP polling — see docs/decisions/0002-mvp-stack.md).
const POLL_INTERVAL_MS = 30_000;

export function EventDetails({ eventId }: { eventId: number }) {
  const eventQuery = trpc.events.byId.useQuery(
    { id: eventId },
    { refetchInterval: POLL_INTERVAL_MS },
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link
        href="/"
        className="mb-4 inline-block text-sm text-slate-500 hover:text-slate-700"
      >
        ← Back to all events
      </Link>

      {eventQuery.isLoading && (
        <p className="text-sm text-slate-500">Loading event…</p>
      )}

      {eventQuery.error?.data?.code === "NOT_FOUND" && (
        <p className="text-sm text-slate-500">
          This event doesn&apos;t exist, or may have been removed.
        </p>
      )}

      {eventQuery.error && eventQuery.error.data?.code !== "NOT_FOUND" && (
        <p className="text-sm text-rose-600">
          Couldn&apos;t load this event. Try refreshing.
        </p>
      )}

      {eventQuery.data && (
        <EventDetailsCard event={eventQuery.data} />
      )}
    </div>
  );
}

type EventDetailData = {
  id: number;
  title: string;
  gameType: string;
  location: string;
  startsAt: string;
  capacity: number;
  attendeeCount: number;
};

function EventDetailsCard({ event }: { event: EventDetailData }) {
  const spotsLeft = Math.max(0, event.capacity - event.attendeeCount);
  const isFull = spotsLeft <= 0;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{event.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{event.gameType}</p>
        </div>
        {isFull && (
          <span className="shrink-0 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">
            Full
          </span>
        )}
      </div>

      <dl className="mt-4 space-y-2 text-sm text-slate-600">
        <div className="flex gap-1.5">
          <dt className="font-medium text-slate-700">When</dt>
          <dd>{dateFormatter.format(new Date(event.startsAt))}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="font-medium text-slate-700">Where</dt>
          <dd>{event.location}</dd>
        </div>
      </dl>

      <div className="mt-4">
        <div className="flex justify-between text-sm text-slate-600">
          <span>
            {event.attendeeCount} / {event.capacity} spots filled
          </span>
          <span className={isFull ? "text-rose-600" : "text-emerald-600"}>
            {isFull ? "No seats left" : `${spotsLeft} seats left`}
          </span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${isFull ? "bg-rose-500" : "bg-emerald-500"}`}
            style={{
              width: `${Math.min(100, (event.attendeeCount / event.capacity) * 100)}%`,
            }}
          />
        </div>
      </div>
    </article>
  );
}
