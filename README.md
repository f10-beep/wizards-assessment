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

### Prerequisites

- Node.js
- [Docker Engine](https://docs.docker.com/engine/install/) with the Compose
  plugin (`docker compose version` should work). Installing Docker itself
  needs `sudo`/admin rights on your machine; nothing after that does.

### Setup

Local dev and tests run against Postgres in Docker
([ADR 0004](./docs/decisions/0004-docker-postgres-local-dev.md)). Set
`DATABASE_URL` to a Neon connection string instead to run against real
production-like infra (see `.env.example`).

```bash
cp .env.example .env && npm install && npm run setup
npm run dev    # http://localhost:3000
```

`npm run setup` starts Postgres in Docker, waits for it to be healthy,
applies migrations, and seeds sample events/RSVPs so the browse UI has
something to show. It's `db:up && db:migrate && db:seed` under the hood —
run those individually if you need to re-seed or re-migrate without
restarting the container. `npm run db:generate` is separate and only
needed after changing `src/server/db/schema.ts`.

Other scripts: `npm test` (unit/integration tests against the same Docker
Postgres, each test file isolated in its own schema), `npm run typecheck`,
`npm run lint`, `npm run build`. `docker compose down` stops the database;
add `-v` to also drop its data volume.

## Deploying

Target is Vercel (app) + Neon (Postgres), per
[ADR 0002](./docs/decisions/0002-mvp-stack.md). No `vercel.json` or CI
pipeline — Vercel's own git integration (build + deploy on push) is the
whole pipeline; a separate GitHub Actions workflow would just duplicate
it for a single-app MVP. Pages fetch through tRPC at request time rather
than querying the database at build time, so `DATABASE_URL` only needs
to exist at runtime, not during the Vercel build.

1. Create a Neon project and copy its **pooled** connection string (the
   one with `-pooler` in the hostname — required, see
   [ADR 0003](./docs/decisions/0003-neon-pooled-transactional-driver.md)).
2. In Vercel, import this GitHub repo as a project (framework preset
   auto-detects Next.js; default build command is fine) and set
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

## How this was built

Built with Claude Code, one user story per session, each reviewed (diff
read, manually smoke-tested through the UI) before committing. Also
verified via `npm run typecheck`/`lint`/`build` and automated tests
(unit/integration against real Postgres, including concurrency tests for
S1/S2 under `src/server/events/rsvp.test.ts`).

## Before real traffic

What's stubbed/simplified, and what I'd harden first:

- **Auth**: `StubAuthBar` self-asserted identity/role, no real sessions
  — see `TODO.md`/ADR 0005/0006 for the migration path
- **Deployment**: not deployed; verified locally only. Target is
  Vercel + Neon (ADR 0002)
- **Persistence**: single local Postgres container, no backups
- **Observability**: `console.error` only, no logging/metrics/alerting
- **Abuse protection**: no rate limiting on any mutation
- **Scale**: MVP-sized (polling, live `COUNT`) — see "Scale: 12-month
  path" below for the levers

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
- **Identity is a remembered user principal, not an account.** RSVPing
  asks for a principal (an opaque, email-shaped identifier, remembered
  client-side for next time), not a login — there's no accounts system or
  real auth in the brief. It's deliberately modeled as a stub for a real
  identity provider rather than a free-text display name (`rsvps` stores
  it as `userPrincipal`, not `playerName`): nothing above the storage
  layer parses, splits, or treats it as a name — a thin manual-entry
  field stands in for login so the rest of the app can be built against
  the shape a real auth provider would eventually hand it. A duplicate
  RSVP from the same principal on the same event is rejected, and
  cancelling an RSVP uses the same remembered principal as proof of
  "ownership" (no login to check against) — same trust model as RSVPing
  itself. See [ADR 0005](./docs/decisions/0005-user-principal-identity.md)
  and `TODO.md` for the migration path to a real identity provider.
- **The organizer role is a claimed-and-checked boolean, not an accounts
  system.** The brief says identity can stay a simple "who am I" picker
  but the API must still be clear about which role may do what — so
  posting an event requires explicitly claiming the organizer role (an
  `isOrganizer` checkbox in the same `StubAuthBar` that holds the
  principal, off by default), checked server-side via `requireOrganizer`
  and rejected with `FORBIDDEN` if missing. It's unverified today, same
  as the principal itself, but modeled and enforced the same shape a
  real session/IdP claim would be later — not just implied by endpoint
  naming. `events.organizerPrincipal` is a separate, complementary
  concern (ownership of a specific event, for a planned attendee-list
  story to scope by), not a stand-in for the role check. See
  [ADR 0006](./docs/decisions/0006-organizer-role-claim.md).
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
- **Capacity-safe RSVPs required switching Neon's driver** (see
  [ADR 0003](./docs/decisions/0003-neon-pooled-transactional-driver.md)):
  the originally-wired `neon-http` driver has no transaction support, so
  it couldn't implement the race-safe capacity check ADR 0002 called for.
- **TypeScript is pinned to 6.0.3, not the current 7.0.x line**, because
  `typescript-eslint` doesn't support TS 7's new API yet.
- **Attendee counts tolerate modest staleness, not sub-second
  accuracy.** Every count shown (browse list, event detail, attendee
  roster) is computed live from the `rsvps` rows on each request —
  there's no cached/denormalized counter that could drift from
  reality. What's intentionally stale is a given browser tab between
  polls: the browse list, an event's detail page, and "My events" each
  refetch on a 30s interval ([ADR 0002](./docs/decisions/0002-mvp-stack.md)),
  so a seat taken by someone else can take up to 30s to show up for a
  viewer who already has the page open. Acceptable for a commute-time,
  one-tap RSVP flow; the RSVP write path itself re-checks capacity
  server-side regardless of what a client last polled, so staleness
  never causes an overbook.

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
