# 0001: Development principles for agent-neutral contribution

- **Status:** Accepted
- **Date:** 2026-10-09

## Context

This repo will be worked on by multiple coding agents (Claude, possibly
Codex, possibly others) as well as the human owner. Different agents have
different defaults for things like error handling, test discipline, and
documentation habits. Without a shared, explicit contract, those defaults
would compound into inconsistency over time — one agent's idea of
"robust" isn't another's.

`AGENTS.md` needs to be read by an agent at the start of every session, so
it should state rules tersely. This ADR exists to hold the reasoning and
alternatives behind those rules, so `AGENTS.md` doesn't have to carry that
weight on every read.

## Decision

Adopt the following principles, encoded in [`AGENTS.md`](../../AGENTS.md):

1. **Priority order:** correctness > robustness > legibility > simplicity,
   all above premature optimization. "Robustness" is scoped to real
   failure modes at trust boundaries — defending against things that can't
   happen is complexity, not robustness.
2. **North star + MVP:** have a point of view on future scale, but only
   build the MVP now. The north star shapes interfaces/boundaries, not
   speculative abstraction, and lives as `TODO.md` entries rather than a
   separate document.
3. **Comments:** prefer self-documenting code. A comment earns its place
   only by explaining non-obvious current logic, anchoring a deliberate
   future plan (linking a `TODO.md` id), or memorializing a lesson
   learned. Never a log of trivial change history. No parallel
   documentation hierarchy for implementation details — `docs/decisions/`
   and `TODO.md` are the exception because they're append-only historical
   records, not trying to track the current state of the code.
4. **Error handling:** assert assumptions at trust boundaries; treat an
   internal invariant violation as a bug, not something to re-check
   everywhere. Let exceptions roll up to high-level handlers with an
   intentional strategy. Only catch to (a) recover with a specific,
   intentional strategy, or (b) add context before re-raising. Never
   swallow an exception, log-and-continue, or convert to a sentinel/error
   state and proceed.
5. **Testing:** proactive for complex logic identified during design,
   reactive (mandatory) for every bug fix. Coverage percentage is a
   signal, never a target.
6. **Dependencies:** prefer stdlib/existing dependencies; a new one has to
   earn its place against the simplicity priority.
7. **Ambiguous or irreversible decisions:** ask rather than guess. This
   matters more than usual because the repo is agent-neutral — don't
   assume another agent shares a default you'd rely on.
8. **Decision records:** non-obvious/costly-to-reverse decisions and the
   research behind them are memorialized in `docs/decisions/`, not left in
   chat history or an agent's local memory. Alternatives considered, and
   specifically why each was declined, are mandatory.
9. **Task tracking:** `TODO.md`, not an external tracker. Code comments
   reference a `TODO.md` entry by stable id rather than restating it.
10. **Commits:** atomic, referencing the relevant `TODO.md` item or ADR
    when one exists.

## Alternatives considered

- **No written principles, rely on each agent's default behavior** —
  declined: Claude and Codex (and future agents) don't share defaults on
  error handling, test discipline, or comment style; the inconsistency
  would compound across sessions and agents.
- **Agent-specific config files** (`CLAUDE.md` alongside a Codex
  equivalent) with the same content duplicated per agent — declined: two
  copies of the same rules drift the moment one is updated and the other
  isn't. A single agent-neutral file removes the duplication.
- **A single, fully-inlined `AGENTS.md`** with rationale and alternatives
  embedded directly (our first draft) — declined: it's read in full on
  every agent session, and the rationale doesn't change session to
  session. Centralizing the "why" here and keeping `AGENTS.md` to
  directives cuts the per-session read cost without losing the reasoning
  — it's just one lookup away instead of inline.
- **Enforcing these mechanically via lint/CI instead of a prose
  document** — not rejected, deferred: most of these (simplicity
  judgment, testing intention, comment quality) aren't mechanically
  checkable. Narrow slices (e.g. a dependency-addition CI gate) may be
  worth revisiting once a stack is chosen.

## Consequences

`AGENTS.md` stays short and directive. This ADR is the canonical
reference for the reasoning behind each rule — read it before proposing a
change to one of them. A future change to these principles should be its
own ADR that supersedes the relevant part of this one, per the
append-only convention in `docs/decisions/README.md`.
