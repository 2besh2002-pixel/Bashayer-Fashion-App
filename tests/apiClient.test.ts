import {
  apiClient,
  ApiError,
  configureApi,
  getApiConfig,
  resetApiClientForTests,
  setAuthTokenProvider,
  setUnauthorizedHandler,
} from "../src/api/client";
import { apiErrorTranslationKey } from "../src/api/errorMessages";

const originalFetch = globalThis.fetch;

function mockFetchOnce(payload: unknown, status = 200): jest.Mock {
  const mock = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
  });
  globalThis.fetch = mock as unknown as typeof fetch;
  return mock;
}

beforeEach(() => {
  configureApi({ baseUrl: "https://api.mokkafa.com/", storeId: "store-1", timeoutMs: 2000 });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  resetApiClientForTests();
});

describe("centralized API client", () => {
  test("builds a documented store path with encoded query parameters", async () => {
    const fetchMock = mockFetchOnce({ data: [], pagination: {} });
    await apiClient.get("/v1/store/store-1/products", {
      query: { page: 2, per_page: 20, category_id: "a b", search: undefined },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://api.mokkafa.com/v1/store/store-1/products?page=2&per_page=20&category_id=a%20b",
    );
    expect(init.method).toBe("GET");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.headers.Authorization).toBeUndefined();
  });

  test("sends a Bearer token and JSON body for POST/PUT/DELETE", async () => {
    const fetchMock = mockFetchOnce({ ok: true });
    await apiClient.post("/v1/store/store-1/cart/items", { productId: "p1", quantity: 1 }, { token: "jwt-123" });
    await apiClient.put("/v1/store/store-1/cart/items/i1", { quantity: 0 }, { token: "jwt-123" });
    await apiClient.delete("/v1/store/store-1/cart/items/i1", { token: "jwt-123" });
    expect(fetchMock.mock.calls.map((call) => call[1].method)).toEqual(["POST", "PUT", "DELETE"]);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer jwt-123");
    expect(fetchMock.mock.calls[0][1].body).toBe('{"productId":"p1","quantity":1}');
    expect(fetchMock.mock.calls[1][1].body).toBe('{"quantity":0}');
  });

  test("uses an installed token provider instead of a hardcoded token", async () => {
    const fetchMock = mockFetchOnce({ ok: true });
    setAuthTokenProvider(() => "from-secure-store");
    await apiClient.get("/v1/store/store-1/me");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer from-secure-store");
    setAuthTokenProvider(null);
  });

  test("maps documented HTTP statuses to safe, translated error keys", async () => {
    const cases: Array<[number, string, string]> = [
      [400, "api400", "apiValidationError"],
      [401, "api401", "apiUnauthorized"],
      [403, "api403", "apiForbidden"],
      [404, "api404", "apiNotFound"],
      [429, "api429", "apiRateLimited"],
      [500, "api500", "apiUnavailable"],
      [502, "api502", "apiUnavailable"],
      [503, "api503", "apiUnavailable"],
      [504, "api504", "apiUnavailable"],
    ];
    for (const [status, code, key] of cases) {
      mockFetchOnce({ statusCode: status, message: "secret server detail" }, status);
        let caught: unknown;
      try {
        await apiClient.get("/v1/store/store-1/products");
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(ApiError);
      const apiError = caught as ApiError;
      expect(apiError.status).toBe(status);
      expect(apiError.code).toBe(code);
      expect(apiErrorTranslationKey(apiError)).toBe(key);
      expect(apiError.message).not.toContain("secret");
    }
  });

  test("clears the token provider on 401/403 without logging it", async () => {
    mockFetchOnce({ statusCode: 401, message: "expired" }, 401);
    const onUnauthorized = jest.fn();
    setUnauthorizedHandler(onUnauthorized);
    await expect(apiClient.get("/v1/store/store-1/me")).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    setUnauthorizedHandler(null);
  });

  test("network and timeout failures get generic messages", async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error("failed: Bearer top-secret")) as unknown as typeof fetch;
    let networkError: unknown;
    try {
      await apiClient.get("/v1/store/store-1/products");
    } catch (error) {
      networkError = error;
    }
    expect(networkError).toBeInstanceOf(ApiError);
    expect((networkError as ApiError).kind).toBe("network");
    expect((networkError as ApiError).message).not.toContain("top-secret");

    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    globalThis.fetch = jest.fn().mockRejectedValue(abortError) as unknown as typeof fetch;
    await expect(apiClient.get("/v1/store/store-1/products")).rejects.toMatchObject({ kind: "timeout" });
  });

  test("invalid JSON and missing configuration are rejected safely", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "<html>not json</html>",
    }) as unknown as typeof fetch;
    await expect(apiClient.get("/v1/store/store-1/products")).rejects.toMatchObject({
      kind: "invalid-response",
    });

    configureApi({ storeId: "" });
    const fetchMock = globalThis.fetch as jest.Mock;
    fetchMock.mockClear();
    await expect(apiClient.get("/v1/store//products")).rejects.toMatchObject({
      kind: "not-configured",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getApiConfig().baseUrl).toBe("https://api.mokkafa.com");
  });
});
