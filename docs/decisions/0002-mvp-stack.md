# 0002: MVP stack — Next.js on Vercel, Postgres, polling-first updates

- **Status:** Accepted; the database-driver portion is superseded by
  [0003](./0003-neon-pooled-transactional-driver.md)
- **Date:** 2026-10-09

## Context

Game Night is a community event board: organizers post tabletop-game
events with a fixed seating capacity; players discover events and
RSVP. The core correctness requirement is that a full event can never
be over-booked — RSVPs are first-come-first-served against a hard
capacity limit, so writes need an atomic, race-safe check against
current attendee count. The data is relational (organizers, events,
players, RSVPs) with no graphics/engine requirement on the client.

Players need to see how full an event is without a hard real-time
requirement — "fast enough to not look stale" (e.g. refresh on
navigation or a short interval) is enough for a commute-time, one-tap
RSVP flow; there's no sub-second multi-user live-state requirement.
Scale is a metro area's worth of stores, organizers, and players —
modest enough that no infra needs to be pre-built for load that
doesn't exist yet.

The user is comfortable with T3-ish stacks on AWS, and is open to
Vercel specifically if it's a simplicity win over running the
equivalent on AWS — which it is for this shape of app, per the
discussion below.

## Decision

- **Frontend:** Next.js (App Router, TypeScript), hosted on Vercel.
- **API:** tRPC for type-safe client/server calls.
- **Database:** Postgres (Neon) with Drizzle as the query layer.
  Capacity-safe RSVPs are enforced at the database layer (a single
  atomic statement/transaction that only succeeds if capacity isn't
  exceeded), not an app-level read-then-write check, which would race
  under concurrent RSVPs.
- **Freshness (MVP):** Client polls/refetches on an interval and on
  relevant navigation/actions. Polling sits behind a transport-agnostic
  interface on the client so it can be swapped for real push later
  without touching the RSVP/event logic itself.
- **Hosting:** Vercel for the app, Neon for the database. No
  self-managed compute (EC2/ECS/Fargate) for the MVP.

## Alternatives considered

- **AWS (ECS/Fargate + ALB + RDS), self-managed.** Matches the user's
  existing familiarity and gives full infra control, but means standing
  up and operating container orchestration, load balancing, and
  autoscaling before there's any load to justify it. Conflicts with
  AGENTS.md's priority ordering (simplicity, no premature
  optimization) for an MVP. Nothing in this decision forecloses moving
  compute to AWS later if a concrete need (cost, compliance, control)
  shows up.
- **Real-time push now** (WebSockets or a managed realtime provider
  like Ably/Pusher) so seat counts update live across open clients.
  Would be a nicer experience, but the brief doesn't require
  live-updating counts across simultaneous viewers, and:
  - A self-hosted WS server adds operational surface (connection
    scaling, reconnect/backoff) that Vercel's serverless model doesn't
    give you for free.
  - A managed provider avoids the ops burden but adds a paid dependency
    and integration work before there's a demonstrated need.
  - Declined for the MVP; revisit if a future story calls for live
    multi-viewer updates (see Consequences).
- **Plain Vite + React SPA** instead of Next.js. Would work, but Next.js
  on Vercel gives API routes, deployment, and preview environments as
  one coherent unit with less glue, and matches the user's T3
  familiarity.
- **DynamoDB or a document store** instead of Postgres. Declined: the
  domain (organizers, events, players, RSVPs, capacity) is relational,
  and the capacity-safety requirement needs atomic, constraint-backed
  writes that a relational database with transactions gives for free.
  Postgres on Neon is comfortably sized for metro-area volumes.

## Consequences

- RSVP writes must go through a single atomic operation (e.g. a
  conditional update or a transaction with a capacity check) rather
  than separate read-then-write steps, to guarantee no over-booking
  under concurrent requests. This is the one piece of business logic
  that needs deliberate test coverage for concurrent-RSVP behavior.
- Vercel's serverless functions cannot hold long-lived WebSocket
  connections. If a later story needs live multi-viewer updates, the
  realistic options are (a) a managed realtime provider (Ably/Pusher)
  for fan-out, or (b) a small dedicated long-running WS service behind
  Redis pub/sub. That choice is deferred until a story actually needs
  it — tracked in `TODO.md`.
- Because polling sits behind a client-side interface, swapping it for
  push later should be isolated to that interface and one server-side
  notification path, not a rewrite of event/RSVP logic.
- Postgres/Neon scaling (connection pooling, read replicas) is not
  built now; it's a known lever to pull if/when load requires it —
  tracked in `TODO.md`.
