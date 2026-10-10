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
    // gone the moment the response is sent. `error.cause` carries the real
    // underlying error (e.g. Drizzle wraps the Postgres error there) for
    // anything that isn't already a deliberate TRPCError.
    onError: ({ error, path }) => {
      console.error(`[trpc] ${path ?? "<unknown path>"} failed:`, error);
      if (error.cause) console.error("Caused by:", error.cause);
    },
  });
}

export { handler as GET, handler as POST };
