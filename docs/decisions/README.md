# Architecture Decision Records (ADRs)

This directory is the memorialized record of non-obvious or costly-to-reverse
decisions and the research behind them. It exists so decisions don't live
only in chat history, local agent memory, or one person's head — any human
or agent (Claude, Codex, etc.) should be able to read the repo and understand
why things are the way they are.

## When to write one

Write an ADR when a decision is **non-obvious or costly to reverse** — the
kind of thing a future agent or teammate might otherwise re-litigate, or
where "why not the obvious alternative" can't be derived just by reading the
code.

Don't write one for trivial or easily-reversed choices. That's noise, and
runs against the simplicity principle in [`AGENTS.md`](../../AGENTS.md).

## Rules

- **Append-only.** Once written, an ADR is not edited to reflect new
  thinking. If a decision is reversed or superseded, write a new ADR that
  says so and references the old one. The old one stays as-is — it's a
  historical record of what was known and decided at the time.
- **Numbered sequentially**, zero-padded, in filenames:
  `NNNN-short-title.md` (e.g. `0001-use-postgres-for-storage.md`).
- **Alternatives considered are mandatory.** An ADR without alternatives is
  just an announcement, not a record of reasoning. Say what else was on the
  table and why it was declined.

## Creating a new ADR

Copy [`0000-template.md`](./0000-template.md) to the next available number
and fill it in.
