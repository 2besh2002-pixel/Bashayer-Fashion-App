/**
 * Shared domain models.
 *
 * Prices are always stored in the store base currency (SAR). Conversion to the
 * customer's selected currency happens at the presentation layer through the
 * centralized currency utility (see src/utils/currency.ts). These interfaces are
 * intentionally shaped so they can later map 1:1 to real backend / Middleware
 * API responses without touching the screens.
 */

export type Lang = "ar" | "en";

export type CurrencyCode = "SAR" | "AED" | "USD" | "EUR" | "GBP";

export type Localized<T = string> = Record<Lang, T>;

export interface DiscountInfo {
  /** Percentage off when known (e.g. `19` means 19%). */
  percent?: number;
  /** Absolute discount in SAR when known. */
  amount?: number;
}

export interface SizeOption {
  id: string;
  label: string;
  available: boolean;
  /** Stock quantity when known; omit when unknown. */
  stock?: number;
  /** Optional size-specific price override in SAR. */
  price?: number;
  /** Optional original price in SAR at this level. */
  compareAt?: number;
  /** Optional discount metadata configured specifically for this size. */
  discount?: DiscountInfo;
}

export interface ProductColor {
  id: string;
  name: Localized;
  /** Hex value used to render the colour swatch. */
  hex: string;
  /** Swatch may be shown but disabled when the variant is unavailable. */
  available: boolean;
  /** Color-specific base price in SAR; falls back to the product base price. */
  price?: number;
  /** Original price in SAR when discounted at this level. */
  compareAt?: number;
  /** Discount info configured for this color level, if any. */
  discount?: DiscountInfo;
  /** Color-specific stock when not using per-size stock; omit when unknown. */
  stock?: number;
  /** Dedicated images for this color. Empty → product-level images are used. */
  images: string[];
  /** Available sizes for this color. */
  sizes: SizeOption[];
}

export interface ProductVariation {
  /** Unique variation id: `${productId}:${colorId}:${sizeId}`. */
  id: string;
  /** Color this variation belongs to, or null for a product without colors. */
  colorId: string | null;
  /** Size within the color; omit for one-size variations. */
  sizeId?: string;
  /** SKU for the exact color + size combination. */
  sku: string;
  /** Exact combination-specific price in SAR (highest priority). */
  price?: number;
  /** Original price in SAR at this level. */
  compareAt?: number;
  /** Discount info for this exact combination, if configured. */
  discount?: DiscountInfo;
  /** Stock for this exact combination; omit when unknown. */
  stock?: number;
  /** Availability of this exact combination. */
  available: boolean;
}

export interface ProductMeasurementRow {
  size: string;
  /** Measurements are always stored in centimetres. */
  bust: number;
  waist: number;
  hips: number;
  length: number;
}

export interface Product {
  id: number;
  slug: string;
  name: Localized;
  /** Base price in SAR; used when no color/size override applies. */
  price: number;
  /** Original price in SAR when discounted. */
  compareAt?: number;
  /** Brand, when available. */
  brand?: Localized;
  rating: number;
  reviewCount: number;
  /** Product-level fallback images (used when a color has no dedicated images). */
  images: string[];
  /** Main category id (e.g. "women", "men", "kids"). */
  categoryId: string;
  /** Subcategory id within the main category (e.g. "dresses"). */
  subcategoryId?: string;
  badge?: Localized;
  description: Localized;
  /** Color options. Empty for products without selectable colors. */
  colors: ProductColor[];
  /** Optional overview sizes for products without color-specific sizes. */
  sizes?: SizeOption[];
  /** Exact color + size combinations; derived from colors/sizes when omitted. */
  variations?: ProductVariation[];
  /** Optional size guide shown as readable text, never baked into an image. */
  measurements?: ProductMeasurementRow[];
  /** Free-text material/care note shown only when provided by real data. */
  materialNote?: Localized;
}

export interface Category {
  id: string;
  name: Localized;
  image: string;
}

export interface SubCategory {
  id: string;
  name: Localized;
}

export interface MainCategory extends Category {
  /** Subcategories browsing within this main category. */
  subcategories: SubCategory[];
}

/** A single line in the shopping bag. Different variants are distinct lines. */
export interface CartItem {
  /** Stable identity for the variant line: `${productId}:${colorId}:${sizeId}`. */
  id: string;
  productId: number;
  /** Snapshot of the product's localized name at add time. */
  productName?: Localized;
  colorId: string | null;
  /** Snapshot of the selected color name at add time. */
  colorName?: Localized | null;
  sizeId: string | null;
  /** Snapshot of the selected size label at add time. */
  sizeLabel?: string | null;
  quantity: number;
  /** Exact variation id (`productId:colorId:sizeId`), stable identity of the line. */
  variationId: string;
  /** Snapshot of the exact combination's SKU at add time. */
  sku: string;
  /** Final calculated unit price (SAR) at add time — later changes on the
   * details screen must not silently mutate an existing cart line. */
  unitPrice: number;
  /** Snapshot of the variation's display image at add time. */
  image: string;
  /** Snapshot of the original price (SAR) at add time, when configured. */
  compareAt?: number;
  /** Snapshot of the discount percent at add time, when configured. */
  discountPercent?: number;
  /** Stock snapshot for this exact variation; null means unknown. */
  stock?: number | null;
  /** Snapshot of the variation-specific data flags at add time. */
  isOneSize?: boolean;
}

export interface WishlistEntry {
  productId: number;
  addedAt: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  /** Optional full phone number (dial code + digits) for local demo accounts. */
  phone?: string;
  /** Optional dial code, e.g. "+966". */
  countryCode?: string;
}

export interface Address {
  id: string;
  label: Localized;
  recipient: string;
  city: Localized;
  line: Localized;
  isDefault: boolean;
}

export type OrderStatus =
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface OrderLine {
  productId: number;
  name: Localized;
  image: string;
  colorName?: Localized;
  sizeLabel?: string;
  quantity: number;
  /** Unit price in SAR. */
  unitPrice: number;
}

export interface Order {
  id: string;
  /** ISO date string. */
  createdAt: string;
  status: OrderStatus;
  lines: OrderLine[];
  /** Totals in SAR. */
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  currencyAtCheckout: CurrencyCode;
  /** Clearly marks locally generated demo orders. */
  isDemo: boolean;
}

export interface Notification {
  id: string;
  icon: "box" | "heart" | "bell";
  title: Localized;
  body: Localized;
  time: Localized;
  read: boolean;
}

export interface CurrencyDefinition {
  code: CurrencyCode;
  /** Symbol used for display. */
  symbol: string;
  name: Localized;
  /** Units of this currency per 1 SAR (local demonstration rates). */
  perSar: number;
}