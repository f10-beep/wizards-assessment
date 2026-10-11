import assert from "node:assert/strict";
import { suite, test } from "node:test";
import type { AnyRouter } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./routers/_app";
import { publicProcedure, router } from "./init";

/**
 * Exercises the same fetchRequestHandler path production's route.ts uses
 * (not appRouter.createCaller, which skips errorFormatter entirely) so
 * this actually proves what a client receives over the wire.
 */
async function callOverHttp(
  routerUnderTest: AnyRouter,
  path: string,
  input: unknown,
  method: "GET" | "POST" = "POST",
) {
  const req =
    method === "GET"
      ? new Request(
          `http://localhost/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify(input))}`,
        )
      : new Request(`http://localhost/api/trpc/${path}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        });
  const res = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: routerUnderTest,
    createContext: () => ({}),
  });
  const body = (await res.json()) as {
    error: { message: string; data: { code: string } };
  };
  return body.error;
}

suite("errorFormatter", () => {
  test("reshapes a zod BAD_REQUEST into a single readable message, not the raw issue JSON", async () => {
    const error = await callOverHttp(appRouter, "events.create", {
      title: "Test",
      gameType: "Chess",
      location: "Somewhere",
      startsAt: new Date(Date.now() + 3_600_000).toISOString(),
      capacity: 1001,
      organizerPrincipal: "org@example.com",
      isOrganizer: true,
    });

    assert.equal(error.data.code, "BAD_REQUEST");
    assert.equal(error.message, "Too big: expected number to be <=1000");
    assert.doesNotMatch(error.message, /^\[/, "should not be a raw JSON array");
  });

  test("leaves a non-zod error (deliberate business-rule TRPCError) message untouched", async () => {
    const error = await callOverHttp(
      appRouter,
      "events.byId",
      { id: 999_999_999 },
      "GET",
    );

    assert.equal(error.data.code, "NOT_FOUND");
    assert.equal(error.message, "Event not found");
  });

  test("replaces an unhandled INTERNAL_SERVER_ERROR's message instead of leaking the underlying error", async () => {
    // A minimal router sharing this module's real `t`/errorFormatter, with
    // a procedure that throws a plain (non-TRPCError) Error — the shape
    // any unexpected failure (e.g. a raw DB driver error) takes before
    // tRPC wraps it as INTERNAL_SERVER_ERROR.
    const throwingRouter = router({
      explode: publicProcedure.query(() => {
        throw new Error("raw secret: connection string leaked here");
      }),
    });

    const error = await callOverHttp(throwingRouter, "explode", undefined, "GET");

    assert.equal(error.data.code, "INTERNAL_SERVER_ERROR");
    assert.equal(error.message, "Something went wrong. Try again.");
    assert.doesNotMatch(error.message, /raw secret/);
  });
});
