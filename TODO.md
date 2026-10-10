# TODO

Local issue / task tracker for this repo. Keep entries short; link to code or
commits where useful. Move finished items to "Done" (or delete them) rather
than letting them pile up.

## Now

## Next

- [ ] Scaffold Next.js/tRPC/Drizzle app per ADR 0002
- [ ] Swap MVP polling for real push (managed realtime provider or
      self-hosted WS + Redis pub/sub) once latency or load requires
      it — see ADR 0002 consequences
- [ ] Revisit Postgres/Neon connection pooling and read replicas if
      load requires it — see ADR 0002 consequences

## Done

- [x] Establish development principles in `AGENTS.md`
- [x] Choose MVP stack (ADR 0002)
