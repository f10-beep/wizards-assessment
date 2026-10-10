# TODO

Local issue / task tracker for this repo. Keep entries short; link to code or
commits where useful. Move finished items to "Done" (or delete them) rather
than letting them pile up.

## Now

## Next

- [ ] P2+: RSVP / cancel flow (player), capacity-safe writes — the one
      piece of logic that needs deliberate concurrency test coverage,
      per ADR 0002 consequences
- [ ] Organizer story: post an event, see attendee list for own events
- [ ] Identity ("who am I" picker) — only needed once RSVPs are
      attributable to a visitor; `rsvps.playerName` is a free string today
- [ ] Swap MVP polling for real push (managed realtime provider or
      self-hosted WS + Redis pub/sub) once latency or load requires
      it — see ADR 0002 consequences
- [ ] Revisit Postgres/Neon connection pooling and read replicas if
      load requires it — see ADR 0002 consequences
- [ ] Revisit pinning TypeScript to 6.0.3 once `typescript-eslint`
      supports TS 7 (see README "Decisions made where the brief was
      silent")
- [ ] Decide on a deployment target (Vercel + Neon per ADR 0002) once
      ready to make this reachable by a stranger's browser, not just
      runnable locally

## Done

- [x] Establish development principles in `AGENTS.md`
- [x] Choose MVP stack (ADR 0002)
- [x] Scaffold Next.js/tRPC/Drizzle app
- [x] P1: Player browses upcoming events — search/filter by game type
      or text, sorted soonest-first, with live attendee counts
