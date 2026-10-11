"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStoredIsOrganizer } from "@/lib/roles";
import { trpc } from "@/lib/trpc/client";
import { useStoredTrimmedUserPrincipal } from "@/lib/userPrincipal";
import { NotSignedInNotice } from "./NotSignedInNotice";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link
        href="/"
        className="mb-4 inline-block text-sm text-slate-500 hover:text-slate-700"
      >
        ← Back to all events
      </Link>
      {children}
    </div>
  );
}

export function CreateEventForm() {
  const router = useRouter();
  const trimmedOrganizer = useStoredTrimmedUserPrincipal();
  const isOrganizer = useStoredIsOrganizer();

  const [title, setTitle] = useState("");
  const [gameType, setGameType] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [capacity, setCapacity] = useState("8");

  const createMutation = trpc.events.create.useMutation({
    onSuccess: (result) => router.push(`/events/${result.id}`),
  });

  // Whatever identity/role we've been given is authoritative — nothing
  // here tries to fix it or point the user elsewhere.
  if (trimmedOrganizer.length === 0) {
    return (
      <Shell>
        <NotSignedInNotice />
      </Shell>
    );
  }

  if (!isOrganizer) {
    return (
      <Shell>
        <p className="mt-4 text-sm text-slate-500">You&apos;re not an organizer.</p>
      </Shell>
    );
  }

  // Number() (not parseInt, which stops at the first non-digit and would
  // silently read "1e3" as 1 instead of rejecting or expanding it) parses
  // the whole string or fails.
  const parsedCapacity = Number(capacity);
  const canSubmit =
    title.trim().length > 0 &&
    gameType.trim().length > 0 &&
    location.trim().length > 0 &&
    startsAt.length > 0 &&
    Number.isInteger(parsedCapacity) &&
    parsedCapacity > 0;

  return (
    <Shell>
      <h1 className="text-xl font-bold text-slate-900">Post a new event</h1>
      <p className="mt-1 text-sm text-slate-500">
        You&apos;ll be able to manage this event as its organizer.
      </p>

      <form
        onSubmit={(formEvent) => {
          formEvent.preventDefault();
          if (!canSubmit) return;
          createMutation.mutate({
            title: title.trim(),
            gameType: gameType.trim(),
            location: location.trim(),
            startsAt: new Date(startsAt).toISOString(),
            capacity: parsedCapacity,
            organizerPrincipal: trimmedOrganizer,
            isOrganizer,
          });
        }}
        className="mt-4 flex flex-col gap-3"
      >
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Title
          <input
            type="text"
            required
            placeholder="Friday Night Magic: Draft"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Game type
          <input
            type="text"
            required
            placeholder="Magic: The Gathering"
            value={gameType}
            onChange={(event) => setGameType(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Date & time
          <input
            type="datetime-local"
            required
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Location
          <input
            type="text"
            required
            placeholder="The Round Table Games, 123 Main St"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Capacity
          <input
            type="number"
            required
            min={1}
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
          />
        </label>

        <button
          type="submit"
          disabled={!canSubmit || createMutation.isPending}
          className="mt-1 shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {createMutation.isPending ? "Posting…" : "Post event"}
        </button>

        {createMutation.error && (
          <p className="text-sm text-rose-600">
            {createMutation.error.data?.code === "BAD_REQUEST" ||
            createMutation.error.data?.code === "FORBIDDEN"
              ? createMutation.error.message
              : "Couldn't post this event. Try again."}
          </p>
        )}
      </form>
    </Shell>
  );
}
