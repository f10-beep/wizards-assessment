"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

// error.data is only populated when the server actually produced a
// structured error response (TRPCError, Zod validation, etc.) — it's
// undefined when the request never got a response at all (the fetch
// itself rejected: offline, DNS failure, connection refused, timeout).
// Only that second case is worth retrying; a response that says "404" or
// "500, the table doesn't exist" will say the exact same thing again.
function isConnectionFailure(error: unknown): boolean {
  return error instanceof TRPCClientError && error.data == null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // React Query's default (retry 3x with exponential backoff
            // on every failure) is tuned for transient network blips —
            // applied unconditionally, it also retries deterministic
            // failures that will just fail the same way again, sitting
            // on a loading state for ~7s+ before finally surfacing an
            // error. Only retry what looks like a genuine connection
            // failure, and only a couple of times.
            retry: (failureCount, error) =>
              isConnectionFailure(error) && failureCount < 2,
          },
        },
      }),
  );
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [httpBatchLink({ url: "/api/trpc" })],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
