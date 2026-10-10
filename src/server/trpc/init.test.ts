import assert from "node:assert/strict";
import { suite, test } from "node:test";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./routers/_app";

/**
 * Exercises the same fetchRequestHandler path production's route.ts uses
 * (not appRouter.createCaller, which skips errorFormatter entirely) so
 * this actually proves what a client receives over the wire.
 */
async function callOverHttp(
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
    router: appRouter,
    createContext: () => ({}),
  });
  const body = (await res.json()) as {
    error: { message: string; data: { code: string } };
  };
  return body.error;
}

suite("errorFormatter", () => {
  test("reshapes a zod BAD_REQUEST into a single readable message, not the raw issue JSON", async () => {
    const error = await callOverHttp("events.create", {
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
      "events.byId",
      { id: 999_999_999 },
      "GET",
    );

    assert.equal(error.data.code, "NOT_FOUND");
    assert.equal(error.message, "Event not found");
  });
});
