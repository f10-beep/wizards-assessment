# Game Night

A community event board for tabletop-game players: organizers post events
with a fixed seating capacity, players browse and RSVP first-come,
first-served.

Development conventions live in [`AGENTS.md`](./AGENTS.md); non-obvious or
costly-to-reverse decisions and their alternatives live in
[`docs/decisions/`](./docs/decisions/README.md); current status and
upcoming work live in [`TODO.md`](./TODO.md). This file is the onboarding
map — what's here and how to run it — not a duplicate of either.

## Stack

Next.js (App Router, TypeScript) + tRPC + Drizzle + Postgres, per
[ADR 0002](./docs/decisions/0002-mvp-stack.md). Tailwind for styling.

## Local development

No Docker or local Postgres server required. With `DATABASE_URL` unset, the
app runs against [PGlite](https://pglite.dev) — real Postgres compiled to
WASM, embedded in-process — at `./.pglite/dev`. Set `DATABASE_URL` to a Neon
connection string to run against real Postgres instead (see `.env.example`).

```bash
npm install
npm run db:generate   # only needed after changing src/server/db/schema.ts
npm run db:migrate     # applies drizzle/*.sql to the local PGlite db
npm run db:seed        # sample events + RSVPs for the browse UI to show
npm run dev             # http://localhost:3000
```

Other scripts: `npm test` (unit/integration tests against an in-memory
PGlite instance), `npm run typecheck`, `npm run lint`, `npm run build`.

## Project layout

```
src/app/            Routes and UI (App Router). Client components under
                     src/components/ do the actual data fetching/rendering.
src/server/trpc/     The API surface — thin: input validation + wiring to
                     src/server/<domain>/, nothing else.
src/server/<domain>/ Query/mutation logic per domain (e.g. events/), kept
                     independent of tRPC so it's directly unit-testable.
src/server/db/       Drizzle schema, migration runner, and the dev/prod
                     driver switch (PGlite vs. Neon).
drizzle/             Generated SQL migrations — don't hand-edit.
scripts/             One-off/dev scripts (currently just db:seed).
```

Code is meant to be self-documenting; look there for current behavior
rather than here.

## Assumptions where the brief was silent

- **"Upcoming" means `startsAt` is in the future.** There's no event
  end-time field in the brief, so an event drops off the list the moment
  it starts rather than when it ends.
- **Text search matches title OR location**, case-insensitively, since the
  brief groups "game type or text" as the two filter axes and game type
  already has its own exact-match control.
- **Game types are free text, not a fixed enum.** The filter dropdown is
  populated from whatever distinct values organizers have actually used,
  so it never drifts from reality and doesn't need a maintained taxonomy.
- **An event's detail page shows it regardless of whether it's already
  started**, unlike the browse list's "upcoming" filter. A direct link to
  an event shouldn't 404 just because it's in progress.
- **Identity is a remembered name, not an account.** RSVPing asks for a
  name (remembered client-side for next time), not a login — there's no
  accounts system in the brief, and `rsvps.playerName` already existed as
  a plain string. A duplicate RSVP from the same name on the same event is
  rejected, and cancelling an RSVP uses the same remembered name as proof
  of "ownership" (no login to check against) — same trust model as RSVPing
  itself. See `TODO.md` for the migration path if authenticated
  registration becomes a requirement later.
- **Capacity-safe RSVPs required switching Neon's driver** (see
  [ADR 0003](./docs/decisions/0003-neon-pooled-transactional-driver.md)):
  the originally-wired `neon-http` driver has no transaction support, so
  it couldn't implement the race-safe capacity check ADR 0002 called for.
- **TypeScript is pinned to 6.0.3, not the current 7.0.x line**, because
  `typescript-eslint` doesn't support TS 7's new API yet.

## Notes

`npm audit` flags transitive, dev-tooling-only vulnerabilities (an old
`esbuild` inside `drizzle-kit`'s migration generator, an old `braces` inside
`eslint-config-next`'s glob matching). Neither ships in the production
bundle or runs against untrusted input; fixing either requires a breaking
downgrade of the parent tool, so left as-is for now.
