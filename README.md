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
cp .env.example .env    # DATABASE_URL already points at the local container
docker compose up -d    # starts Postgres (docker-compose.yml)
npm install
npm run db:generate      # only needed after changing src/server/db/schema.ts
npm run db:migrate        # applies drizzle/*.sql to the local Postgres db
npm run db:seed            # sample events + RSVPs for the browse UI to show
npm run dev                 # http://localhost:3000
```

Other scripts: `npm test` (unit/integration tests against the same Docker
Postgres, each test file isolated in its own schema), `npm run typecheck`,
`npm run lint`, `npm run build`. `docker compose down` stops the database;
add `-v` to also drop its data volume.

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

## Notes

`npm audit` flags transitive, dev-tooling-only vulnerabilities (an old
`esbuild` inside `drizzle-kit`'s migration generator, an old `braces` inside
`eslint-config-next`'s glob matching). Neither ships in the production
bundle or runs against untrusted input; fixing either requires a breaking
downgrade of the parent tool, so left as-is for now.
