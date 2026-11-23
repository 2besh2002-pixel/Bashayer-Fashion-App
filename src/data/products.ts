/**
 * Catalogue data.
 *
 * The catalog is data-driven: every product carries its main category
 * (`categoryId`), subcategory (`subcategoryId`) and full variation
 * configuration (colors with dedicated images + sizes, optional
 * color/size/combination-specific prices, stocks and SKUs).
 *
 * Mapped image assets (verified by pixel sampling) stay in
 * `assets/images/`; `src/data/images.ts` re-exports them.
 */

import type { Product, SizeOption } from "@/src/types";
import {
  BURGUNDY_PLATEAU_DRESS,
  BURGENDY_LINEN_DRESS,
  GREY_DRESS,
  LINEN_GRAY_DRESS,
} from "@/src/data/images";

// ---- Size sets (shared per product) ----

const CLOTHING_SIZES = (soldOut: string[] = []) =>
  ["XS", "S", "M", "L", "XL", "XXL"].map((label) => ({
    id: label.toLowerCase(),
    label,
    available: !soldOut.includes(label),
  }));

const PRODUCT1_SIZES: SizeOption[] = ["XS", "S", "M", "L", "XL", "XXL"].map((label) => ({
  id: label.toLowerCase(),
  label,
  available: label !== "XS", // XS out of stock on Product 1
}));
const PRODUCT3_SIZES: SizeOption[] = CLOTHING_SIZES(["XS", "XXL"]);
const PRODUCT5_SIZES: SizeOption[] = CLOTHING_SIZES(["XXL"]);
const PRODUCT5_IVORY_SIZES: SizeOption[] = ["S", "M", "L"].map((label) => ({
  id: label.toLowerCase(),
  label,
  available: true,
}));
const PRODUCT8_SIZES: SizeOption[] = CLOTHING_SIZES(["XS"]);
const PRODUCT10_SIZES: SizeOption[] = CLOTHING_SIZES(["XXL"]);
const PRODUCT11_SIZES: SizeOption[] = CLOTHING_SIZES(["XS", "XXL"]);
const ONE_SIZE: SizeOption[] = [{ id: "os", label: "O/S", available: true }];
const SHOE_SIZES_36: SizeOption[] = [{ id: "36", label: "36", available: true }];
const SHOE_SIZES_41: SizeOption[] = [{ id: "41", label: "41", available: true }];

// ---- Color swatches ----

const BURGUNDY = { id: "burgundy", name: { ar: "عنابي", en: "Burgundy" }, hex: "#632c36", available: true };
const IVORY = { id: "ivory", name: { ar: "عاجي", en: "Ivory" }, hex: "#e7dfd0", available: true };
const CHARCOAL = { id: "charcoal", name: { ar: "فحمي", en: "Charcoal" }, hex: "#1f2930", available: false };
const TAN = { id: "tan", name: { ar: "بيج", en: "Tan" }, hex: "#c8a97e", available: true };
const BLACK = { id: "black", name: { ar: "أسود", en: "Black" }, hex: "#1c1c1c", available: true };
/**
 * New "Gray" color on Product 1. Added because the product's main image is
 * the gray dress (verified: the image shows only gray/white tones, no red or
 * maroon — see report). Product 1 previously had no gray option; the color
 * carries the verified image and falls back to the base price / unknown stock.
 */
const GRAY = { id: "gray", name: { ar: "رمادي", en: "Gray" }, hex: "#b2b4b0", available: true };

// ---- Products (migrated to the variation-aware structure) ----

export const PRODUCTS: Product[] = [
  {
    id: 1,
    slug: "laurene-pleated-dress",
    name: { ar: "فستان لورين بطيات ناعمة", en: "Laurène Pleated Dress" },
    price: 429,
    compareAt: 520,
    rating: 4.8,
    reviewCount: 164,
    images: [GREY_DRESS, BURGUNDY_PLATEAU_DRESS],
    categoryId: "women",
    subcategoryId: "dresses",
    badge: { ar: "حصري", en: "Exclusive" },
    description: {
      ar: "فستان متوسط الطول بطيّات ناعمة وقصّة انسيابية، مناسب لإطلالات الموسم.",
      en: "A midi dress with soft pleats and a fluid silhouette, made for the season.",
    },
    colors: [
      { ...BURGUNDY, images: [BURGUNDY_PLATEAU_DRESS], sizes: PRODUCT1_SIZES },
      { ...IVORY, price: 449, images: [], sizes: PRODUCT1_SIZES },
      { ...CHARCOAL, images: [], sizes: PRODUCT1_SIZES },
      { ...GRAY, price: 399, images: [GREY_DRESS], sizes: PRODUCT1_SIZES },
    ],
    variations: [
      {
        id: "dress-1-burgundy-m",
        colorId: "burgundy",
        sizeId: "m",
        sku: "NSJ-DRESS1-BURG-M",
        price: 439,
        compareAt: 520,
        stock: 3,
        available: true,
      },
      {
        id: "dress-1-burgundy-l",
        colorId: "burgundy",
        sizeId: "l",
        sku: "NSJ-DRESS1-BURG-L",
        stock: 0,
        available: false,
      },
    ],
    measurements: [
      { size: "S", bust: 84, waist: 68, hips: 92, length: 136 },
      { size: "M", bust: 89, waist: 73, hips: 97, length: 137 },
      { size: "L", bust: 95, waist: 79, hips: 103, length: 138 },
      { size: "XL", bust: 101, waist: 85, hips: 109, length: 139 },
    ],
    materialNote: {
      ar: "خامة: خليط بوليستر ناعم. العناية: غسيل دقيق بماء بارد.",
      en: "Material: soft polyester blend. Care: gentle cold wash.",
    },
  },
  {
    id: 2,
    slug: "cali-leather-bag",
    name: { ar: "حقيبة كالي الجلدية", en: "Cali Leather Bag" },
    price: 315,
    rating: 4.7,
    reviewCount: 92,
    images: [
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=700&q=85",
    ],
    categoryId: "women",
    subcategoryId: "bags",
    badge: { ar: "جديد", en: "New" },
    description: {
      ar: "حقيبة كتف جلدية بمساحة عملية وتفاصيل معدنية هادئة.",
      en: "A leather shoulder bag with practical space and understated hardware.",
    },
    colors: [
      { ...TAN, price: 315, stock: 4, images: [], sizes: [] },
      { ...BLACK, price: 335, stock: 2, images: [], sizes: [] },
    ],
    variations: [
      {
        id: "bag-2-tan",
        colorId: "tan",
        sku: "NSJ-BAG2-TAN",
        stock: 4,
        available: true,
      },
      {
        id: "bag-2-black",
        colorId: "black",
        sku: "NSJ-BAG2-BLK",
        stock: 2,
        available: true,
      },
    ],
  },
  {
    id: 3,
    slug: "tailored-wool-coat",
    name: { ar: "معطف صوف بقصة مستقيمة", en: "Tailored Wool Coat" },
    price: 690,
    compareAt: 820,
    rating: 4.9,
    reviewCount: 211,
    images: [
      "https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?auto=format&fit=crop&w=700&q=85",
    ],
    categoryId: "women",
    subcategoryId: "jackets",
    badge: { ar: "الأكثر مبيعاً", en: "Best seller" },
    description: {
      ar: "معطف صوف بقصّة مستقيمة ولمسة نهائية أنيقة.",
      en: "A wool coat with a straight cut and a refined finish.",
    },
    colors: [
      { ...IVORY, images: [], sizes: PRODUCT3_SIZES },
      { ...CHARCOAL, images: [], sizes: PRODUCT3_SIZES },
    ],
  },
  {
    id: 4,
    slug: "sculpted-leather-heel",
    name: { ar: "حذاء جلدي بكعب منحوت", en: "Sculpted Leather Heel" },
    price: 380,
    rating: 4.6,
    reviewCount: 58,
    images: [
      "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=700&q=85",
    ],
    categoryId: "women",
    subcategoryId: "shoes",
    badge: { ar: "وصل حديثاً", en: "Just in" },
    description: {
      ar: "حذاء بكعب منحوت وخطوط نظيفة لإطلالة مسائية.",
      en: "A sculpted heel with clean lines for evening looks.",
    },
    colors: [
      { ...BURGUNDY, images: [], sizes: SHOE_SIZES_36 },
      { ...BLACK, images: [], sizes: SHOE_SIZES_36 },
    ],
  },
  {
    id: 5,
    slug: "linen-midi-dress",
    name: { ar: "فستان كتان ميدي", en: "Linen Midi Dress" },
    price: 350,
    rating: 4.5,
    reviewCount: 74,
    images: [LINEN_GRAY_DRESS, BURGENDY_LINEN_DRESS],
    categoryId: "women",
    subcategoryId: "dresses",
    description: {
      ar: "فستان كتان ميدي خفيف مناسب للنهار.",
      en: "A lightweight linen midi dress for daytime.",
    },
    colors: [
      // The light linen dress in the image is closest to Ivory — best-effort
      // mapping of an existing light dress photo to an existing color.
      { ...IVORY, price: 350, images: [LINEN_GRAY_DRESS], sizes: PRODUCT5_IVORY_SIZES },
      { ...BURGUNDY, price: 375, images: [BURGENDY_LINEN_DRESS], sizes: PRODUCT5_SIZES },
    ],
  },
  {
    id: 6,
    slug: "silk-scarf",
    name: { ar: "وشاح حريري بنقشة", en: "Printed Silk Scarf" },
    price: 180,
    rating: 4.4,
    reviewCount: 33,
    images: [
      "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&w=700&q=85",
    ],
    categoryId: "women",
    subcategoryId: "accessories",
    badge: { ar: "جديد", en: "New" },
    description: {
      ar: "وشاح حريري بنقشة هادئة يضيف لمسة لونية.",
      en: "A silk scarf in a subtle print that adds a pop of colour.",
    },
    colors: [
      { ...BURGUNDY, images: [], sizes: ONE_SIZE },
      { ...IVORY, images: [], sizes: ONE_SIZE },
    ],
  },
  {
    id: 7,
    slug: "leather-tote",
    name: { ar: "حقيبة توت الجلدية", en: "Leather Tote" },
    price: 520,
    rating: 4.8,
    reviewCount: 121,
    images: [
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=700&q=85",
    ],
    categoryId: "women",
    subcategoryId: "bags",
    description: {
      ar: "حقيبة توت جلدية واسعة تناسب الاستخدام اليومي.",
      en: "A roomy leather tote for everyday use.",
    },
    colors: [
      { ...TAN, images: [], sizes: ONE_SIZE },
      { ...BLACK, images: [], sizes: ONE_SIZE },
    ],
  },
  {
    id: 8,
    slug: "cotton-shirt",
    name: { ar: "قميص قطني كلاسيكي", en: "Classic Cotton Shirt" },
    price: 240,
    rating: 4.3,
    reviewCount: 47,
    images: [
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=700&q=85",
    ],
    categoryId: "men",
    subcategoryId: "men-shirts",
    description: {
      ar: "قميص قطني بقصّة كلاسيكية مريحة.",
      en: "A comfortable cotton shirt with a classic cut.",
    },
    colors: [
      { ...IVORY, images: [], sizes: PRODUCT8_SIZES },
      { ...CHARCOAL, images: [], sizes: PRODUCT8_SIZES },
    ],
  },
  {
    id: 9,
    slug: "suede-loafers",
    name: { ar: "حذاء لوفر من الشاموا", en: "Suede Loafers" },
    price: 410,
    rating: 4.5,
    reviewCount: 66,
    images: [
      "https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=700&q=85",
    ],
    categoryId: "men",
    subcategoryId: "men-shoes",
    description: {
      ar: "حذاء لوفر من الشاموا بتفاصيل مريحة.",
      en: "Comfortable suede loafers with refined detailing.",
    },
    colors: [
      { ...TAN, images: [], sizes: SHOE_SIZES_41 },
      { ...BLACK, images: [], sizes: SHOE_SIZES_41 },
    ],
  },
  {
    id: 10,
    slug: "knit-cardigan",
    name: { ar: "كارديغان محبوك", en: "Knit Cardigan" },
    price: 300,
    compareAt: 360,
    rating: 4.6,
    reviewCount: 88,
    images: [
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=700&q=85",
    ],
    categoryId: "women",
    subcategoryId: "tops",
    badge: { ar: "الأكثر مبيعاً", en: "Best seller" },
    description: {
      ar: "كارديغان محبوك ناعم لطبقات الموسم.",
      en: "A soft knitted cardigan for seasonal layering.",
    },
    colors: [
      { ...IVORY, images: [], sizes: PRODUCT10_SIZES },
      { ...BURGUNDY, images: [], sizes: PRODUCT10_SIZES },
      { ...CHARCOAL, images: [], sizes: PRODUCT10_SIZES },
    ],
  },
  {
    id: 11,
    slug: "kids-cotton-set",
    name: { ar: "طقم قطني للأطفال", en: "Kids Cotton Set" },
    price: 149,
    rating: 4.6,
    reviewCount: 38,
    images: [
      "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=700&q=85",
    ],
    categoryId: "kids",
    subcategoryId: "kids-boys",
    badge: { ar: "جديد", en: "New" },
    description: {
      ar: "طقم قطني ناعم للأطفال بقصة مريحة مناسبة للاستخدام اليومي.",
      en: "A soft cotton set for kids with a comfortable everyday fit.",
    },
    colors: [
      { ...IVORY, images: [], sizes: PRODUCT11_SIZES },
      { ...BLACK, images: [], sizes: PRODUCT11_SIZES },
    ],
  },
  {
    id: 12,
    slug: "kids-sneakers",
    name: { ar: "حذاء رياضي للأطفال", en: "Kids Sneakers" },
    price: 199,
    rating: 4.5,
    reviewCount: 52,
    images: [
      "https://images.unsplash.com/photo-1544549147-1dc8901b6feb?auto=format&fit=crop&w=700&q=85",
    ],
    categoryId: "kids",
    subcategoryId: "kids-shoes",
    description: {
      ar: "حذاء رياضي خفيف للأطفال بنعل مريح وخطوط عملية.",
      en: "Lightweight sneakers for kids with a comfy sole and practical lines.",
    },
    colors: [
      { ...BLACK, images: [], sizes: SHOE_SIZES_41 },
      { ...TAN, images: [], sizes: SHOE_SIZES_41 },
    ],
  },
  {
    id: 13,
    slug: "everyday-cotton-trousers",
    name: { ar: "بنطال قطني يومي · نموذج تجريبي", en: "Everyday Cotton Trousers · Sample" },
    price: 220,
    rating: 4.2,
    reviewCount: 0,
    images: [],
    categoryId: "women",
    subcategoryId: "pants",
    description: {
      ar: "بيانات تجريبية لمنتج بمقاسات دون خيارات ألوان.",
      en: "Sample data for a size-only product with no color options.",
    },
    colors: [],
    sizes: CLOTHING_SIZES(["XXL"]),
  },
  {
    id: 14,
    slug: "minimal-hair-clip",
    name: { ar: "مشبك شعر بسيط · نموذج تجريبي", en: "Minimal Hair Clip · Sample" },
    price: 45,
    rating: 4.1,
    reviewCount: 0,
    images: [],
    categoryId: "women",
    subcategoryId: "accessories",
    description: {
      ar: "بيانات تجريبية لمنتج لا يحتاج إلى خيارات لون أو مقاس.",
      en: "Sample data for a product with no color or size options.",
    },
    colors: [],
  },
];

export function getProductById(id: number): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function getRelatedProducts(id: number, categoryId: string, limit = 4): Product[] {
  return PRODUCTS.filter((p) => p.id !== id && p.categoryId === categoryId)
    .concat(PRODUCTS.filter((p) => p.id !== id && p.categoryId !== categoryId))
    .slice(0, limit);
}
