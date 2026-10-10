# TODO

Local issue / task tracker for this repo. Keep entries short; link to code or
commits where useful. Move finished items to "Done" (or delete them) rather
than letting them pile up.

## Now

## Next

- [ ] Real identity provider (if/when required — likely once O2 needs
      real access control, not just an MVP demo): replace the
      manually-typed `userPrincipal`/`organizerPrincipal`/`isOrganizer`
      fields with a session established by actual login, and have
      mutations/queries build their `Actor` (`src/server/auth/roles.ts`)
      from that session instead of trusting client input. See ADR 0005
      and 0006 — the uniqueness constraint on `(eventId,
      userPrincipal)`, the `organizerPrincipal` ownership column,
      `requireOrganizer`'s call sites, and the capacity-safe transaction
      in `src/server/events/rsvp.ts` (`SELECT ... FOR UPDATE` + re-read
      count) are all identity-agnostic and shouldn't need to change,
      only how the principal/role values get populated.
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

- [x] O2: organizer sees the attendee list for events they created.
      `events.organizerPrincipal` (ADR 0006) is now enforced as
      ownership, not just recorded: `getEventWithAttendees`
      (`src/server/events/attendees.ts`) filters by
      `organizerPrincipal = <caller>` in the same query that looks up
      the event, so "doesn't exist" and "isn't yours" are
      indistinguishable (`NOT_FOUND` either way) and one organizer can
      never read another's roster. Surfaced inline on the event detail
      page (`EventDetails.tsx`'s `AttendeeRoster`) rather than a
      separate page — it only renders once the scoped query succeeds,
      so viewing an event you don't organize just shows nothing extra.
- [x] O1: organizer posts an event (title, game type, date/time,
      location, capacity). Gated by an explicit, checked organizer-role
      claim (`requireOrganizer`); ownership recorded via
      `organizerPrincipal`, checked the same way as `userPrincipal` —
      see ADR 0006.
- [x] Fixed per-test-suite Postgres-schema isolation (ADR 0004): the
      generated FK on `rsvps.event_id` was schema-qualified to
      `"public"."events"`, so every test schema's RSVP inserts actually
      checked against the real dev `events` table instead of that test
      schema's own — only "worked" by coincidence while both tables'
      identity sequences stayed in the same low range. Fixed via
      `drizzle/0002_fix_rsvp_event_fk_schema_qualification.sql`; see the
      comment on `rsvps.eventId` in `src/server/db/schema.ts`.
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
