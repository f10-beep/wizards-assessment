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
      self-hosted WS + Redis pub/sub). Trigger is concurrent-viewer
      *load* (request volume scales with open tabs × poll frequency),
      not staleness tolerance — the accepted 30s staleness window
      (README "Assumptions where the brief was silent") doesn't by
      itself justify push. Before reaching for push, lengthening the
      poll interval is a cheaper lever that the staleness tolerance
      already permits. See ADR 0002 consequences.
- [ ] Revisit Postgres/Neon connection pooling and read replicas if
      load requires it — see ADR 0002 consequences
- [ ] Revisit pinning TypeScript to 6.0.3 once `typescript-eslint`
      supports TS 7 (see README "Decisions made where the brief was
      silent")
- [ ] Decide on a deployment target (Vercel + Neon per ADR 0002) once
      ready to make this reachable by a stranger's browser, not just
      runnable locally
- [ ] Set up frontend test infrastructure (component/hook tests, e.g.
      React Testing Library + jsdom) — there's currently none, so the
      attendee-roster-not-invalidating fix (`EventDetails.tsx`'s
      `RsvpForm`) shipped without a regression test, unlike the
      server-side fixes under "Done"

## Done

- [x] S4 validation: confirmed invalid input (bad capacity, past dates,
      unknown IDs) is rejected server-side with clear errors. Capacity
      bounds/types and `startsAt` format were already zod-enforced at
      the router boundary and past-start-time was already checked in
      `createEvent` (unit-tested in `createEvent.test.ts`); unknown IDs
      already returned `NOT_FOUND` (business layer covered in
      `listEvents.test.ts`/`rsvp.test.ts`/`attendees.test.ts`). Found and
      fixed one real gap while probing this: a zod rejection's
      `error.message` was the raw, JSON-stringified issue array (e.g.
      posting capacity 1001 produced `[{"origin":"number",...}]` as the
      message), not a clear error — and the UI (`CreateEventForm.tsx`)
      renders that message verbatim for `BAD_REQUEST`, with no client-side
      max on capacity to stop out-of-range values reaching the server in
      the first place. Fixed once at the boundary rather than per form:
      `src/server/trpc/init.ts` now has an `errorFormatter` that, for a
      `BAD_REQUEST` whose cause is a `ZodError`, replaces the message with
      the joined human-readable issue messages — covers every procedure's
      input, not just `create`. Regression test in
      `src/server/trpc/init.test.ts` exercises the real
      `fetchRequestHandler` path (not `appRouter.createCaller`, which
      skips `errorFormatter` entirely — caught this via a probe script
      that gave a false "still broken" result before testing over HTTP).
- [x] S3 validation: confirmed attendee counts shown in lists reflect
      reality. No code change needed — `attendeeCount` was already
      computed live from `rsvps` rows on every request (never a cached
      counter), and the browse list/event detail/"My events" pages
      already poll every 30s (ADR 0002). Documented the accepted
      staleness window explicitly in README's "Assumptions where the
      brief was silent" rather than leaving it implicit in the polling
      code.
- [x] S1 validation: confirmed an event never exceeds capacity under
      concurrent RSVPs, enforced server-side. Proof is
      `src/server/events/rsvp.test.ts`'s "never overbooks under
      concurrent RSVP attempts" — real Postgres, separate connections,
      10 players racing for 1 seat. Strengthened it after finding the
      original (5-player, no pool pre-warm) version would pass even
      with the `FOR UPDATE` lock removed from `rsvp.ts`: on a fast local
      loopback DB, `pool.connect()`'s connection-establishment latency
      incidentally serialized the "concurrent" calls before they ever
      raced, masking a broken capacity check. Pre-warming the pool
      (opening one connection per player before racing) forces genuine
      concurrency; verified the test now fails (9-10 confirmed instead
      of 1) with the lock removed and passes with it restored.
- [x] S2 validation: confirmed a player holds at most one active RSVP
      per event and a retried/double-submitted RSVP never creates a
      duplicate or double-counts. Proof is
      `src/server/events/rsvp.test.ts`'s "never double-counts a
      retried/double-submitted RSVP from the same principal" — same
      real-Postgres, pre-warmed-pool race technique as the S1 test, 10
      concurrent `rsvpToEvent` calls from the same principal to one
      event. Verified non-vacuous by temporarily removing the `FOR
      UPDATE` lock on the event row in `rsvp.ts`: the test fails (9-10
      confirmed instead of 1) without the lock and passes with it
      restored, confirming the row lock — not just the unique
      constraint on `(eventId, userPrincipal)` — is what makes
      concurrent double-submits safe.
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
