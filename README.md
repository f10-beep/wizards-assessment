# Game Night

A community event board for tabletop-game players: organizers post events
with a fixed seating capacity, players browse and RSVP first-come,
first-served.

Live: https://wizards-assessment.vercel.app/

Development conventions live in [`AGENTS.md`](./AGENTS.md); non-obvious or
costly-to-reverse decisions and their alternatives live in
[`docs/decisions/`](./docs/decisions/README.md); current status and
upcoming work live in [`TODO.md`](./TODO.md). This file is the onboarding
map — what's here and how to run it — not a duplicate of either.

## Stack

Next.js (App Router, TypeScript) + tRPC + Drizzle + Postgres, per
[ADR 0002](./docs/decisions/0002-mvp-stack.md). Tailwind for styling.

## Local development

### Prerequisites

- Node.js
- [Docker Engine](https://docs.docker.com/engine/install/) with the Compose
  plugin (`docker compose version` should work)

### Setup

Local dev and tests run against Postgres in Docker
([ADR 0004](./docs/decisions/0004-docker-postgres-local-dev.md)). Set
`DATABASE_URL` to a Neon connection string instead to run against real
production-like infra (see `.env.example`).

```bash
cp .env.example .env && npm install && npm run setup
npm run dev    # http://localhost:3000
```

See `package.json` for the full script list (`db:*`, `test`, `typecheck`,
`lint`, `build`).

## Deploying

Target is Vercel (app) + Neon (Postgres), per
[ADR 0002](./docs/decisions/0002-mvp-stack.md). No `vercel.json` or CI
pipeline — Vercel's own git integration is the whole pipeline; a
separate GitHub Actions workflow would just duplicate it for a
single-app MVP. Pages fetch through tRPC at request time rather
than querying the database at build time, so `DATABASE_URL` only needs
to exist at runtime, not during the Vercel build.

1. Create a Neon project and copy its **pooled** connection string (the
   one with `-pooler` in the hostname — required, see
   [ADR 0003](./docs/decisions/0003-neon-pooled-transactional-driver.md)).
2. In Vercel, import this GitHub repo as a project and set
   `DATABASE_URL` to that string in the project's environment variables.
3. Apply migrations and seed data against Neon once, from a local
   checkout, before or right after the first deploy:
   ```bash
   DATABASE_URL=<neon pooled connection string> npm run db:migrate
   DATABASE_URL=<neon pooled connection string> npm run db:seed   # optional
   ```
   Deliberately a manual, one-off step rather than a build hook —
   running migrations automatically on every build would let concurrent
   preview deployments race each other against the same database.
4. Push to `main`; Vercel builds and deploys automatically.

## Project layout

```
src/app/            Routes and UI (App Router). Client components under
                     src/components/ do the actual data fetching/rendering.
src/server/trpc/     The API surface — thin: input validation + wiring to
                     src/server/<domain>/, nothing else.
src/server/<domain>/ Query/mutation logic per domain (e.g. events/), kept
                     independent of tRPC so it's directly unit-testable.
src/server/db/       Drizzle schema, migration runner, and the dev/prod
                     driver switch (local Postgres vs. Neon).
drizzle/             Generated SQL migrations — don't hand-edit.
scripts/             One-off/dev scripts (currently just db:seed).
```

Code is meant to be self-documenting; look there for current behavior
rather than here.

## Before real traffic

What's stubbed/simplified, and what I'd harden first:

- **Auth**: `StubAuthBar` self-asserted identity/role, no real sessions
  — see `TODO.md`/ADR 0005/0006 for the migration path
- **Deployment**: live at https://wizards-assessment.vercel.app/ (Vercel +
  Neon, per ADR 0002). No staging environment, no rollback automation
  beyond Vercel's own deployment history
- **Persistence**: single local Postgres container, no backups
- **Observability**: `console.error` only, no logging/metrics/alerting
- **Abuse protection**: no rate limiting on any mutation
- **Scale**: MVP-sized (polling, live `COUNT`) — see "Scale: 12-month
  path" below for the levers

## Scale: 12-month path

Built for ~2k players/~50 events; designed to reach ~200k/~5k (50:1
read-heavy, 10× event-day spikes) without a rewrite. Hot path is the
browse list's live counts. Levers already deferred in `TODO.md`, in the
order I'd pull them:

1. Polling → push, so read volume tracks actual changes instead of
   viewers × poll frequency (polling's already behind an interface, per
   [ADR 0002](./docs/decisions/0002-mvp-stack.md)).
2. Split reads onto Neon's HTTP driver/a read replica — writes already
   own the pooled connection ([ADR 0003](./docs/decisions/0003-neon-pooled-transactional-driver.md)).
3. Denormalize attendee counts into a maintained counter instead of a
   live `COUNT` per request.

## Notes

`npm audit` flags transitive, dev-tooling-only vulnerabilities (an old
`esbuild` inside `drizzle-kit`'s migration generator, an old `braces` inside
`eslint-config-next`'s glob matching). Neither ships in the production
bundle or runs against untrusted input; fixing either requires a breaking
downgrade of the parent tool, so left as-is for now.

TypeScript is pinned to 6.0.3, not the current 7.0.x line, because
`typescript-eslint` doesn't support TS 7's new API yet.

## How this was built

Built with Claude Code, one user story per session, each reviewed (diff
read, manually smoke-tested through the UI) before committing. Also
verified via `npm run typecheck`/`lint`/`build` and automated tests
(unit/integration against real Postgres, including concurrency tests for
S1/S2 under `src/server/events/rsvp.test.ts`).

## Time spent

Roughly 8-10 hours, across several sessions (one story per session — see
commit history):

- Stack scaffolding + ground rules (`AGENTS.md`, ADR 0002)
- Player stories (browse/filter, detail, RSVP, cancel, "my events") —
  bulk of the time, including the Neon driver swap (ADR 0003)
- Organizer stories (post event, attendee roster) + role modeling
  (ADR 0005/0006)
- System-constraint validation (S1-S4): concurrency tests, input
  hardening
- Local infra (Docker Postgres, test-schema isolation fix)

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
- **Identity is a remembered user principal, not an account.** No
  accounts system or real auth in the brief, so RSVPing/cancelling run
  against a self-asserted principal remembered client-side, deliberately
  modeled as a stub for a real identity provider. See
  [ADR 0005](./docs/decisions/0005-user-principal-identity.md) for the
  mechanics and migration path.
- **The organizer role is a claimed-and-checked boolean, not an
  accounts system.** Posting an event requires explicitly claiming the
  organizer role, enforced server-side — same stub trust model as
  identity itself. See
  [ADR 0006](./docs/decisions/0006-organizer-role-claim.md) for the
  mechanics.
- **The attendee roster lives on the event's own detail page, not a
  separate "my posted events" screen.** An organizer who created an
  event already lands there (e.g. right after posting it), and the
  roster query itself is scoped to `organizerPrincipal = <caller>`
  ([ADR 0006](./docs/decisions/0006-organizer-role-claim.md)), so it
  simply doesn't render for anyone else — no separate page, nav link, or
  error state needed for "not your event."
- **"My events" includes past events, not just upcoming ones.** The story
  says "everything I've RSVPed to," and unlike the browse list there's no
  "upcoming" qualifier — soonest-first is just the sort order, not a
  filter. Someone wanting a history of what they attended shouldn't have
  it disappear the moment it starts.
