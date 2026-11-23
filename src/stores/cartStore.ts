import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { CartItem, Product } from "@/src/types";
import { variantLineId } from "@/src/utils/format";
import { resolveVariation } from "@/src/utils/productVariants";
import { getProductById } from "@/src/data/products";

export const MAX_QUANTITY = 10;
export const MIN_QUANTITY = 1;

export interface AddOptions {
  colorId?: string | null;
  sizeId?: string | null;
  quantity?: number;
}

interface CartState {
  items: CartItem[];
  /** Add a product variant. Same variant increments quantity instead of duplicating. */
  addItem: (product: Product, options?: AddOptions) => boolean;
  increment: (id: string) => void;
  decrement: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  /**
   * Change a line's color/size and recompute its variation data (price,
   * stock, image, SKU, labels). Returns false when the new combination is
   * unavailable and the line is removed from the bag.
   */
  updateVariation: (
    id: string,
    product: Product,
    colorId: string | null,
    sizeId: string | null,
  ) => boolean;
  remove: (id: string) => void;
  clear: () => void;
  /** Merge another cart (used when restoring/merging guest data) with dedupe. */
  merge: (items: CartItem[]) => void;
}

function clampQuantity(q: number, ceiling = MAX_QUANTITY): number {
  return Math.min(ceiling, Math.max(MIN_QUANTITY, Math.round(q)));
}

function addItemToItems(items: CartItem[], item: CartItem, quantity: number): CartItem[] {
  const id = item.id;
  const existing = items.find((i) => i.id === id);
  const stockLimit = item.stock ?? existing?.stock ?? MAX_QUANTITY;
  if (existing) {
    return items.map((i) =>
      i.id === id
        ? { ...i, ...item, quantity: clampQuantity(i.quantity + quantity, stockLimit) }
        : i,
    );
  }
  return [...items, { ...item, quantity: clampQuantity(quantity, stockLimit) }];
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (product, options = {}) => {
        const colorId = options.colorId ?? null;
        const sizeId = options.sizeId ?? null;
        const quantity = clampQuantity(options.quantity ?? 1);
        // Resolve the exact variation once — the line snapshots price, image,
        // color/size labels and SKU so later changes on the details screen
        // never silently mutate an existing cart line.
        const variation = resolveVariation(product, colorId, sizeId);
        if (!variation.isAvailable) return false;
        const stockLimit = variation.stock ?? MAX_QUANTITY;
        const line: CartItem = {
          id: variantLineId(product.id, colorId, sizeId),
          productId: product.id,
          productName: product.name,
          colorId,
          sizeId,
          quantity: clampQuantity(quantity, stockLimit),
          colorName: variation.color?.name ?? null,
          sizeLabel: variation.size?.label ?? null,
          variationId: variation.variationId,
          sku: variation.sku,
          unitPrice: variation.price,
          image: variation.images[0] ?? "",
          compareAt: variation.compareAt,
          discountPercent: variation.discountPercent ?? undefined,
          stock: variation.stock,
          isOneSize: variation.isOneSize || undefined,
        };
        set((state) => ({ items: addItemToItems(state.items, line, quantity) }));
        return true;
      },
      increment: (id) =>
        set((state) => {
          const item = state.items.find((i) => i.id === id);
          if (!item) return {};
          const stock = item.stock ?? null;
          // A confirmed out-of-stock line is removed rather than counted up.
          if (stock === 0) return { items: state.items.filter((i) => i.id !== id) };
          const ceiling = stock ?? MAX_QUANTITY;
          return {
            items: state.items.map((i) =>
              i.id === id ? { ...i, quantity: clampQuantity(Math.min(ceiling, i.quantity + 1)) } : i,
            ),
          };
        }),
      decrement: (id) =>
        set((state) => {
          const item = state.items.find((i) => i.id === id);
          if (!item) return {};
          const stock = item.stock ?? null;
          if (stock === 0) return { items: state.items.filter((i) => i.id !== id) };
          const ceiling = stock ?? MAX_QUANTITY;
          return {
            items: state.items
              .map((i) => {
                if (i.id !== id) return i;
                // Never below the minimum, and never above the stock ceiling.
                const next = Math.min(i.quantity - 1, ceiling);
                return next < MIN_QUANTITY ? { ...i, quantity: MIN_QUANTITY } : { ...i, quantity: next };
              })
              .filter((i) => i.quantity >= MIN_QUANTITY),
          };
        }),
      setQuantity: (id, quantity) =>
        set((state) => {
          const item = state.items.find((i) => i.id === id);
          if (!item) return {};
          const stock = item.stock ?? null;
          if (stock === 0) return { items: state.items.filter((i) => i.id !== id) };
          const ceiling = stock ?? MAX_QUANTITY;
          return {
            items: state.items
              .map((i) => (i.id === id ? { ...i, quantity: clampQuantity(quantity, ceiling) } : i))
              .filter((i) => i.quantity >= MIN_QUANTITY),
          };
        }),
      updateVariation: (id, product, colorId, sizeId) => {
        let updated = false;
        set((state) => {
          const current = state.items.find((item) => item.id === id);
          if (!current) return state;
          if (current.productId !== product.id) return state;
          const variation = resolveVariation(product, colorId, sizeId);
          if (!variation.isAvailable) {
            return { items: state.items.filter((item) => item.id !== id) };
          }
          const next: CartItem = {
            ...current,
            id: variantLineId(product.id, colorId, sizeId),
            colorId,
            sizeId,
            productName: product.name,
            colorName: variation.color?.name ?? null,
            sizeLabel: variation.size?.label ?? null,
            variationId: variation.variationId,
            sku: variation.sku,
            unitPrice: variation.price,
            image: variation.images[0] ?? "",
            compareAt: variation.compareAt,
            discountPercent: variation.discountPercent ?? undefined,
            stock: variation.stock,
            isOneSize: variation.isOneSize || undefined,
            quantity: clampQuantity(current.quantity, variation.stock ?? MAX_QUANTITY),
          };
          const remaining = state.items.filter((item) => item.id !== id);
          const existing = remaining.find((item) => item.id === next.id);
          if (existing) {
            // The same variation is already in the bag: merge the quantities
            // (the moved line's quantity is not lost) and refresh the data.
            updated = true;
            const merged: CartItem = {
              ...existing,
              ...next,
              quantity: clampQuantity(existing.quantity + current.quantity, variation.stock ?? MAX_QUANTITY),
            };
            return { items: remaining.map((item) => (item.id === next.id ? merged : item)) };
          }
          updated = true;
          return { items: [...remaining, next] };
        });
        return updated;
      },
      remove: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
      merge: (incoming) =>
        set((state) => {
          const map = new Map(state.items.map((i) => [i.id, i]));
          for (const item of incoming) {
            const existing = map.get(item.id);
            if (existing) {
              map.set(item.id, {
                ...existing,
                quantity: clampQuantity(
                  existing.quantity + item.quantity,
                  existing.stock ?? item.stock ?? MAX_QUANTITY,
                ),
              });
            } else {
              map.set(item.id, {
                ...item,
                quantity: clampQuantity(item.quantity, item.stock ?? MAX_QUANTITY),
              });
            }
          }
          return { items: Array.from(map.values()) };
        }),
    }),
    {
      name: "naseej:cart",
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      /** Fill in the variation snapshot fields for carts persisted before
       * the variation system (v1 items lack unitPrice/sku/image/etc.). */
      migrate: (persistedState: unknown) => {
        if (
          !persistedState ||
          typeof persistedState !== "object" ||
          !("items" in persistedState) ||
          !Array.isArray(persistedState.items)
        ) {
          return persistedState as CartState;
        }
        const items = persistedState.items.map((item: CartItem) => {
          const product = getProductById(item.productId);
          if (!product) return item;
          const resolved = resolveVariation(product, item.colorId, item.sizeId);
          return {
            ...item,
            productName: item.productName ?? product.name,
            colorName: item.colorName ?? resolved.color?.name,
            sizeLabel: item.sizeLabel ?? resolved.size?.label,
            variationId: item.variationId ?? resolved.variationId,
            sku: item.sku ?? resolved.sku,
            unitPrice: item.unitPrice ?? resolved.price,
            image: item.image || resolved.images[0] || "",
            compareAt: item.compareAt ?? resolved.compareAt,
            discountPercent: item.discountPercent ?? resolved.discountPercent ?? undefined,
            stock: item.stock ?? resolved.stock,
            isOneSize: item.isOneSize ?? (resolved.isOneSize || undefined),
          };
        });
        return { ...persistedState, items } as CartState;
      },
    },
  ),
);

/** Selector helpers kept outside the store so components subscribe narrowly. */
export const selectCartCount = (state: CartState) =>
  state.items.reduce((sum, i) => sum + i.quantity, 0);
