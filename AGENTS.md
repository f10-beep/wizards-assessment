# AGENTS.md

Ground rules for any coding agent (Claude, Codex, or otherwise) working in
this repository. This file is intentionally agent-neutral — do not create
agent-specific equivalents (e.g. `CLAUDE.md`) that duplicate or drift from
it. If a tool requires its own config file, have it point back here rather
than restating these rules.

Rationale and alternatives for the rules below are in
[ADR 0001](./docs/decisions/0001-development-principles.md). Read it
before proposing a change to one of them.

## Stack

Not yet chosen. Revisit via a follow-up ADR once one is picked.

## Priorities

In order, when they're in tension: **correctness > robustness >
legibility > simplicity**, all above premature optimization.

"Robustness" means handling real failure modes at trust boundaries, not
defending against things that can't happen — that's complexity, not
robustness.

## Scalability: north star, MVP implementation

Have a point of view on where this is headed, but only build the MVP
needed now. The north star shapes interface/boundary decisions — don't
foreclose the obvious future direction — but never justifies building
abstractions or configurability nothing uses yet. Track deferred work as
`TODO.md` entries, not a separate document.

## Documentation

- Prefer self-documenting code over comments.
- A comment earns its place only by: explaining non-obvious current logic
  (invariants, constraints, why a simpler approach doesn't work),
  anchoring a deliberate future plan (reference the `TODO.md` id), or
  memorializing a lesson learned. Never a log of trivial change history —
  `git log`/`blame` already own that.
- No parallel documentation hierarchy for implementation details — it
  will drift from the code. Exception: `docs/decisions/` and `TODO.md`,
  which are append-only historical records, not trying to track the
  current state of the code.

## Error handling

- Assert assumptions at trust boundaries (external input, other services,
  anything outside this codebase's control), then write the happy path.
  An internal invariant being violated is a bug, not something to
  defensively re-check at every call site.
- "Assert" means a runtime check that raises/throws on violation — not
  necessarily a language's literal `assert` keyword if it can be stripped
  from production builds. Pin this down once a stack is chosen.
- Let exceptions roll up to high-level handlers with an intentional
  strategy. Only catch to (a) recover with a specific, intentional
  strategy, or (b) add context before re-raising.
- Never catch an exception just to suppress it, log-and-continue, or
  convert it to a sentinel/error value and proceed. Execution does not
  continue in an error state.

## Testing

Test with intention, not for coverage metrics.

- Proactively for complex logic (non-trivial branching, business rules,
  concurrency, edge cases) identified during design.
- Reactively, mandatorily, for every bug fix — the regression test lands
  with the fix.
- Coverage percentage is a signal to glance at, never a target.

## Dependencies

Prefer the standard library or an existing dependency. A new one has to
earn its place against the simplicity priority.

## Ambiguous or irreversible decisions

Stop and ask rather than guess. This matters more than usual here —
because the repo is agent-neutral, don't assume another agent shares a
default you'd otherwise rely on.

## Decision records

Non-obvious or costly-to-reverse decisions — and the research behind them
— are memorialized in [`docs/decisions/`](./docs/decisions/README.md), not
left in chat history or an agent's local memory. Alternatives considered,
and specifically why each was declined, are mandatory. Trivial or
easily-reversed choices don't need one.

## Task tracking

Work items, bugs, and todos live in [`TODO.md`](./TODO.md), not an
external issue tracker, unless stated otherwise. A TODO comment in code
references the `TODO.md` entry by stable id (e.g. `TODO(TODO-003)`)
rather than restating it, so the two can't drift apart.

## Commits

Keep commits atomic. Reference the relevant `TODO.md` item or ADR in the
commit message when one exists.
