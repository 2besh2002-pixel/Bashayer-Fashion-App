/**
 * Documented Middleware endpoint paths — SOURCE: API.md.
 *
 * Every route starts with `/v1/store/:storeId`. No path in this file is
 * invented: only endpoints present in API.md are listed. Wishlist, shipping
 * methods, currency rates and a generic /auth/login are deliberately absent
 * because the documentation does not define them.
 *
 * The Store ID is supplied at call time from environment configuration; it is
 * never hardcoded here.
 */

function store(storeId: string): string {
  if (!storeId) {
    // Guard against a request to a made-up store path.
    throw new Error("Store ID is not configured");
  }
  return `/v1/store/${encodeURIComponent(storeId)}`;
}

export const API_PATHS = {
  config: (storeId: string) => `${store(storeId)}/config`,

  auth: {
    requestOtp: (storeId: string) => `${store(storeId)}/auth/otp/request`,
    verifyOtp: (storeId: string) => `${store(storeId)}/auth/otp/verify`,
  },

  catalog: {
    categories: (storeId: string) => `${store(storeId)}/categories`,
    products: (storeId: string) => `${store(storeId)}/products`,
    product: (storeId: string, productId: string) =>
      `${store(storeId)}/products/${encodeURIComponent(productId)}`,
  },

  profile: {
    me: (storeId: string) => `${store(storeId)}/me`,
    addresses: (storeId: string) => `${store(storeId)}/me/addresses`,
  },

  cart: {
    root: (storeId: string) => `${store(storeId)}/cart`,
    items: (storeId: string) => `${store(storeId)}/cart/items`,
    item: (storeId: string, itemId: string) =>
      `${store(storeId)}/cart/items/${encodeURIComponent(itemId)}`,
  },

  orders: {
    root: (storeId: string) => `${store(storeId)}/orders`,
    detail: (storeId: string, orderId: string) =>
      `${store(storeId)}/orders/${encodeURIComponent(orderId)}`,
  },
} as const;

/** Backwards-compatible alias for older imports. */
export const ENDPOINTS = API_PATHS;
