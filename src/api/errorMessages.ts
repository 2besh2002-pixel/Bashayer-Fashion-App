/** Map a normalized API error to a translation key owned by the app. */

import type { TranslationKey } from "@/src/i18n/translations";
import { ApiError } from "@/src/api/errors";

export function apiErrorTranslationKey(error: unknown): TranslationKey {
  if (!(error instanceof ApiError)) return "apiUnexpectedResponse";
  if (error.kind === "network") return "apiNetworkError";
  if (error.kind === "timeout") return "apiTimeout";
  if (error.kind === "not-configured") return "apiNotConfigured";
  if (error.kind === "invalid-response") return "apiUnexpectedResponse";
  switch (error.status) {
    case 400:
      return "apiValidationError";
    case 401:
      return "apiUnauthorized";
    case 403:
      return "apiForbidden";
    case 404:
      return "apiNotFound";
    case 429:
      return "apiRateLimited";
    case 500:
    case 502:
    case 503:
    case 504:
      return "apiUnavailable";
    default:
      return "apiUnexpectedResponse";
  }
}
