jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { configureApi } from "../src/api/client";
import { configureEnvironment, readEnvironment, resetEnvironment } from "../src/config/environment";
import { afterEach } from "@jest/globals";
import {
  getRepositorySource,
  repositories,
  resetRepositoryFallbackForTests,
} from "../src/repositories";
import { mockCatalogRepository } from "../src/repositories/mockCatalogRepository";
import { mockAuthRepository } from "../src/repositories/mockAuthRepository";
import { PRODUCTS } from "../src/data/products";
import { MAIN_CATEGORIES } from "../src/data/categories";
import { SEED_ORDERS } from "../src/data/mock";
import { useCartStore } from "../src/stores/cartStore";
import { useWishlistStore } from "../src/stores/wishlistStore";

const originalFetch = globalThis.fetch;

beforeEach(async () => {
  resetEnvironment();
  resetRepositoryFallbackForTests();
  useCartStore.setState({ items: [] });
  useWishlistStore.setState({ ids: [] });
  await AsyncStorage.clear();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("centralized data-source configuration", () => {
  test("mock is the default even when the variable is missing or unknown", () => {
    expect(readEnvironment({}).dataSource).toBe("mock");
    expect(readEnvironment({ EXPO_PUBLIC_DATA_SOURCE: "prod" }).dataSource).toBe("mock");
    expect(getRepositorySource()).toBe("mock");
  });

  test("documented dev URL and empty store id are safe defaults", () => {
    const env = readEnvironment({});
    expect(env.apiBaseUrl).toBe("http://localhost:3000");
    expect(env.storeId).toBe("");
    expect(env.timeoutMs).toBe(15000);
  });

  test("mock repositories remain active and fully usable without a backend", async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    expect(repositories.catalog).toBe(mockCatalogRepository);
    expect(repositories.auth).toBe(mockAuthRepository);
    expect(await repositories.catalog.listProducts()).toEqual(PRODUCTS);
    expect(await repositories.catalog.listCategories()).toEqual(MAIN_CATEGORIES);
    const page = await repositories.catalog.listProductsPaged({ page: 1, perPage: 5 });
    expect(page.items).toHaveLength(5);
    expect(page.total).toBe(PRODUCTS.length);
    expect((await repositories.auth.requestOtp("+966500000000")).ok).toBe(true);
    await repositories.orders.create(SEED_ORDERS[0]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("api mode is explicit and selects the prepared implementations", () => {
    configureEnvironment({ dataSource: "api" });
    expect(getRepositorySource()).toBe("api");
    expect(repositories.catalog).not.toBe(mockCatalogRepository);
    resetEnvironment();
    expect(repositories.catalog).toBe(mockCatalogRepository);
  });

  test("falls back to mock data when the API cannot be reached", async () => {
    configureEnvironment({ dataSource: "api", storeId: "store-1" });
    configureApi({ baseUrl: "https://api.mokkafa.com", storeId: "store-1" });
    const fetchMock = jest.fn().mockRejectedValue(new TypeError("Network request failed"));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(repositories.catalog.listProducts()).resolves.toEqual(PRODUCTS);
    expect(getRepositorySource()).toBe("mock");
    await expect(repositories.catalog.listCategories()).resolves.toEqual(MAIN_CATEGORIES);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("falls back to mock data when the API request times out", async () => {
    configureEnvironment({ dataSource: "api", storeId: "store-1" });
    configureApi({ baseUrl: "https://api.mokkafa.com", storeId: "store-1" });
    const timeoutError = new Error("Request timed out");
    timeoutError.name = "AbortError";
    globalThis.fetch = jest.fn().mockRejectedValue(timeoutError) as unknown as typeof fetch;

    await expect(repositories.catalog.listProducts()).resolves.toEqual(PRODUCTS);
    expect(getRepositorySource()).toBe("mock");
  });

  test.each([500, 502, 503, 504])("falls back when the API returns HTTP %i", async (status) => {
    configureEnvironment({ dataSource: "api", storeId: "store-1" });
    configureApi({ baseUrl: "https://api.mokkafa.com", storeId: "store-1" });
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status,
      text: async () => "",
    }) as unknown as typeof fetch;

    await expect(repositories.catalog.listProducts()).resolves.toEqual(PRODUCTS);
    expect(getRepositorySource()).toBe("mock");
  });

  test("falls back to the full mock catalog when the API returns an empty catalog", async () => {
    configureEnvironment({ dataSource: "api", storeId: "store-1" });
    configureApi({ baseUrl: "https://api.mokkafa.com", storeId: "store-1" });
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: [], pagination: {} }),
    }) as unknown as typeof fetch;

    await expect(repositories.catalog.listProducts()).resolves.toEqual(PRODUCTS);
    expect(getRepositorySource()).toBe("mock");
  });

  test("keeps local cart and wishlist data intact when the source falls back", async () => {
    const product = PRODUCTS[0];
    useCartStore.getState().addItem(product, { colorId: "gray", sizeId: "m", quantity: 2 });
    useWishlistStore.getState().add(product.id);
    const originalLine = useCartStore.getState().items[0];
    configureEnvironment({ dataSource: "api", storeId: "store-1" });
    configureApi({ baseUrl: "https://api.mokkafa.com", storeId: "store-1" });
    globalThis.fetch = jest.fn().mockRejectedValue(new TypeError("Network request failed")) as unknown as typeof fetch;

    await repositories.catalog.listProducts();
    useCartStore.getState().addItem(product, { colorId: "gray", sizeId: "m" });

    expect(getRepositorySource()).toBe("mock");
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].id).toBe(originalLine.id);
    expect(useCartStore.getState().items[0].quantity).toBe(3);
    expect(useWishlistStore.getState().ids).toEqual([product.id]);
  });

  test("falls back without sending a request when the Store ID is missing", async () => {
    configureEnvironment({ dataSource: "api", storeId: "" });
    configureApi({ baseUrl: "https://api.mokkafa.com", storeId: "" });
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(repositories.catalog.listProducts()).resolves.toEqual(PRODUCTS);
    expect(getRepositorySource()).toBe("mock");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test.each([400, 401, 403])("does not switch to mock mode for HTTP %i", async (status) => {
    configureEnvironment({ dataSource: "api", storeId: "store-1" });
    configureApi({ baseUrl: "https://api.mokkafa.com", storeId: "store-1" });
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status,
      text: async () => "",
    }) as unknown as typeof fetch;

    await expect(repositories.catalog.listProducts()).rejects.toMatchObject({ status });
    expect(getRepositorySource()).toBe("api");
  });
});
