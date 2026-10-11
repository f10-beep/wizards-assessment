import Link from "next/link";
import { eventCapacityStatus } from "@/lib/capacity";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export type EventCardData = {
  id: number;
  title: string;
  gameType: string;
  location: string;
  startsAt: string;
  capacity: number;
  attendeeCount: number;
};

export function EventCard({ event }: { event: EventCardData }) {
  const { spotsLeft, isFull, fillPercent } = eventCapacityStatus(
    event.capacity,
    event.attendeeCount,
  );

  return (
    <Link
      href={`/events/${event.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold leading-snug text-slate-900">
            {event.title}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">{event.gameType}</p>
        </div>
        {isFull && (
          <span className="shrink-0 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">
            Full
          </span>
        )}
      </div>

      <dl className="mt-3 space-y-1 text-sm text-slate-600">
        <div className="flex gap-1.5">
          <dt className="sr-only">Date and time</dt>
          <dd>{dateFormatter.format(new Date(event.startsAt))}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="sr-only">Location</dt>
          <dd>{event.location}</dd>
        </div>
      </dl>

      <div className="mt-3">
        <div className="flex justify-between text-xs text-slate-500">
          <span>
            {event.attendeeCount} / {event.capacity} spots filled
          </span>
          {!isFull && <span>{spotsLeft} left</span>}
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${isFull ? "bg-rose-500" : "bg-emerald-500"}`}
            style={{ width: `${fillPercent}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
