jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});

import * as SecureStore from "expo-secure-store";
import { configureApi, resetApiClientForTests } from "../src/api/client";
import { installCustomerTokenProvider } from "../src/api/token";
import { mapApiProduct, resetRemoteIdRegistry } from "../src/api/mappers";
import { apiCatalogRepository } from "../src/repositories/apiCatalogRepository";
import { apiAuthRepository, normalizePhoneForApi } from "../src/repositories/apiAuthRepository";
import {
  apiAddressRepository,
  apiCartRepository,
  apiOrderRepository,
  apiProfileRepository,
  apiStoreConfigRepository,
} from "../src/repositories/apiCommerceRepositories";

const originalFetch = globalThis.fetch;

function respond(payload: unknown, status = 200): jest.Mock {
  const mock = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
  });
  globalThis.fetch = mock as unknown as typeof fetch;
  return mock;
}

beforeEach(() => {
  configureApi({ baseUrl: "https://api.mokkafa.com", storeId: "cmq-store", timeoutMs: 5000 });
  resetRemoteIdRegistry();
  installCustomerTokenProvider();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  resetApiClientForTests();
  jest.clearAllMocks();
});

describe("prepared API repositories use only documented endpoints", () => {
  test("catalog sends page, per_page, category_id and search", async () => {
    const fetchMock = respond({
      data: [{ id: "p1", name: "قميص", price: "150.00", mainImage: "img.jpg" }],
      pagination: { page: 2, perPage: 10, total: 11, totalPages: 2 },
    });
    const page = await apiCatalogRepository.listProductsPaged({
      page: 2,
      perPage: 10,
      categoryId: "cat 1",
      search: "قميص",
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.mokkafa.com/v1/store/cmq-store/products?page=2&per_page=10&category_id=cat%201&search=%D9%82%D9%85%D9%8A%D8%B5",
    );
    expect(page.items[0].price).toBe(150);
    expect(page.total).toBe(11);
  });

  test("search uses the documented search parameter, not an invented endpoint", async () => {
    const fetchMock = respond({ data: [], pagination: { page: 1, perPage: 100, total: 0, totalPages: 1 } });
    await apiCatalogRepository.search("فستان", "ar");
    expect(fetchMock.mock.calls[0][0]).toContain("/v1/store/cmq-store/products?");
    expect(fetchMock.mock.calls[0][0]).toContain("search=");
    expect(fetchMock.mock.calls[0][0]).not.toContain("/products/search");
  });

  test("OTP flow sends digits-only phone, ignores debug_code and stores the JWT", async () => {
    const requestMock = respond({ sent: true, debug_code: "1234" });
    const requested = await apiAuthRepository.requestOtp("+966500000000");
    expect(requested.ok).toBe(true);
    expect(JSON.parse(requestMock.mock.calls[0][1].body)).toEqual({ phone: "966500000000" });

    const verifyMock = respond({
      token: "real-jwt-token",
      customer: { id: "c1", phone: "966500000000", name: "نورة", email: null },
    });
    const verified = await apiAuthRepository.verifyOtp("+966500000000", "1234");
    expect(verified.ok).toBe(true);
    if (verified.ok) expect(verified.data.token).toBe("real-jwt-token");
    expect(JSON.parse(verifyMock.mock.calls[0][1].body)).toEqual({
      phone: "966500000000",
      code: "1234",
    });
    expect(await SecureStore.getItemAsync("naseej:customer-jwt")).toBe("real-jwt-token");

    // Restoring the session uses the secure token as a Bearer header.
    const meMock = respond({ id: "c1", phone: "966500000000", name: "نورة", email: null });
    const session = await apiAuthRepository.restoreSession();
    expect(session?.user.name).toBe("نورة");
    expect(meMock.mock.calls[0][1].headers.Authorization).toBe("Bearer real-jwt-token");
    expect(normalizePhoneForApi("00 966 50 000 0000")).toBe("966500000000");
  });

  test("does not claim an OTP was sent when the server says it was not", async () => {
    respond({ sent: false });
    const result = await apiAuthRepository.requestOtp("+966500000000");
    expect(result).toEqual({ ok: false, error: "apiUnavailable" });
  });

  test("cart add maps local numeric ids back to the remote product id", async () => {
    const product = mapApiProduct({ id: "remote-p1", name: "قطعة", price: "10.00" });
    const fetchMock = respond({
      id: "cart1",
      items: [{ id: "i1", productId: "remote-p1", quantity: 2, unitPrice: "20.00" }],
      itemCount: 2,
      total: "20.00",
      currency: "SAR",
    });
    const items = await apiCartRepository.add(String(product.id), 2, { color: "أحمر", size: "L" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      productId: "remote-p1",
      quantity: 2,
      options: { color: "أحمر", size: "L" },
    });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.mokkafa.com/v1/store/cmq-store/cart/items");
    expect(items[0].unitPrice).toBe(20);
  });

  test("create order sends only documented fields (cod, addressId, note)", async () => {
    const fetchMock = respond({
      id: "o1",
      referenceId: "ORD-1",
      status: "PENDING",
      total: "240.00",
      currency: "SAR",
      paymentMethod: "cod",
      createdAt: "2026-06-23T00:00:00.000Z",
    });
    const created = await apiOrderRepository.create({
      id: "local",
      createdAt: new Date().toISOString(),
      status: "processing",
      lines: [],
      subtotal: 240,
      deliveryFee: 0,
      discount: 0,
      total: 240,
      currencyAtCheckout: "SAR",
      isDemo: true,
      addressId: "addr1",
      paymentMethod: "cod",
      note: "ملاحظة",
    });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.mokkafa.com/v1/store/cmq-store/orders");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      addressId: "addr1",
      paymentMethod: "cod",
      note: "ملاحظة",
    });
    expect(created.status).toBe("processing");
    expect(created.referenceId).toBe("ORD-1");
  });

  test("card payment is omitted because the docs only document cod", async () => {
    const fetchMock = respond({ id: "o2", total: "10.00", status: "PENDING" });
    await apiOrderRepository.create({
      id: "local2",
      createdAt: new Date().toISOString(),
      status: "processing",
      lines: [],
      subtotal: 10,
      deliveryFee: 0,
      discount: 0,
      total: 10,
      currencyAtCheckout: "SAR",
      isDemo: true,
      paymentMethod: "card",
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({});
  });

  test("config, profile and addresses call their documented paths", async () => {
    const configFetch = respond({ storeId: "cmq-store", appName: "متجر موكافا", currency: "SAR" });
    const config = await apiStoreConfigRepository.get();
    expect(configFetch.mock.calls[0][0]).toBe("https://api.mokkafa.com/v1/store/cmq-store/config");
    expect(config.name).toBe("متجر موكافا");

    const profileFetch = respond({ id: "c1", name: "نورة", phone: "966500000000", email: null });
    expect((await apiProfileRepository.get())?.name).toBe("نورة");
    expect(profileFetch.mock.calls[0][0]).toBe("https://api.mokkafa.com/v1/store/cmq-store/me");

    const addressFetch = respond([
      { id: "a1", city: "جدة", district: "الروضة", street: "شارع", isDefault: true },
    ]);
    const addresses = await apiAddressRepository.list();
    expect(addresses[0].city.ar).toBe("جدة");
    expect(addressFetch.mock.calls[0][0]).toBe(
      "https://api.mokkafa.com/v1/store/cmq-store/me/addresses",
    );
  });
});
