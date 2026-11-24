/**
 * Central variation resolution for the product catalog.
 *
 * One place decides, for a given (product, colorId, sizeId) selection:
 *  - the resolved color / size options,
 *  - the exact combination (variation),
 *  - the final unit price with the documented priority:
 *      1. exact variation price
 *      2. size-specific price override (legacy supported level)
 *      3. color-specific price
 *      4. product base price
 *  - original price + discount for the selected combination,
 *  - stock (unknown → null; confirmed zero → 0),
 *  - availability of the combination,
 *  - the images to display (color-specific first, product fallback).
 *
 * UI components must go through this module so every screen stays consistent.
 */

import type { Product, ProductColor, ProductVariation, SizeOption } from "@/src/types";
import { discountPercent, variantLineId } from "@/src/utils/format";

export interface ResolvedVariation {
  /** The selected color, or null when no color applies. */
  color: ProductColor | null;
  /** The selected size within the color, or null. */
  size: SizeOption | null;
  /** Exact color + size combination, or null when incomplete/unavailable. */
  variation: ProductVariation | null;
  /** Unique variation id (`productId:colorId:sizeId`). */
  variationId: string;
  /** SKU for the exact combination. */
  sku: string;
  /** Final unit price in SAR. */
  price: number;
  /** Original price in SAR when discounted, else undefined. */
  compareAt?: number;
  /** Discount percent for the selected combination, else null. */
  discountPercent: number | null;
  /** Discount metadata carried by the selected variation, when supplied. */
  discount?: ProductVariation["discount"];
  /** Whether the exact combination is available to add to the cart. */
  isAvailable: boolean;
  /** Stock for the combination: positive number, 0 when confirmed out of
   * stock, or null when the stock level is unknown. */
  stock: number | null;
  /** Images to show: dedicated color images when present, else product images. */
  images: string[];
  /** The color options of the product (empty when the product has no colors). */
  availableColors: ProductColor[];
  /** The size options of the selected color (or product when colorless). */
  availableSizes: SizeOption[];
  /** True when there is no meaningful size choice to make. */
  isOneSize: boolean;
  /** True when the product has selectable colors. */
  hasColorOptions: boolean;
  /** True when a size choice is relevant for the selected variation. */
  hasSizeOptions: boolean;
}

/** Generate a stable, human-readable SKU for an exact color + size combination. */
export function generateSku(productId: number, colorId: string | null, sizeId: string | null): string {
  const parts = [String(productId)];
  if (colorId) parts.push(colorId);
  if (sizeId) parts.push(sizeId);
  return parts.join("-");
}

/** Find the exact color + size combination data, if any. */
export function findVariation(
  product: Product,
  colorId: string | null,
  sizeId: string | null,
): ProductVariation | null {
  return (
    product.variations?.find(
      (v) => (v.colorId ?? null) === colorId && (v.sizeId ?? null) === sizeId,
    ) ?? null
  );
}

/** Resolve the color option for a product, or null. */
export function getColor(product: Product, colorId: string | null): ProductColor | null {
  if (!colorId) return null;
  return product.colors.find((c) => c.id === colorId) ?? null;
}

/**
 * Resolve the size options relevant for a selection: the selected color's
 * sizes when a color exists, otherwise the product-level sizes.
 */
export function getSizeOptions(product: Product, colorId: string | null): SizeOption[] {
  const color = getColor(product, colorId);
  const sizes = color?.sizes ?? product.sizes ?? [];
  return sizes.map((size) => {
    const variation = findVariation(product, colorId, size.id);
    return variation && (!variation.available || variation.stock === 0)
      ? { ...size, available: false }
      : size;
  });
}

/** Keep a prior selection only when the newly selected color still offers it. */
export function retainAvailableSize(
  product: Product,
  colorId: string | null,
  sizeId: string | null,
): string | null {
  if (!sizeId) return null;
  return getSizeOptions(product, colorId).some((size) => size.id === sizeId && size.available)
    ? sizeId
    : null;
}

/** Restore a requested variant when opening a product, or choose its first available options. */
export function resolveInitialSelection(
  product: Product,
  preferredColorId: string | null = null,
  preferredSizeId: string | null = null,
): { colorId: string | null; sizeId: string | null } {
  const colorId = product.colors.some(
    (color) => color.id === preferredColorId && color.available,
  )
    ? preferredColorId
    : (product.colors.find((color) => color.available)?.id ?? null);
  const sizes = getSizeOptions(product, colorId);
  const sizeId =
    sizes.find((size) => size.id === preferredSizeId && size.available)?.id ??
    sizes.find((size) => size.available)?.id ??
    null;

  return { colorId, sizeId };
}

/**
 * The images to display for a color selection. Never reuse product photos
 * already assigned to a different color as a fallback.
 */
export function resolveVariationImages(product: Product, colorId: string | null): string[] {
  const color = getColor(product, colorId);
  if (!color) return product.images;
  if (color.images.length > 0) return color.images;

  const imagesAssignedToOtherColors = new Set(
    product.colors
      .filter((otherColor) => otherColor.id !== color.id)
      .flatMap((otherColor) => otherColor.images),
  );
  return product.images.filter((image) => !imagesAssignedToOtherColors.has(image));
}

/**
 * The exact stock for a color + size combination, with the priority
 * variation → size → color. Returns null when the stock level is unknown.
 */
export function getVariationStock(
  product: Product,
  colorId: string | null,
  sizeId: string | null,
): number | null {
  return resolveVariation(product, colorId, sizeId).stock;
}

/** True when the exact combination can be added to the cart. */
export function variationIsAvailable(
  product: Product,
  colorId: string | null,
  sizeId: string | null,
): boolean {
  return resolveVariation(product, colorId, sizeId).isAvailable;
}

/**
 * Compute the final unit price for a color + size combination.
 * Priority: exact variation price → size override → color price → base price.
 */
export function computeVariationPrice(
  product: Product,
  colorId: string | null,
  sizeId: string | null,
): number {
  return resolveVariation(product, colorId, sizeId).price;
}

/**
 * Resolve everything about the selected variation in one place:
 * price, original price + discount, stock, availability, and images.
 */
export function resolveVariation(
  product: Product,
  colorId: string | null,
  sizeId: string | null,
): ResolvedVariation {
  const color = getColor(product, colorId);
  const availableColors = product.colors;
  const availableSizes = getSizeOptions(product, colorId);
  // One size means: at most one selectable size — no selection is required.
  const isOneSize = availableSizes.length <= 1;
  const size =
    sizeId != null
      ? availableSizes.find((s) => s.id === sizeId) ?? null
      : isOneSize
        ? (availableSizes[0] ?? null)
        : null;
  const variation =
    hasPendingSizeSelection(availableSizes, sizeId)
      ? null
      : findVariation(product, colorId, size?.id ?? null);

  const hasColorOptions = availableColors.length > 0;
  const hasSizeOptions = availableSizes.length > 0;

  // Availability of the exact combination.
  let isAvailable = true;
  if (hasColorOptions && (!color || !color.available)) isAvailable = false;
  // A selected size that is not part of the resolved size options is invalid.
  if (sizeId != null && !size) isAvailable = false;
  // Multiple sizes exist: a selection is required.
  if (hasSizeOptions && !isOneSize && sizeId == null) isAvailable = false;
  // The resolved size must be available.
  if (size && !size.available) isAvailable = false;
  if (variation && !variation.available) isAvailable = false;

  // Stock resolution (variation → size → color); 0 = confirmed out of stock.
  let stock: number | null = null;
  if (variation?.stock != null) stock = variation.stock;
  else if (size?.stock != null) stock = size.stock;
  else if (color?.stock != null) stock = color.stock;
  if (stock === 0) isAvailable = false;

  // Price resolution (exact combination → size → color → base).
  let price: number;
  if (variation?.price != null) price = variation.price;
  else if (size?.price != null) price = size.price;
  else if (color?.price != null) price = color.price;
  else price = product.price;

  // Original price + discount for the selected combination.
  const compareAt =
    variation?.compareAt ?? size?.compareAt ?? color?.compareAt ?? product.compareAt;
  const discount =
    variation?.discount ?? size?.discount ?? color?.discount;
  const discountPercentValue =
    discount?.percent ?? discountPercent(price, compareAt);

  return {
    color,
    size,
    variation,
    variationId: variation?.id ?? variantLineId(product.id, colorId, size?.id ?? sizeId),
    sku: variation?.sku ?? generateSku(product.id, colorId, size?.id ?? null),
    price,
    compareAt,
    discountPercent: discountPercentValue,
    discount,
    isAvailable,
    stock,
    images: resolveVariationImages(product, colorId),
    availableColors,
    availableSizes,
    isOneSize,
    hasColorOptions,
    hasSizeOptions,
  };
}

function hasPendingSizeSelection(sizes: SizeOption[], sizeId: string | null): boolean {
  return sizes.length > 1 && sizeId == null;
}
