# TODO

Local issue / task tracker for this repo. Keep entries short; link to code or
commits where useful. Move finished items to "Done" (or delete them) rather
than letting them pile up.

## Now

## Next

- [ ] Organizer story: post an event, see attendee list for own events
- [ ] Authenticated registration (if/when required — likely once an
      organizer story needs real attendee management, not just an MVP
      demo): add a `users` table + nullable `rsvps.userId` FK, move the
      RSVP uniqueness constraint from `(eventId, playerName)` to
      `(eventId, userId)`, and have the RSVP mutation take the
      authenticated session's user id instead of a free-text name —
      `playerName` can stay as a display label. The capacity-safe
      transaction in `src/server/events/rsvp.ts` (`SELECT ... FOR UPDATE`
      + re-read count) is identity-agnostic and doesn't need to change.
- [ ] Reintroduce `drizzle-orm/neon-http` for the read-only
      browse/detail queries if metrics ever show the pooled driver's
      per-request connection overhead matters — deferred, not built
      speculatively now, per ADR 0003 alternatives
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
- [x] P2: Player opens an event to see its details and seats left
- [x] P3: Player RSVPs to an event with open seats; blocked with a clear
      message once it's full. Capacity-safe against concurrent RSVPs via
      a transaction (`SELECT ... FOR UPDATE` + re-read count + insert) —
      required switching Neon's driver, see ADR 0003
- [x] P4: Player cancels their RSVP, freeing the seat. Plain delete (no
      locking needed — a delete can't cause overbooking). The RSVP form
      now reads "already RSVPed?" from the server instead of local-only
      state, so "Cancel RSVP" shows correctly after a page reload too.
