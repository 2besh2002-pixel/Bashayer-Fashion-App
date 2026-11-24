/**
 * Mapping boundary: documented API responses -> EXISTING app models.
 *
 * Screens never see raw API objects. This file is the only place allowed to
 * interpret remote fields, fill safe fallbacks and record what the API does
 * NOT document.
 *
 * KNOWN DOCUMENTATION GAPS (API.md as supplied):
 * - Product variations: no documented colors, sizes, per-color prices/images,
 *   combination prices, stock or availability. Mapped products therefore have
 *   empty `colors`/`sizes`/`variations`; local mock variation data is intact.
 * - Product slug, rating, review count, badge, measurements, material note:
 *   not documented → safe neutral values.
 * - Wishlist: no endpoints at all → stays local (Zustand wishlistStore).
 * - Cart `options` is a generic object; docs show { color, size } labels only,
 *   not stable variation IDs → IDs are left null and labels are snapshots.
 * - Orders: items do not include productId/image; no subtotal/fee/discount
 *   breakdown, no addressId on the order response.
 * - Addresses: no recipient or label field; UI labels are local-only.
 * - debug_code is development-only and is NEVER read here.
 */

import type {
  Address,
  CartItem,
  Category,
  CurrencyCode,
  Localized,
  Order,
  OrderLine,
  OrderStatus,
  Product,
  StoreConfigSnapshot,
  User,
} from "@/src/types";
import { CURRENCIES } from "@/src/utils/currency";
import type {
  ApiAddress,
  ApiCart,
  ApiCartItem,
  ApiCategory,
  ApiCustomerIdentity,
  ApiCustomerProfile,
  ApiOrder,
  ApiOrderStatus,
  ApiProduct,
  ApiProductPage,
  ApiStoreConfig,
} from "@/src/api/types";

/** Remote IDs are strings; app models use numbers. Deterministic + registered. */
const remoteToLocal = new Map<string, number>();
const localToRemote = new Map<number, string>();

function hashRemoteId(value: string): number {
  // FNV-1a (32-bit), kept in a positive range well above mock ids 1-14.
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return 100000 + (Math.abs(hash >>> 0) % 900000);
}

export function remoteProductIdToLocalId(remoteId: string): number {
  const known = remoteToLocal.get(remoteId);
  if (known !== undefined) return known;
  let candidate = hashRemoteId(remoteId);
  while (localToRemote.has(candidate)) {
    candidate = candidate >= 999999 ? 100000 : candidate + 1;
  }
  remoteToLocal.set(remoteId, candidate);
  localToRemote.set(candidate, remoteId);
  return candidate;
}

/** Reverse lookup used when POSTing a documented cart item. */
export function resolveRemoteProductId(localId: number): string {
  return localToRemote.get(localId) ?? String(localId);
}

export function resetRemoteIdRegistry(): void {
  remoteToLocal.clear();
  localToRemote.clear();
}

export function toLocalized(value: string | null | undefined): Localized {
  const text = typeof value === "string" ? value : "";
  return { ar: text, en: text };
}

/** Never let a missing/invalid API amount become NaN in price calculations. */
export function parseApiAmount(value: string | number | null | undefined): number {
  if (typeof value !== "number" && typeof value !== "string") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function toCurrency(value: string | null | undefined): CurrencyCode {
  const code = (value ?? "").toUpperCase();
  return CURRENCIES.some((c) => c.code === code) ? (code as CurrencyCode) : "SAR";
}

function uniqueImages(api: ApiProduct): string[] {
  const raw = [api.mainImage, ...(Array.isArray(api.images) ? api.images : [])];
  return Array.from(
    new Set(raw.filter((item): item is string => typeof item === "string" && item.length > 0)),
  );
}

export function mapApiProduct(api: ApiProduct): Product {
  const price = parseApiAmount(api.price);
  const hasSale = api.salePrice !== null && api.salePrice !== undefined;
  const finalPrice = hasSale ? parseApiAmount(api.salePrice) : price;
  const id = remoteProductIdToLocalId(api.id);
  return {
    id,
    remoteId: api.id,
    remoteSallaId: typeof api.sallaId === "string" ? api.sallaId : undefined,
    remoteQuantity: typeof api.quantity === "number" ? api.quantity : null,
    remoteSku: typeof api.sku === "string" ? api.sku : null,
    // The API has no slug field; keep routes stable with a derived one.
    slug: `product-${id}`,
    name: toLocalized(api.name),
    price: finalPrice,
    ...(hasSale && price > finalPrice ? { compareAt: price } : {}),
    rating: 0,
    reviewCount: 0,
    images: uniqueImages(api),
    categoryId: typeof api.categoryId === "string" ? api.categoryId : "",
    description: toLocalized(api.description),
    // Variation structure is NOT documented — do not fabricate it.
    colors: [],
    sizes: [],
    variations: [],
  };
}

export function mapApiProductPage(page: ApiProductPage): Product[] {
  return (Array.isArray(page.data) ? page.data : []).map(mapApiProduct);
}

export function mapApiCategory(api: ApiCategory): Category {
  return {
    id: api.id,
    name: toLocalized(api.name),
    image: typeof api.imageUrl === "string" ? api.imageUrl : "",
  };
}

export function mapApiCustomer(api: ApiCustomerIdentity): User {
  return {
    id: api.id,
    name: typeof api.name === "string" ? api.name : "",
    email: typeof api.email === "string" ? api.email : "",
    ...(typeof api.phone === "string" ? { phone: api.phone } : {}),
  };
}

export function mapApiProfile(api: ApiCustomerProfile): User {
  return mapApiCustomer(api);
}

const ADDRESS_LABEL: Localized = { ar: "العنوان", en: "Address" };

export function mapApiAddress(api: ApiAddress, recipient = ""): Address {
  const city = typeof api.city === "string" ? api.city : "";
  const parts = [api.district, api.street, api.details].filter(
    (part): part is string => typeof part === "string" && part.trim().length > 0,
  );
  const line = parts.join("، ");
  return {
    id: api.id,
    label: ADDRESS_LABEL,
    recipient,
    city: toLocalized(city),
    line: toLocalized(line),
    isDefault: Boolean(api.isDefault),
  };
}

function optionLabel(options: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = options?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function mapApiCartItem(item: ApiCartItem): CartItem {
  // `options` contains display labels per the docs, NOT stable variation ids.
  const options = item.options && typeof item.options === "object" ? item.options : null;
  const colorName = optionLabel(options, "color");
  const sizeLabel = optionLabel(options, "size");
  const productId = remoteProductIdToLocalId(item.productId);
  return {
    id: item.id,
    productId,
    productName: toLocalized(item.name),
    // Not documented: leave ids null, keep only the human-readable snapshots.
    colorId: null,
    sizeId: null,
    colorName: colorName ? toLocalized(colorName) : null,
    sizeLabel,
    quantity: Number.isFinite(item.quantity) ? Math.max(0, Math.round(item.quantity)) : 0,
    variationId: `api:${item.id}`,
    sku: "",
    unitPrice: parseApiAmount(item.unitPrice),
    image: typeof item.image === "string" ? item.image : "",
    stock: null,
  };
}

export function mapApiCart(cart: ApiCart): CartItem[] {
  return (Array.isArray(cart.items) ? cart.items : []).map(mapApiCartItem);
}

export function mapApiOrderStatus(status: ApiOrderStatus | null | undefined): OrderStatus {
  switch (status) {
    case "SHIPPED":
      return "shipped";
    case "DELIVERED":
      return "delivered";
    case "CANCELLED":
    case "REFUNDED":
      return "cancelled";
    case "PENDING":
    case "CONFIRMED":
    case "PROCESSING":
    default:
      return "processing";
  }
}

export function mapApiOrder(api: ApiOrder): Order {
  const total = parseApiAmount(api.total);
  const lines: OrderLine[] = (Array.isArray(api.items) ? api.items : []).map((item) => {
    const options = item.options && typeof item.options === "object" ? item.options : null;
    const colorName = optionLabel(options, "color");
    const sizeLabel = optionLabel(options, "size");
    return {
      // Product id is not present in documented order items.
      productId: 0,
      name: toLocalized(item.name),
      image: "",
      ...(colorName ? { colorName: toLocalized(colorName) } : {}),
      ...(sizeLabel ? { sizeLabel } : {}),
      quantity: typeof item.quantity === "number" ? item.quantity : 0,
      unitPrice: parseApiAmount(item.unitPrice),
    };
  });
  return {
    id: api.id,
    remoteId: api.id,
    ...(typeof api.referenceId === "string" ? { referenceId: api.referenceId } : {}),
    // No createdAt in a failed/malformed response: use a neutral epoch, never "now".
    createdAt: typeof api.createdAt === "string" ? api.createdAt : "1970-01-01T00:00:00.000Z",
    status: mapApiOrderStatus(api.status),
    lines,
    // The API provides only a grand total; no documented fee/discount breakdown.
    subtotal: total,
    deliveryFee: 0,
    discount: 0,
    total,
    currencyAtCheckout: toCurrency(api.currency),
    isDemo: false,
    ...(api.paymentMethod === "cod" ? { paymentMethod: "cod" as const } : {}),
  };
}

export function mapApiStoreConfig(api: ApiStoreConfig): StoreConfigSnapshot {
  return {
    storeId: api.storeId,
    name: typeof api.appName === "string" && api.appName ? api.appName : "",
    ...(typeof api.logoUrl === "string" && api.logoUrl ? { logo: api.logoUrl } : {}),
    ...(typeof api.primaryColor === "string" ? { primaryColor: api.primaryColor } : {}),
    ...(typeof api.secondaryColor === "string" ? { secondaryColor: api.secondaryColor } : {}),
    currency: toCurrency(api.currency),
  };
}
