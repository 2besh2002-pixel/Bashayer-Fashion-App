/**
 * Mock implementations for the prepared (not-yet-wired) repository contracts.
 *
 * - Cart: wraps the existing local Zustand cart. The UI keeps using the store
 *   directly so variation selection/pricing never changes. `add` is a no-op
 *   here because adding locally requires a full Product variation object;
 *   nothing in the app calls this mock method today.
 * - Profile: the local demo has no profile repository; the account screen reads
 *   the user from the auth store. Returning null is honest, not a fake profile.
 * - Store config: derives a snapshot from the existing local store-configs file.
 */

import type { StoreConfigSnapshot } from "@/src/types";
import type {
  CartRepository,
  ProfileRepository,
  StoreConfigRepository,
} from "@/src/repositories/types";
import { useCartStore } from "@/src/stores/cartStore";
import { activeStore } from "@/store-configs";

export const mockCartRepository: CartRepository = {
  async get() {
    return useCartStore.getState().items;
  },
  async add() {
    // Local cart additions go through useCartStore.addItem(product, options).
    return useCartStore.getState().items;
  },
  async setQuantity(itemId, quantity) {
    useCartStore.getState().setQuantity(itemId, quantity);
    return useCartStore.getState().items;
  },
  async remove(itemId) {
    useCartStore.getState().remove(itemId);
    return useCartStore.getState().items;
  },
  async clear() {
    useCartStore.getState().clear();
    return [];
  },
};

/** Empty local profile surface: no fabricated customer data. */
export const mockProfileRepository: ProfileRepository = {
  async get() {
    return null;
  },
  async update() {
    return null;
  },
};

export const mockStoreConfigRepository: StoreConfigRepository = {
  async get(): Promise<StoreConfigSnapshot> {
    return {
      storeId: activeStore.id,
      name: activeStore.name,
      primaryColor: activeStore.brand.primary,
      secondaryColor: activeStore.brand.primaryDark,
      currency: activeStore.defaultCurrency,
    };
  },
};
