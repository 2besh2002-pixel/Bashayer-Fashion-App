/**
 * Centralized API client — prepared only, NOT used in mock mode.
 *
 * One place owns: base URL, Store ID, JSON headers, Bearer token, timeout,
 * and safe error normalization. Mock repositories never import this module,
 * so starting the app requires no backend and sends no requests.
 *
 * SECURITY: no secret, password or customer token is ever logged or stored in
 * this file. Tokens come from a provider (SecureStore) and are used only in a
 * request header. See src/api/token.ts.
 */

import { getEnvironment } from "@/src/config/environment";
import {
  ApiError,
  configurationError,
  httpError,
  normalizeApiError,
  shouldFallbackToMock,
} from "@/src/api/errors";

export interface ApiConfig {
  /** Public base URL from EXPO_PUBLIC_API_BASE_URL. */
  baseUrl: string;
  /** Public Store ID from EXPO_PUBLIC_STORE_ID. Never hardcoded in logic. */
  storeId: string;
  timeoutMs: number;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  /** Explicit token overrides the provider for one request. */
  token?: string | null;
  query?: Record<string, string | number | boolean | undefined | null>;
}

type TokenProvider = () => string | null | undefined | Promise<string | null | undefined>;
type UnauthorizedHandler = () => void | Promise<void>;
type ConnectionFailureHandler = () => void;

const initial = getEnvironment();
let config: ApiConfig = {
  baseUrl: initial.apiBaseUrl,
  storeId: initial.storeId,
  timeoutMs: initial.timeoutMs,
};

let tokenProvider: TokenProvider | null = null;
let unauthorizedHandler: UnauthorizedHandler | null = null;
let connectionFailureHandler: ConnectionFailureHandler | null = null;

export function configureApi(next: Partial<ApiConfig>): void {
  config = {
    ...config,
    ...next,
    ...(next.baseUrl !== undefined ? { baseUrl: next.baseUrl.replace(/\/+$/, "") } : {}),
  };
}

export function resetApiClientForTests(): void {
  const env = getEnvironment();
  config = { baseUrl: env.apiBaseUrl, storeId: env.storeId, timeoutMs: env.timeoutMs };
  tokenProvider = null;
  unauthorizedHandler = null;
  connectionFailureHandler = null;
}

export function getApiConfig(): Readonly<ApiConfig> {
  return { ...config };
}

/** Install the SecureStore-backed token provider (see src/api/token.ts). */
export function setAuthTokenProvider(provider: TokenProvider | null): void {
  tokenProvider = provider;
}

/** Called on 401/403 so an expired token is discarded, never logged. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

/** Notify the repository registry when the backend cannot provide a usable response. */
export function setConnectionFailureHandler(handler: ConnectionFailureHandler | null): void {
  connectionFailureHandler = handler;
}

/** Fail early with a safe message instead of calling a made-up URL. */
export function assertApiReady(): void {
  if (!config.baseUrl) throw configurationError("API base URL is not configured.");
  if (!config.storeId) {
    throw configurationError("Store ID is not configured. Set EXPO_PUBLIC_STORE_ID.");
  }
}

export function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const base = config.baseUrl.replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;
  const parts = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
  return parts ? `${url}?${parts}` : url;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query } = options;
  try {
    assertApiReady();
  } catch (error) {
    const apiError = normalizeApiError(error);
    if (shouldFallbackToMock(apiError)) connectionFailureHandler?.();
    throw apiError;
  }

  const resolvedToken =
    options.token !== undefined ? options.token : await tokenProvider?.();

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), config.timeoutMs) : null;

  try {
    const response = await fetch(buildUrl(path, query), {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      ...(controller ? { signal: controller.signal } : {}),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        try {
          await unauthorizedHandler?.();
        } catch {
          // Clearing a token must never mask the original error.
        }
      }
      throw httpError(response.status);
    }

    const text = await response.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new ApiError("The service returned an unexpected response.", 0, "invalid-response");
    }
  } catch (error) {
    const apiError = normalizeApiError(error);
    if (shouldFallbackToMock(apiError)) connectionFailureHandler?.();
    throw apiError;
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "PUT", body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "DELETE" }),
};

/** Re-exported as a value so callers can use `instanceof ApiError`. */
export { ApiError };
