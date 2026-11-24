/**
 * Centralized, build-time environment configuration.
 *
 * IMPORTANT FOR BEGINNERS:
 * - `mock` is the DEFAULT mode. In this mode the app never makes a network
 *   request, so it works with no backend at all.
 * - `api` is enabled ONLY by an explicit env variable before startup. If its
 *   server cannot be reached, repositories fall back to local mock data.
 * - Expo only exposes variables whose names start with `EXPO_PUBLIC_`.
 *   See `.env.example` for the full list.
 *
 * No secrets belong here. A base URL and a Store ID are public identifiers,
 * not credentials. Customer JWT tokens are handled by src/api/token.ts.
 */

export type DataSource = "mock" | "api";

/** Documented base URLs (API.md — Base URL section). */
export const DOCUMENTED_BASE_URLS = {
  development: "http://localhost:3000",
  production: "https://api.mokkafa.com",
} as const;

export interface AppEnvironment {
  /** Which repository implementation the whole app uses. Default: mock. */
  dataSource: DataSource;
  /** Base URL of the Middleware. Documented dev URL is the fallback. */
  apiBaseUrl: string;
  /** Store ID from the dashboard / Salla merchant ID. Never invented. */
  storeId: string;
  /** Request timeout in milliseconds. */
  timeoutMs: number;
}

type EnvLike = Record<string, string | undefined>;

function cleanUrl(value: string | undefined): string {
  return (value ?? "").trim().replace(/\/+$/, "");
}

function parseTimeout(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 15000;
}

/** Read the raw environment. Kept separate so tests can verify parsing. */
export function readEnvironment(env: EnvLike = process.env): AppEnvironment {
  const requested = (env.EXPO_PUBLIC_DATA_SOURCE ?? "").trim();
  // Only the exact lowercase word "api" opts in. Everything else — including
  // "API", typos, empty values and "mock" — stays in the safe default mode.
  const dataSource: DataSource = requested === "api" ? "api" : "mock";
  return {
    dataSource,
    apiBaseUrl: cleanUrl(env.EXPO_PUBLIC_API_BASE_URL) || DOCUMENTED_BASE_URLS.development,
    storeId: (env.EXPO_PUBLIC_STORE_ID ?? "").trim(),
    timeoutMs: parseTimeout(env.EXPO_PUBLIC_API_TIMEOUT_MS),
  };
}

let overrides: Partial<AppEnvironment> = {};

/** Current, immutable-for-the-session environment snapshot. */
export function getEnvironment(): AppEnvironment {
  return { ...readEnvironment(), ...overrides };
}

/**
 * Test-only configuration hook. The application never calls this; API opt-in
 * comes from the environment, while runtime failure fallback is owned by the
 * repository registry.
 */
export function configureEnvironment(next: Partial<AppEnvironment>): void {
  overrides = { ...overrides, ...next };
}

export function resetEnvironment(): void {
  overrides = {};
}

export function isMockMode(): boolean {
  return getEnvironment().dataSource === "mock";
}

export function isApiMode(): boolean {
  return getEnvironment().dataSource === "api";
}
