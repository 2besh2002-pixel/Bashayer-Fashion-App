/**
 * Centralized, safe API error handling.
 *
 * Rules:
 * - Never log or expose a token, request body or raw server payload.
 * - Show short, predictable messages; map documented HTTP codes to a message
 *   owned by the app instead of trusting arbitrary server text.
 * - 401 / 403 are treated as expired/invalid/forbidden sessions.
 */

export type ApiErrorKind =
  | "http"
  | "network"
  | "timeout"
  | "invalid-response"
  | "not-configured"
  | "not-found";

/** Documented status codes plus common gateway failures. */
export const API_STATUS_MESSAGES: Record<number, string> = {
  400: "The request could not be accepted. Please check your input.",
  401: "Your session has expired. Please sign in again.",
  403: "You do not have access to this store.",
  404: "The requested item was not found.",
  429: "Too many requests. Please try again shortly.",
  500: "The store service is temporarily unavailable.",
  502: "The store service is temporarily unavailable.",
  503: "The store service is temporarily unavailable.",
  504: "The store service timed out. Please try again.",
};

const GENERIC_HTTP_MESSAGE = "The service could not complete the request.";

export class ApiError extends Error {
  readonly status: number;
  readonly kind: ApiErrorKind;
  /** Translation-friendly code, e.g. `api401`, safe to pass to `t()`. */
  readonly code: string;

  constructor(message: string, status = 0, kind: ApiErrorKind = "http") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.kind = kind;
    this.code = kind === "http" || kind === "not-found" ? `api${status}` : `api${kind}`;
  }

  get isUnauthorized(): boolean {
    return this.status === 401 || this.status === 403;
  }

  get isTimeout(): boolean {
    return this.kind === "timeout";
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

/** Convert any thrown value into a safe ApiError without leaking details. */
export function normalizeApiError(error: unknown, status = 0): ApiError {
  if (error instanceof ApiError) return error;
  if (status > 0) {
    return new ApiError(API_STATUS_MESSAGES[status] ?? GENERIC_HTTP_MESSAGE, status);
  }
  const name = error instanceof Error ? error.name : "";
  if (name === "AbortError" || name === "TimeoutError") {
    return new ApiError("The request timed out. Please try again.", 0, "timeout");
  }
  return new ApiError("The network is unavailable. Please try again.", 0, "network");
}

/** Map an HTTP failure status to an ApiError. The body is never logged. */
export function httpError(status: number): ApiError {
  return new ApiError(
    API_STATUS_MESSAGES[status] ?? GENERIC_HTTP_MESSAGE,
    status,
    status === 404 ? "not-found" : "http",
  );
}

export function configurationError(reason: string): ApiError {
  return new ApiError(reason, 0, "not-configured");
}

/** Only service/connectivity failures switch repositories to local mock data. */
export function shouldFallbackToMock(error: unknown): error is ApiError {
  if (!(error instanceof ApiError)) return false;
  return (
    error.kind === "network" ||
    error.kind === "timeout" ||
    error.kind === "invalid-response" ||
    error.kind === "not-configured" ||
    [500, 502, 503, 504].includes(error.status)
  );
}
