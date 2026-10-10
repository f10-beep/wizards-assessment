import assert from "node:assert/strict";
import { suite, test } from "node:test";
import { TRPCError } from "@trpc/server";
import { requireOrganizer } from "./roles";

suite("requireOrganizer", () => {
  test("passes for an actor claiming the organizer role", () => {
    assert.doesNotThrow(() =>
      requireOrganizer({ principal: "store@example.com", isOrganizer: true }),
    );
  });

  test("throws FORBIDDEN for an actor not claiming the organizer role", () => {
    assert.throws(
      () =>
        requireOrganizer({ principal: "alex@example.com", isOrganizer: false }),
      (error: unknown) =>
        error instanceof TRPCError && error.code === "FORBIDDEN",
    );
  });
});
