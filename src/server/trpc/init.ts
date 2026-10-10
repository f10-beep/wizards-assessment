import { initTRPC } from "@trpc/server";
import { ZodError } from "zod";

const t = initTRPC.create({
  // Zod's default BAD_REQUEST message is the raw, JSON-stringified issue
  // array (meant for logs/devtools, not a user-facing string) — every
  // procedure takes zod input, so reshape it once here instead of each
  // client call site re-parsing error.message to find something
  // displayable.
  errorFormatter({ shape, error }) {
    if (error.code === "BAD_REQUEST" && error.cause instanceof ZodError) {
      return {
        ...shape,
        message: error.cause.issues.map((issue) => issue.message).join("; "),
      };
    }
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
