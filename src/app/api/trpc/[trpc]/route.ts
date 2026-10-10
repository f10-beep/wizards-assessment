import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/trpc/routers/_app";

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => ({}),
    // tRPC formats every thrown error into a generic client-safe response
    // itself — nothing else logs the original error, so without this it's
    // gone the moment the response is sent. Only INTERNAL_SERVER_ERROR is
    // actually unexpected: every other code is a router throwing a
    // deliberate, client-facing TRPCError for an ordinary business outcome
    // (e.g. attendees' NOT_FOUND for "not your event," rsvp's CONFLICT for
    // "already RSVPed") — logging those at error level would just be
    // noise, not a signal something's broken. `error.cause` carries the
    // real underlying error (e.g. Drizzle wraps the Postgres error there)
    // for the INTERNAL_SERVER_ERROR case.
    onError: ({ error, path }) => {
      if (error.code !== "INTERNAL_SERVER_ERROR") return;
      console.error(`[trpc] ${path ?? "<unknown path>"} failed:`, error);
      if (error.cause) console.error("Caused by:", error.cause);
    },
  });
}

export { handler as GET, handler as POST };
