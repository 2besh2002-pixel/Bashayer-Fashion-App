/**
 * Product filtering by real catalog data.
 *
 * Supports: main category, subcategory, price range (using the variation
 * price resolution so color-specific prices are respected), available colors,
 * available sizes, product availability and discounts.
 */

import type { Product } from "@/src/types";
import { resolveVariation } from "@/src/utils/productVariants";

export interface ProductFilter {
  categoryId?: string | null;
  subcategoryId?: string | null;
  /** Inclusive minimum price (product-level range must reach it). */
  priceMin?: number | null;
  /** Inclusive maximum price (product-level range must reach it). */
  priceMax?: number | null;
  /** Require at least one of these available colors. */
  availableColors?: string[] | null;
  /** Require at least one of these available sizes. */
  availableSizes?: string[] | null;
  /** Only show products that are available to add to the cart. */
  inStock?: boolean | null;
  /** Only show products that have a discount configured. */
  hasDiscount?: boolean | null;
}

/** All prices a product can be sold at: base + color + size overrides + variations. */
export function productPriceRange(product: Product): { min: number; max: number } {
  const prices = availableColorSizeCombos(product).map(({ colorId, sizeId }) =>
    resolveVariation(product, colorId, sizeId).price,
  );
  if (prices.length === 0) prices.push(product.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { min, max };
}

/** Colors that are selectable (available) for a product. */
export function availableColorIds(product: Product): string[] {
  return Array.from(
    new Set(
      availableColorSizeCombos(product)
        .map((combo) => combo.colorId)
        .filter((id): id is string => id != null),
    ),
  );
}

/** A (color, size) pair the product offers. */
export interface AvailableColorSize {
  /** Color offering the size; null for product-level sizes (colorless products). */
  colorId: string | null;
  sizeId: string | null;
}

/**
 * (color, size) pairs the product offers. A size counts as available only on
 * the color that actually lists it as available — filtering for (White, S)
 * must not match a product that offers S on some other color. Products
 * without colors contribute `null`-color combos through product-level sizes.
 */
export function availableColorSizeCombos(product: Product): AvailableColorSize[] {
  const combos: AvailableColorSize[] = [];
  const colors = product.colors.length ? product.colors.map((color) => color.id) : [null];
  for (const colorId of colors) {
    const sizes = colorId
      ? product.colors.find((color) => color.id === colorId)?.sizes ?? []
      : product.sizes ?? [];
    const sizeIds = sizes.length ? sizes.map((size) => size.id) : [null];
    for (const sizeId of sizeIds) {
      if (resolveVariation(product, colorId, sizeId).isAvailable) {
        combos.push({ colorId, sizeId });
      }
    }
  }
  return combos;
}

/** Sizes that are available (any color, or product level) for a product. */
export function availableSizeIds(product: Product): string[] {
  const ids: string[] = [];
  for (const combo of availableColorSizeCombos(product)) {
    if (combo.sizeId != null) ids.push(combo.sizeId);
  }
  return Array.from(new Set(ids));
}

/** Whether any combination of the product is available (unknown stock counts). */
export function productIsAvailable(product: Product): boolean {
  return availableColorSizeCombos(product).length > 0;
}

/** Whether the product or any of its variations carries a configured discount. */
export function productHasDiscount(product: Product): boolean {
  if (product.compareAt != null && product.compareAt > product.price) return true;
  return availableColorSizeCombos(product).some(({ colorId, sizeId }) => {
    const resolved = resolveVariation(product, colorId, sizeId);
    return resolved.compareAt != null && resolved.compareAt > resolved.price;
  });
}

export function filterProducts(products: Product[], filter: ProductFilter): Product[] {
  const { priceMin, priceMax, availableColors, availableSizes, inStock, hasDiscount } = filter;
  return products.filter((product) => {
    if (filter.categoryId && product.categoryId !== filter.categoryId) return false;
    if (filter.subcategoryId && product.subcategoryId !== filter.subcategoryId) return false;

    const range = productPriceRange(product);
    if (priceMin != null && range.min < priceMin) return false;
    if (priceMax != null && range.max > priceMax) return false;

    const hasColorFilter = availableColors != null && availableColors.length > 0;
    const hasSizeFilter = availableSizes != null && availableSizes.length > 0;

    if (hasColorFilter && hasSizeFilter) {
      // Color + size together: the product must offer the exact combination.
      const combos = availableColorSizeCombos(product);
      const hit = combos.some(
        (combo) =>
          combo.colorId != null &&
          availableColors.includes(combo.colorId) &&
          combo.sizeId != null &&
          availableSizes.includes(combo.sizeId),
      );
      if (!hit) return false;
    } else {
      if (hasColorFilter) {
        const ids = availableColorIds(product);
        if (!availableColors.some((id) => ids.includes(id))) return false;
      }
      if (hasSizeFilter) {
        const ids = availableSizeIds(product);
        if (!availableSizes.some((id) => ids.includes(id))) return false;
      }
    }
    if (inStock && !productIsAvailable(product)) return false;
    if (hasDiscount && !productHasDiscount(product)) return false;

    return true;
  });
}

/** Base price used for price-based sorting on product cards. */
export function productBasePrice(product: Product): number {
  return resolveVariation(product, null, null).price;
}
