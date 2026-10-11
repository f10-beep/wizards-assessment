// Shared refetch cadence for every list/detail query that polls for
// current attendee counts — see docs/decisions/0002-mvp-stack.md for the
// MVP-polling-over-push decision this implements.
export const POLL_INTERVAL_MS = 30_000;
