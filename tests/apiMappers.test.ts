import {
  mapApiAddress,
  mapApiCartItem,
  mapApiCategory,
  mapApiCustomer,
  mapApiOrder,
  mapApiOrderStatus,
  mapApiProduct,
  mapApiProductPage,
  mapApiStoreConfig,
  parseApiAmount,
  remoteProductIdToLocalId,
  resetRemoteIdRegistry,
  resolveRemoteProductId,
  toLocalized,
} from "../src/api/mappers";
import type { ApiProduct } from "../src/api/types";

beforeEach(() => resetRemoteIdRegistry());

describe("API -> app model mapping", () => {
  test("maps a documented product safely, including sale price and images", () => {
    const api: ApiProduct = {
      id: "cuid-1",
      sallaId: "98765",
      name: "قميص أبيض",
      description: "...",
      price: "150.00",
      salePrice: "120.00",
      currency: "SAR",
      quantity: 50,
      sku: "TS-001",
      status: "sale",
      mainImage: "https://cdn/main.jpg",
      images: ["https://cdn/1.jpg", "https://cdn/main.jpg", null as unknown as string],
      categoryId: "cuid-cat",
      metadata: {},
    };
    const product = mapApiProduct(api);
    expect(product.name).toEqual({ ar: "قميص أبيض", en: "قميص أبيض" });
    expect(product.price).toBe(120);
    expect(product.compareAt).toBe(150);
    expect(product.images).toEqual([
      "https://cdn/main.jpg",
      "https://cdn/1.jpg",
    ]);
    expect(product.categoryId).toBe("cuid-cat");
    expect(product.remoteId).toBe("cuid-1");
    expect(product.remoteSallaId).toBe("98765");
    expect(product.remoteQuantity).toBe(50);
    // Undocumented variation data is NOT invented.
    expect(product.colors).toEqual([]);
    expect(product.sizes).toEqual([]);
    expect(product.variations).toEqual([]);
    expect(product.rating).toBe(0);
    expect(product.badge).toBeUndefined();
  });

  test("handles missing/nullable fields without NaN or fake images", () => {
    const product = mapApiProduct({
      id: "cuid-2",
      name: "بدون صورة",
      price: null,
      mainImage: null,
      images: null,
      categoryId: null,
      quantity: null,
    });
    expect(product.price).toBe(0);
    expect(product.images).toEqual([]);
    expect(product.categoryId).toBe("");
    expect(product.compareAt).toBeUndefined();
    expect(Number.isNaN(product.price)).toBe(false);
    expect(toLocalized(null)).toEqual({ ar: "", en: "" });
    expect(parseApiAmount("non-number")).toBe(0);
    expect(parseApiAmount(undefined)).toBe(0);
  });

  test("pagination maps items and metadata from the documented shape", () => {
    const page = mapApiProductPage({
      data: [{ id: "a", name: "A" }],
      pagination: { page: 2, perPage: 20, total: 21, totalPages: 2 },
    });
    expect(page).toHaveLength(1);
    expect(page[0].id).toBe(remoteProductIdToLocalId("a"));
  });

  test("remote string ids map to stable numeric ids with a reverse lookup", () => {
    const first = remoteProductIdToLocalId("cuid-1");
    expect(remoteProductIdToLocalId("cuid-1")).toBe(first);
    expect(first).toBeGreaterThan(14);
    expect(resolveRemoteProductId(first)).toBe("cuid-1");
    expect(resolveRemoteProductId(999999)).toBe("999999");
    const second = remoteProductIdToLocalId("cuid-2");
    expect(second).not.toBe(first);
    resetRemoteIdRegistry();
    expect(remoteProductIdToLocalId("cuid-1")).toBe(first);
  });

  test("maps categories, customers and addresses with honest fallbacks", () => {
    expect(
      mapApiCategory({
        id: "cat1",
        name: "ملابس",
        imageUrl: null,
        parentSallaId: null,
        isActive: true,
      }),
    ).toEqual({ id: "cat1", name: { ar: "ملابس", en: "ملابس" }, image: "" });
    expect(mapApiCustomer({ id: "c1", phone: "966500000000", email: null }).email).toBe("");
    const address = mapApiAddress(
      { id: "a1", city: "جدة", district: "الروضة", street: "شارع التحلية", details: "برج A", country: "SA", isDefault: true },
      "نورة",
    );
    expect(address.recipient).toBe("نورة");
    expect(address.label.ar).toBe("العنوان");
    expect(address.line.ar).toContain("الروضة");
    expect(address.line.ar).toContain("برج A");
    expect(address.isDefault).toBe(true);
  });

  test("maps cart options as display labels, not invented variation ids", () => {
    const item = mapApiCartItem({
      id: "i1",
      productId: "p1",
      name: "قميص أبيض",
      image: "img.jpg",
      quantity: 2,
      unitPrice: "120.00",
      lineTotal: "240.00",
      options: { color: "أحمر", size: "L" },
    });
    expect(item.unitPrice).toBe(120);
    expect(item.colorId).toBeNull();
    expect(item.sizeId).toBeNull();
    expect(item.colorName).toEqual({ ar: "أحمر", en: "أحمر" });
    expect(item.sizeLabel).toBe("L");
    expect(resolveRemoteProductId(item.productId)).toBe("p1");
  });

  test("maps every documented order status and tolerates missing fields", () => {
    expect(mapApiOrderStatus("PENDING")).toBe("processing");
    expect(mapApiOrderStatus("CONFIRMED")).toBe("processing");
    expect(mapApiOrderStatus("PROCESSING")).toBe("processing");
    expect(mapApiOrderStatus("SHIPPED")).toBe("shipped");
    expect(mapApiOrderStatus("DELIVERED")).toBe("delivered");
    expect(mapApiOrderStatus("CANCELLED")).toBe("cancelled");
    expect(mapApiOrderStatus("REFUNDED")).toBe("cancelled");

    const order = mapApiOrder({
      id: "o1",
      referenceId: "ORD-1",
      status: "SHIPPED",
      total: "240.00",
      currency: "SAR",
      paymentMethod: "cod",
      items: [{ name: "قميص", quantity: 2, unitPrice: "120.00", options: { size: "L" } }],
      createdAt: null,
    });
    expect(order.total).toBe(240);
    expect(order.subtotal).toBe(240);
    expect(order.deliveryFee).toBe(0);
    expect(order.isDemo).toBe(false);
    expect(order.paymentMethod).toBe("cod");
    expect(order.lines[0].productId).toBe(0); // not documented
    expect(order.lines[0].image).toBe("");
    expect(order.createdAt).toBe("1970-01-01T00:00:00.000Z");
  });

  test("maps store config with currency fallback", () => {
    expect(
      mapApiStoreConfig({
        storeId: "s1",
        appName: "متجر موكافا",
        logoUrl: null,
        primaryColor: "#1f8a70",
        secondaryColor: "#0b3d3a",
        currency: "SAR",
      }),
    ).toEqual({
      storeId: "s1",
      name: "متجر موكافا",
      primaryColor: "#1f8a70",
      secondaryColor: "#0b3d3a",
      currency: "SAR",
    });
    expect(mapApiStoreConfig({ storeId: "s2", currency: "UNKNOWN" }).currency).toBe("SAR");
  });
});
