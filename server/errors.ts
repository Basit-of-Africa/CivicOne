import { z } from "zod";

/**
 * Structured error handling.
 *
 * Every failure that crosses a module boundary uses `AppError` so that the
 * presentation layer (server actions, route handlers) can produce a stable,
 * typed response instead of leaking raw exceptions.
 */

export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "INVALID_CREDENTIALS",
  "ACCOUNT_LOCKED",
  "ACCOUNT_SUSPENDED",
  "TOKEN_INVALID",
  "TOKEN_EXPIRED",
  "INVALID_INPUT",
  "INTERNAL",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface AppErrorOptions {
  code?: ErrorCode;
  statusCode?: number;
  fieldErrors?: Record<string, string>;
  cause?: unknown;
}

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INVALID_CREDENTIALS: 401,
  ACCOUNT_LOCKED: 423,
  ACCOUNT_SUSPENDED: 403,
  TOKEN_INVALID: 400,
  TOKEN_EXPIRED: 410,
  INVALID_INPUT: 422,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly fieldErrors?: Record<string, string>;
  readonly details?: unknown;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = "AppError";
    this.code = options.code ?? "INTERNAL";
    this.statusCode = options.statusCode ?? STATUS_BY_CODE[this.code];
    this.fieldErrors = options.fieldErrors;
    if (options.cause !== undefined) {
      this.details = options.cause;
    }
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function validationError(
  fieldErrors: Record<string, string>,
  message = "Please check the highlighted fields.",
): AppError {
  return new AppError(message, { code: "VALIDATION_ERROR", fieldErrors });
}

export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!fieldErrors[path]) {
      fieldErrors[path] = issue.message;
    }
  }
  return fieldErrors;
}

export interface ActionResult<T = undefined> {
  ok: boolean;
  data?: T;
  error?: {
    code: ErrorCode;
    message: string;
    fieldErrors?: Record<string, string>;
  };
}

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: unknown): ActionResult<never> {
  if (isAppError(error)) {
    return {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        fieldErrors: error.fieldErrors,
      },
    };
  }
  console.error("[ActionResult] unexpected error:", error);
  return {
    ok: false,
    error: {
      code: "INTERNAL",
      message: "Something went wrong. Please try again.",
    },
  };
}

export function failGeneric(message = "Something went wrong. Please try again.") {
  return fail(new AppError(message, { code: "INTERNAL" }));
}

/**
 * Wrap a server-side operation so any `AppError` (or unexpected error)
 * becomes a typed `ActionResult` for the client.
 */
export async function withActionResult<T>(
  operation: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return ok(await operation());
  } catch (error) {
    return fail(error);
  }
}
