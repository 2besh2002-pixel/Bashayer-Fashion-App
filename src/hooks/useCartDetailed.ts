import { useMemo } from "react";

import { useCartStore } from "@/src/stores/cartStore";
import { resolveVariation } from "@/src/utils/productVariants";
import type { CartItem, Product } from "@/src/types";

export interface CartLine {
  item: CartItem;
  product: Product;
  /** Unit price in base currency (SAR) — the variation's final price. */
  unitPrice: number;
  /** Line total in base currency (SAR). */
  lineTotal: number;
}

export interface CartDetailed {
  lines: CartLine[];
  /** Sum of line totals in base currency (SAR). */
  subtotalSar: number;
  /** Total quantity across all lines. */
  count: number;
}

/** Unit price of a line: the stored snapshot (new carts), or resolved from the
 * product variation for lines persisted before the variation system. */
export function lineUnitPrice(item: CartItem, product: Product): number {
  return item.unitPrice ?? resolveVariation(product, item.colorId, item.sizeId).price;
}

/**
 * Join cart items with catalogue data and compute base-currency totals.
 * Kept out of components so cart maths is unit-testable and reused by checkout.
 */
export function useCartDetailed(products: Product[]): CartDetailed {
  const items = useCartStore((s) => s.items);
  return useMemo(() => {
    const lines: CartLine[] = [];
    for (const item of items) {
      const product = products.find((candidate) => candidate.id === item.productId);
      if (!product) continue;
      const unitPrice = lineUnitPrice(item, product);
      lines.push({
        item,
        product,
        unitPrice,
        lineTotal: unitPrice * item.quantity,
      });
    }
    const subtotalSar = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const count = lines.reduce((sum, l) => sum + l.item.quantity, 0);
    return { lines, subtotalSar, count };
  }, [items, products]);
}
