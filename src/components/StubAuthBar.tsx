"use client";

import { setStoredIsOrganizer, useStoredIsOrganizer } from "@/lib/roles";
import { setStoredUserPrincipal, useStoredUserPrincipal } from "@/lib/userPrincipal";

/**
 * Prototype-only stand-in for real auth — no other component should
 * import from this file or know it exists. It's the one place the stub
 * identity and role claims (userPrincipal, isOrganizer — see ADR
 * 0005/0006) are editable; everywhere else reads them via the shared
 * hooks in src/lib/, unaware of how they got set.
 */
export function StubAuthBar() {
  const userPrincipal = useStoredUserPrincipal();
  const isOrganizer = useStoredIsOrganizer();

  return (
    <div
      id="identity"
      className="border-b border-slate-200 bg-slate-50 px-4 py-2"
    >
      <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-2 text-sm">
        <label htmlFor="identity-input" className="shrink-0 text-slate-500">
          Acting as
        </label>
        <input
          id="identity-input"
          type="text"
          placeholder="you@example.com"
          value={userPrincipal}
          onChange={(event) => setStoredUserPrincipal(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none sm:max-w-xs"
        />
        <label className="flex shrink-0 items-center gap-1.5 text-slate-500">
          <input
            type="checkbox"
            checked={isOrganizer}
            onChange={(event) => setStoredIsOrganizer(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Organizer
        </label>
        <span className="shrink-0 text-xs text-slate-400">
          no login yet — stand-in for who you are
        </span>
      </div>
    </div>
  );
}
