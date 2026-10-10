# 0005: Model identity as an opaque user principal, not a display name

- **Status:** Accepted
- **Date:** 2026-10-10

## Context

P3 introduced identity as `rsvps.playerName`: a free-text string a player
types into the RSVP form, remembered client-side (`localStorage`) so they
don't retype it on every visit. It works as a stand-in for a login, but
the naming and surrounding comments modeled it as "a player's name" —
something meant to be read, displayed, and typed casually — rather than
as an identifier a real identity system would eventually issue.

That distinction matters for how the rest of the codebase treats the
field. A "name" invites future code to parse it, split it into
first/last, deduplicate by fuzzy matching, or otherwise treat it as
freeform text. An identity *key* should be treated as opaque: read,
compared for equality, and passed through — never interpreted. As more
stories build on top of this field (P5's "my events" already queries by
it; an eventual organizer attendee list will too), the cost of the wrong
mental model compounds.

The brief has no accounts system, and building real authentication is
out of scope for this pass — the ask here is narrower: make the *shape*
of the stub match what a real identity provider would hand the app
later (an opaque, email-shaped principal string), so that swapping the
stub for real auth later is a change to *how the value is populated*,
not to what the value *means* throughout the rest of the code.

## Decision

Rename `rsvps.playerName` to `rsvps.userPrincipal` end-to-end — the DB
column (via a rename migration, `drizzle/0001_rename_player_name_to_user_principal.sql`,
preserving any existing rows rather than drop-and-recreate), the Drizzle
schema field, every function parameter and tRPC input field, and the
client-side storage key (`gameNight.userPrincipal`).

`userPrincipal` is treated as an opaque identifier everywhere above the
storage layer: never parsed, split, or assumed to be a human-readable
name. The one remaining manual-entry UI (the RSVP form's text input, and
the new "My events" page's identity field) is a thin stub for a future
login — it exists only so a tester can act as different principals
without building real auth.

**No format validation is added.** The field stays `z.string().trim().min(1).max(100)`,
same as before the rename — still free text, not required to look like
a real email address. "Email-shaped" describes the *intent* (what a real
principal will eventually look like), not a constraint enforced today.
Enforcing email shape now would reject whatever a tester types to
distinguish identities during manual testing, for no actual correctness
benefit — there's no real email system behind it to validate against
yet. Real validation belongs with real auth (see `TODO.md`).

## Alternatives considered

- **Keep `playerName`, just document that it's "really" an identifier.**
  Cheaper (no migration, no rename), but leaves the code's vocabulary
  actively misleading — every call site and comment would need to
  silently know the field means something narrower than its name
  suggests. A future agent or teammate reading `playerName` has no
  reason to *not* treat it as a display name. Declined: the whole point
  is for the code to read correctly without tribal knowledge.
- **Add email-format validation now (`z.string().email()`).** Would make
  the "email-shaped" intent real today, but blocks testers from typing
  arbitrary non-email strings to exercise the stub, and introduces
  validation logic for a format the app has no actual use for yet (it
  never sends email, never parses the address) — complexity without a
  corresponding need, which the priority order (`AGENTS.md`) argues
  against. Declined for now; revisit once there's a real identity
  provider to validate against.
- **Drop and recreate the column instead of a rename migration.** This
  is what `drizzle-kit generate`'s default heuristic picks when it can't
  tell a rename from a drop+add; doing that here would discard any
  locally-seeded RSVP data for no reason, when a true `RENAME COLUMN`
  (available because there's no production data to migrate yet, and the
  two names are provably the same field) preserves it for free. Declined
  — picked the rename path in the interactive generator explicitly.

## Consequences

Call sites and tests now use `userPrincipal` instead of `playerName`
throughout (`src/server/events/rsvp.ts`, `src/server/events/listEvents.ts`,
the `events` tRPC router, `EventDetails.tsx`, `MyEvents.tsx`,
`src/lib/userPrincipal.ts`). The `TODO.md` entry for a future real
identity provider was updated to describe swapping *how* `userPrincipal`
gets populated (a real session, instead of a manually-typed field) —
the storage shape and capacity-safe RSVP transaction don't need to
change.

This is a pure rename/remodel with no behavior change: validation,
uniqueness, and the RSVP/cancel/capacity logic are identical to before.
