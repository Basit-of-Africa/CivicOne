import { describe, expect, it } from "vitest";
import { AppError, fail, isAppError, toFieldErrors, ok } from "@/server/errors";
import { z } from "zod";

describe("structured errors", () => {
  it("builds an AppError with code and status", () => {
    const error = new AppError("Nope", { code: "FORBIDDEN" });
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe("FORBIDDEN");
    expect(error.statusCode).toBe(403);
    expect(isAppError(error)).toBe(true);
  });

  it("defaults to INTERNAL / 500", () => {
    const error = new AppError("Boom");
    expect(error.code).toBe("INTERNAL");
    expect(error.statusCode).toBe(500);
  });

  it("converts zod issues to field errors", () => {
    const schema = z.object({
      identifier: z.string().min(5),
    });
    const result = schema.safeParse({ identifier: "x" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = toFieldErrors(result.error);
      expect(fieldErrors.identifier).toBeTruthy();
    }
  });

  it("wraps outcomes for server actions", () => {
    expect(ok({ id: "usr_1" })).toEqual({ ok: true, data: { id: "usr_1" } });
    const failed = fail(new AppError("Denied", { code: "FORBIDDEN" }));
    expect(failed.ok).toBe(false);
    if (!failed.ok) {
      expect(failed.error?.code).toBe("FORBIDDEN");
      expect(failed.error?.message).toBe("Denied");
    }
  });

  it("hides internals for unknown errors", () => {
    const failed = fail(new Error("secret db connection string"));
    expect(failed.ok).toBe(false);
    if (!failed.ok) {
      expect(failed.error?.message).not.toContain("secret");
    }
  });
});
