# TODO

Local issue / task tracker for this repo. Keep entries short; link to code or
commits where useful. Move finished items to "Done" (or delete them) rather
than letting them pile up.

## Now

## Next

- [ ] Organizer story: post an event, see attendee list for own events
- [ ] Real identity provider (if/when required — likely once an organizer
      story needs real attendee management, not just an MVP demo):
      replace the manually-typed `userPrincipal` field with a session
      established by actual login, and have the RSVP mutation read the
      principal from that session instead of trusting client input. See
      ADR 0005 — `rsvps.userPrincipal` and the uniqueness constraint on
      `(eventId, userPrincipal)` are already shaped for this and
      shouldn't need to change, only how the value gets populated. The
      capacity-safe transaction in `src/server/events/rsvp.ts`
      (`SELECT ... FOR UPDATE` + re-read count) is identity-agnostic and
      doesn't need to change either.
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

- [x] Fixed two real bugs found smoke-testing "My events": (1) its input
      wrote straight into query input on every keystroke with no
      debounce (unlike the browse page's search box), firing a request
      per character; (2) a `useState` lazy initializer read
      `localStorage` directly, which returns `""` during SSR but the
      real stored value on the client's first (hydration) render —
      disagreeing with the server whenever a principal was already
      remembered, a hydration-mismatch error for any component
      branching rendered text on it. Fixed by moving the stored
      principal into `useSyncExternalStore` (React's mechanism for
      exactly this: an external store needing a different value during
      SSR vs. after hydration) in `src/lib/userPrincipal.ts`, shared by
      both `MyEvents.tsx` and `EventDetails.tsx`'s RSVP form (which had
      the same latent bug, just silent there).
- [x] P5: Player sees "My events" — everything they've RSVPed to (past and
      upcoming), soonest first. Entered via a remembered-principal field
      like the RSVP form, reusing the same `gameNight.userPrincipal`
      storage key (`src/lib/userPrincipal.ts`)
- [x] Reworked identity from a free-text `playerName` to an opaque
      `userPrincipal` (email-shaped, not validated as one) across the
      schema, API, and UI — a closer stand-in for what a real identity
      provider will eventually hand the app. See ADR 0005. No behavior
      change for P1-P4; this is a naming/modeling change only, no real
      auth or validation added.
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
