import { getEnvironment, readEnvironment, resetEnvironment } from "../src/config/environment";
import {
  buildUrl,
  resetApiClientForTests,
  setAuthTokenProvider,
  setUnauthorizedHandler,
} from "../src/api/client";
import { ApiError, normalizeApiError, httpError } from "../src/api/errors";
import { apiErrorTranslationKey } from "../src/api/errorMessages";
import {
  mapApiCartItem,
  mapApiProduct,
  mapApiStoreConfig,
} from "../src/api/mappers";

beforeEach(() => {
  resetEnvironment();
  resetApiClientForTests();
  setAuthTokenProvider(null);
  setUnauthorizedHandler(null);
});

describe("safe data source configuration", () => {
  test("mock is the default and exact api is the only API opt-in", () => {
    expect(readEnvironment({}).dataSource).toBe("mock");
    expect(readEnvironment({ EXPO_PUBLIC_DATA_SOURCE: "API" }).dataSource).toBe("mock");
    expect(readEnvironment({ EXPO_PUBLIC_DATA_SOURCE: "api" }).dataSource).toBe("api");
  });

  test("the running app environment defaults to mock", () => {
    expect(getEnvironment().dataSource).toBe("mock");
  });
});

describe("mock mode network safety", () => {
  test("mock catalog and cart do not call fetch", async () => {
    const fetchSpy = jest.fn();
    globalThis.fetch = fetchSpy as typeof fetch;

    const { repositories } = await import("../src/repositories");
    await expect(repositories.catalog.listProducts()).resolves.toBeDefined();
    await expect(repositories.cart.get()).resolves.toBeDefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("documented API response mapping", () => {
  test("product variation fields remain isolated and empty", () => {
    const product = mapApiProduct({
      id: "remote-dress",
      name: "Dress",
      price: "429.00",
      quantity: 5,
      images: ["dress.jpg"],
    });
    expect(product.remoteId).toBe("remote-dress");
    expect(product.colors).toEqual([]);
    expect(product.sizes).toEqual([]);
    expect(product.variations).toEqual([]);
  });

  test("cart options only map documented display labels", () => {
    const item = mapApiCartItem({
      id: "cart-1",
      productId: "remote-dress",
      quantity: 2,
      unitPrice: "120.00",
      options: { color: "Red", size: "L", sku: "unsupported-field" },
    });
    expect(item.colorName).toEqual({ ar: "Red", en: "Red" });
    expect(item.sizeLabel).toBe("L");
    expect(item.colorId).toBeNull();
    expect(item.sizeId).toBeNull();
  });

  test("store config maps into the existing app snapshot", () => {
    expect(
      mapApiStoreConfig({
        storeId: "store-1",
        appName: "Test Store",
        primaryColor: "#111111",
        currency: "SAR",
      }),
    ).toEqual(
      expect.objectContaining({
        storeId: "store-1",
        name: "Test Store",
        primaryColor: "#111111",
        currency: "SAR",
      }),
    );
  });
});

describe("API client and errors", () => {
  test("buildUrl adds only the documented query parameters", () => {
    expect(buildUrl("/v1/store/test/products", { page: 1, per_page: 20 })).toBe(
      "http://localhost:3000/v1/store/test/products?page=1&per_page=20",
    );
  });

  test("documented HTTP errors map to safe translation keys", () => {
    expect(apiErrorTranslationKey(httpError(400))).toBe("apiValidationError");
    expect(apiErrorTranslationKey(httpError(401))).toBe("apiUnauthorized");
    expect(apiErrorTranslationKey(httpError(403))).toBe("apiForbidden");
    expect(apiErrorTranslationKey(httpError(404))).toBe("apiNotFound");
    expect(apiErrorTranslationKey(httpError(429))).toBe("apiRateLimited");
    expect(apiErrorTranslationKey(httpError(503))).toBe("apiUnavailable");
  });

  test("network and unexpected errors are normalized", () => {
    expect(normalizeApiError(new Error("network")).kind).toBe("network");
    expect(normalizeApiError(new ApiError("bad", 400)).status).toBe(400);
  });
});
