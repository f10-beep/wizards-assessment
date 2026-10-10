# 0006: Authorize organizer actions by a checked role claim, plus ownership

- **Status:** Accepted
- **Date:** 2026-10-10

## Context

O1 ("as an organizer, I can create an event...") introduces a second role
alongside player. The brief is explicit that identity can stay simple —
"a 'who am I' name picker or similar is fine — no real authentication is
required" — but also that "the API must still be clear about which role
may do what." That second clause doesn't disappear just because
authentication is a stub; it has to be satisfiable with the identity
model this codebase already has (`userPrincipal`, an opaque,
self-asserted, client-remembered string — see ADR 0005), which has no
accounts, no signup, and nothing to check a role against.

An earlier draft of this decision argued the lack of an accounts system
meant a role check couldn't add a real guarantee, and settled for
ownership-based authorization alone: `events.organizerPrincipal` records
who posted an event, with the organizer/player boundary otherwise implied
only by endpoint naming, not checked. That reasoning conflated two
different things: whether a claim is *verified* (it isn't, for either
`userPrincipal` or a role, until real auth exists) and whether the claim
is *modeled and checked at all* (it should be, regardless). ADR 0005
already settled this for identity — stub the source, not the shape, of
what a real identity provider will eventually hand the app — and the
same logic applies to role. "No more secure than today" is true but
irrelevant: nothing about today's stub is secure, and that was never the
bar. The bar, from the brief, is that the API's contract is explicit and
*enforced* about which role may do what — which a naming convention
alone doesn't satisfy as literally as a checked claim does.

Separately: when a future story lets an organizer see the attendee list
for "their own events" (tracked in `TODO.md`), what stops anyone from
reading anyone else's event roster — plausibly real contact info, since
`userPrincipal` is email-shaped? That's an ownership question, distinct
from the role question above: role answers "may this actor call
organizer-facing procedures at all," ownership answers "which event is
this actor's."

## Decision

Two complementary mechanisms, both modeled the same stub-now/real-later
way `userPrincipal` already is:

**Role claim.** `src/server/auth/roles.ts` defines `Actor = { principal:
string; isOrganizer: boolean }` and `requireOrganizer(actor)`, which
throws a `FORBIDDEN` `TRPCError` if the claim is false — the one place
the organizer/player boundary is actually checked, not just implied.
Today, `isOrganizer` is populated directly from the tRPC input
(`events.create`'s `isOrganizer: z.boolean()` field), itself read from a
checkbox in the same `StubAuthBar` that already holds `userPrincipal`
(`src/lib/roles.ts`, `useStoredIsOrganizer`/`setStoredIsOrganizer`) — off
by default, since the brief optimizes for players and organizer is the
secondary, opt-in role. A caller has to explicitly claim the role, the
same way they have to explicitly claim a principal; it isn't re-derived
from "this request hit an organizer-only endpoint," which would make the
check circular. Player actions (`rsvp`, `cancelRsvp`, `myEvents`) stay
ungated — the brief only asks for role clarity on organizer actions, and
gating the primary, frictionless user flow would work against "optimize
for players."

**Ownership.** `events` gains an `organizerPrincipal` column (same
opaque-principal shape as `rsvps.userPrincipal`) recording who posted it.
Nothing enforces this yet — O1 has no reason to, since creating an event
doesn't expose anyone else's data — but it's what a future attendee-list
query will filter by (`organizerPrincipal = <caller>`), tracked in
`TODO.md`.

No pseudologin screen is added. Both the principal and the role claim
live in one place (`StubAuthBar`), not a per-form field and not a
dedicated login-like screen — the latter would imply a session/security
boundary that doesn't exist.

That one place is also the *only* place the app acknowledges a stub
mechanism exists at all. Everywhere else — `CreateEventForm`,
`EventDetails`, `MyEvents`, the "Post an event" nav link in
`EventBrowser` — treats whatever `Actor` it's given as authoritative and
final, the same way it would treat a verified session: it checks the
claim and renders a plain fact (`"You're not an organizer."`,
`"You're not signed in."`), never a hint, link, or instruction pointing
back at `StubAuthBar` — none of that code imports from or names it, even
in comments, which is also why it's named `StubAuthBar` rather than
something more neutral like `IdentityBar`: the name itself is a signal
that nothing should depend on it. The "Post an event" nav link itself
doesn't render at all for a non-organizer, rather than appearing
disabled — a real app wouldn't show organizer-only navigation to a
player, and wouldn't invite a player to go become one; role changes
(e.g. an admin granting organizer access) are rare, out-of-band events
this app has no business offering a self-service path to, even a
cosmetic one.

The design goal for both pieces: swapping the stub for real auth later
(a verified session, an OIDC token) only changes *where* `Actor` gets
constructed and how `organizerPrincipal` gets populated — inside the
tRPC routers, from `ctx.session.claims` or equivalent instead of raw
input — not `requireOrganizer`, its call sites, or the capacity-safe
RSVP transaction.

## Alternatives considered

- **Ownership-only, no checked role claim** (the earlier draft of this
  decision). Simpler, and defensible on "no accounts system" grounds —
  but that framing presented a deliberate choice as a constraint, and the
  resulting API wasn't actually "clear about which role may do what" in
  the brief's literal sense, only by convention. Declined once the real
  distinction (verified vs. modeled-and-checked) was made explicit.
- **A persisted `role` column on a new `users`/principals table**,
  checked server-side against stored state rather than a per-request
  claim. Closer to a "real" RBAC system, but requires inventing an
  accounts concept the brief explicitly says isn't needed yet, for a
  claim that's still just as unverified as a per-request one (nothing
  populates that table from a real login either). Declined as
  complexity without a corresponding guarantee — the per-request claim
  gets the same literal compliance more cheaply, and migrates to real
  auth the same way either way.
- **Model roles as a set (`Set<"player" | "organizer">`) rather than a
  single `isOrganizer` boolean**, anticipating more roles later. Nothing
  in the brief needs a second gated role — player is the implicit
  default, never checked — so a set would be generality with no current
  user, which the simplicity priority (`AGENTS.md`) argues against.
  Declined; revisit if/when a second role actually needs gating.
- **A dedicated "pseudologin" screen** (pick "Player" or "Organizer" up
  front, or a separate identity field per role). Would make the
  distinction visually prominent, but there's still no session behind
  it — same self-asserted claims, different UI ceremony. Declined in
  favor of one shared `StubAuthBar` holding both the principal and the
  role checkbox.
- **A shared "here's what to fix and where" notice component**, used by
  gated pages to point back at the identity bar (e.g. "Set who you are
  above to post an event"). Tried first, then declined: it still leaked
  the stub mechanism (that there's a bar, that it's self-service)
  outside the one place that should know about it, just with the
  wording softened. A page that's been denied should state the fact and
  stop, the same way it would in front of a real, rarely-changed role
  grant — not suggest a fix that only exists because this is a
  prototype.

## Consequences

`events.create` returns `FORBIDDEN` for a caller that hasn't claimed
`isOrganizer`, verified via `requireOrganizer` (unit-tested in
`src/server/auth/roles.test.ts`). `events.organizerPrincipal` exists but
is only enforced once the attendee-list story reads it. The eventual real
auth migration (ADR 0005, `TODO.md`) extends to role the same way it
already does to principal: swap the population mechanism, keep
`requireOrganizer`'s call sites and the ownership column's meaning
unchanged.
