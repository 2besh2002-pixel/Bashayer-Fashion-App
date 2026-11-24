/**
 * Prepared API implementations for profile, addresses, cart, orders and config.
 * Only reached when EXPO_PUBLIC_DATA_SOURCE=api. All paths/fields come from
 * API.md; no wishlist or shipping/payment-method endpoints are invented.
 */

import type {
  CartItem,
  Order,
  StoreConfigSnapshot,
  User,
} from "@/src/types";
import type {
  AddressRepository,
  CartRepository,
  OrderRepository,
  ProfileRepository,
  StoreConfigRepository,
} from "@/src/repositories/types";
import { apiClient } from "@/src/api/client";
import { API_PATHS } from "@/src/api/endpoints";
import { ApiError } from "@/src/api/errors";
import {
  mapApiAddress,
  mapApiCart,
  mapApiOrder,
  mapApiProfile,
  mapApiStoreConfig,
  resolveRemoteProductId,
} from "@/src/api/mappers";
import type {
  ApiAddress,
  ApiCart,
  ApiCreateAddressRequest,
  ApiCreateOrderRequest,
  ApiCustomerProfile,
  ApiOrder,
  ApiStoreConfig,
  ApiUpdateProfileRequest,
} from "@/src/api/types";
import { pick } from "@/src/utils/format";
import { currentStoreId } from "@/src/repositories/apiShared";

function requireData<T>(value: T | undefined): T {
  if (value === undefined || value === null) {
    throw new ApiError("The service returned an unexpected response.", 0, "invalid-response");
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isApiAddress(value: unknown): value is ApiAddress {
  return isRecord(value) && typeof value.id === "string";
}

function isApiOrder(value: unknown): value is ApiOrder {
  return isRecord(value) && typeof value.id === "string";
}

function isApiCart(value: unknown): value is ApiCart {
  if (!isRecord(value)) return false;
  const items = value.items;
  return (
    items === undefined ||
    items === null ||
    (Array.isArray(items) &&
      items.every(
        (item) =>
          isRecord(item) && typeof item.id === "string" && typeof item.productId === "string",
      ))
  );
}

export const apiProfileRepository: ProfileRepository = {
  async get(): Promise<User | null> {
    const profile = await apiClient.get<ApiCustomerProfile>(API_PATHS.profile.me(currentStoreId()));
    if (!profile || typeof profile.id !== "string" || !profile.id) {
      throw new ApiError("The service returned an unexpected response.", 0, "invalid-response");
    }
    return mapApiProfile(profile);
  },
  async update(input: { name?: string; email?: string }): Promise<User | null> {
    const body: ApiUpdateProfileRequest = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
    };
    const updated = requireData(
      await apiClient.put<ApiCustomerProfile>(API_PATHS.profile.me(currentStoreId()), body),
    );
    if (typeof updated.id !== "string" || !updated.id) {
      throw new ApiError("The service returned an unexpected response.", 0, "invalid-response");
    }
    return mapApiProfile(updated);
  },
};

export const apiAddressRepository: AddressRepository = {
  async list() {
    const addresses = await apiClient.get<ApiAddress[]>(
      API_PATHS.profile.addresses(currentStoreId()),
    );
    if (!Array.isArray(addresses) || addresses.some((address) => !isApiAddress(address))) {
      throw new ApiError("The service returned an unexpected response.", 0, "invalid-response");
    }
    // Recipient is not in the documented address shape; use the profile name.
    let recipient = "";
    try {
      recipient = (await apiProfileRepository.get())?.name ?? "";
    } catch {
      // Addresses remain usable without a profile name.
    }
    return addresses.map((address) => mapApiAddress(address, recipient));
  },

  async add(address) {
    const body: ApiCreateAddressRequest = {
      city: pick(address.city, "ar") || pick(address.city, "en"),
      details: pick(address.line, "ar") || pick(address.line, "en"),
      isDefault: Boolean(address.isDefault),
    };
    // API.md does not document the POST response shape, so do not assume one.
    await apiClient.post<ApiAddress | ApiAddress[] | undefined>(
      API_PATHS.profile.addresses(currentStoreId()),
      body,
    );
    return this.list();
  },
};

export const apiCartRepository: CartRepository = {
  async get(): Promise<CartItem[]> {
    const cart = await apiClient.get<ApiCart>(API_PATHS.cart.root(currentStoreId()));
    const data = requireData(cart);
    if (!isApiCart(data)) {
      throw new ApiError("The service returned an unexpected response.", 0, "invalid-response");
    }
    return mapApiCart(data);
  },
  async add(productId, quantity, options): Promise<CartItem[]> {
    const cart = await apiClient.post<ApiCart>(API_PATHS.cart.items(currentStoreId()), {
      productId: /^\d+$/.test(productId) ? resolveRemoteProductId(Number(productId)) : productId,
      quantity,
      ...(options ? { options } : {}),
    });
    const data = requireData(cart);
    if (!isApiCart(data)) {
      throw new ApiError("The service returned an unexpected response.", 0, "invalid-response");
    }
    return mapApiCart(data);
  },
  async setQuantity(itemId, quantity): Promise<CartItem[]> {
    const cart = await apiClient.put<ApiCart>(
      API_PATHS.cart.item(currentStoreId(), itemId),
      { quantity },
    );
    const data = requireData(cart);
    if (!isApiCart(data)) {
      throw new ApiError("The service returned an unexpected response.", 0, "invalid-response");
    }
    return mapApiCart(data);
  },
  async remove(itemId): Promise<CartItem[]> {
    const cart = await apiClient.delete<ApiCart>(API_PATHS.cart.item(currentStoreId(), itemId));
    const data = requireData(cart);
    if (!isApiCart(data)) {
      throw new ApiError("The service returned an unexpected response.", 0, "invalid-response");
    }
    return mapApiCart(data);
  },
  async clear(): Promise<CartItem[]> {
    await apiClient.delete(API_PATHS.cart.root(currentStoreId()));
    return [];
  },
};

export const apiOrderRepository: OrderRepository = {
  async list(): Promise<Order[]> {
    const orders = await apiClient.get<ApiOrder[]>(API_PATHS.orders.root(currentStoreId()));
    if (!Array.isArray(orders) || orders.some((order) => !isApiOrder(order))) {
      throw new ApiError("The service returned an unexpected response.", 0, "invalid-response");
    }
    return orders.map(mapApiOrder);
  },
  async get(id): Promise<Order | undefined> {
    try {
      const order = await apiClient.get<ApiOrder>(API_PATHS.orders.detail(currentStoreId(), id));
      if (!isApiOrder(order)) {
        throw new ApiError("The service returned an unexpected response.", 0, "invalid-response");
      }
      return mapApiOrder(order);
    } catch (error) {
      if (error instanceof ApiError && error.isNotFound) return undefined;
      throw error;
    }
  },
  async create(order): Promise<Order> {
    // All fields are optional per the docs. Only "cod" is documented; "card"
    // is omitted until the backend confirms its value.
    const body: ApiCreateOrderRequest = {
      ...(order.addressId ? { addressId: order.addressId } : {}),
      ...(order.paymentMethod === "cod" ? { paymentMethod: "cod" } : {}),
      ...(order.note ? { note: order.note } : {}),
    };
    const created = requireData(
      await apiClient.post<ApiOrder>(API_PATHS.orders.root(currentStoreId()), body),
    );
    return mapApiOrder(created);
  },
};

export const apiStoreConfigRepository: StoreConfigRepository = {
  async get(): Promise<StoreConfigSnapshot> {
    const config = await apiClient.get<ApiStoreConfig>(API_PATHS.config(currentStoreId()));
    const data = requireData(config);
    if (typeof data.storeId !== "string" || !data.storeId) {
      throw new ApiError("The service returned an unexpected response.", 0, "invalid-response");
    }
    return mapApiStoreConfig(data);
  },
};
