/**
 * Hierarchical category system: main categories with subcategories.
 *
 * Every product belongs to exactly one main category (categoryId) and,
 * optionally, one subcategory (subcategoryId). Adding new categories or
 * subcategories is a data change — no core product logic is touched.
 */

import type { MainCategory, Product } from "@/src/types";
import { filterProducts } from "@/src/utils/filterProducts";
import { img } from "@/src/data/images";

export const MAIN_CATEGORIES: MainCategory[] = [
  {
    id: "women",
    name: { ar: "نسائي", en: "Women's Fashion" },
    image: img("photo-1496747611176-843222e1e57c", 400),
    subcategories: [
      { id: "dresses", name: { ar: "فساتين", en: "Dresses" } },
      { id: "tops", name: { ar: "بلايز", en: "Tops & Blouses" } },
      { id: "pants", name: { ar: "بناطيل", en: "Pants" } },
      { id: "jeans", name: { ar: "جينز", en: "Jeans" } },
      { id: "skirts", name: { ar: "تنانير", en: "skirts" } },
      { id: "jackets", name: { ar: "جاكيتات ومعاطف", en: "Jackets & Coats" } },
      { id: "abayas", name: { ar: "عبايات", en: "Abayas" } },
      { id: "shoes", name: { ar: "أحذية", en: "Shoes" } },
      { id: "bags", name: { ar: "حقائب", en: "Bags" } },
      { id: "accessories", name: { ar: "إكسسوارات", en: "Accessories" } },
      { id: "sportswear", name: { ar: "ملابس رياضية", en: "Sportswear" } },
      { id: "sleepwear", name: { ar: "ملابس نوم", en: "Sleepwear" } },
    ],
  },
  {
    id: "men",
    name: { ar: "رجالي", en: "Men's Fashion" },
    image: img("photo-1617137968427-85924c800a22", 400),
    subcategories: [
      { id: "men-tshirts", name: { ar: "تيشيرتات", en: "T-shirts" } },
      { id: "men-shirts", name: { ar: "قمصان", en: "Shirts" } },
      { id: "men-pants", name: { ar: "بناطيل", en: "Pants" } },
      { id: "men-jeans", name: { ar: "جينز", en: "Jeans" } },
      { id: "men-jackets", name: { ar: "جاكيتات", en: "Jackets" } },
      { id: "men-hoodies", name: { ar: "هوديز وسويت شيرت", en: "Hoodies & Sweatshirts" } },
      { id: "men-shoes", name: { ar: "أحذية", en: "Shoes" } },
      { id: "men-accessories", name: { ar: "إكسسوارات", en: "Accessories" } },
    ],
  },
  {
    id: "kids",
    name: { ar: "أطفال", en: "Kids' Fashion" },
    image: img("photo-1519238263530-99bdd11df2ea", 400),
    subcategories: [
      { id: "kids-boys", name: { ar: "ملابس أولاد", en: "Boys' Clothing" } },
      { id: "kids-girls", name: { ar: "ملابس بنات", en: "Girls' Clothing" } },
      { id: "kids-baby", name: { ar: "ملابس أطفال رضع", en: "Baby Clothing" } },
      { id: "kids-shoes", name: { ar: "أحذية", en: "Shoes" } },
      { id: "kids-accessories", name: { ar: "إكسسوارات", en: "Accessories" } },
    ],
  },
];

export function getCategoryByRoute(id: string): MainCategory | undefined {
  return MAIN_CATEGORIES.find((c) => c.id === id);
}

/**
 * Products for a category route, narrowed by subcategory when given.
 *
 * Supports the new main routes (women / men / kids) and the legacy routes
 * ("shoes-bags", "dresses", "bags", "shoes", "accessories", "all") used by
 * existing navigation, so routes keep working during migration.
 */
export function getProductsByRoute(
  id: string,
  products: Product[],
  subcategory?: string,
): Product[] {
  const main = getCategoryByRoute(id);
  if (main) {
    const subId = resolveSubcategoryByLabel(main, subcategory);
    return filterProducts(products, { categoryId: main.id, subcategoryId: subId });
  }
  switch (id) {
    case "shoes-bags":
      return products.filter((p) =>
        ["shoes", "men-shoes", "kids-shoes", "bags"].includes(p.subcategoryId ?? ""),
      );
    case "dresses":
      return filterProducts(products, { categoryId: "women", subcategoryId: "dresses" });
    case "bags":
      return filterProducts(products, { categoryId: "women", subcategoryId: "bags" });
    case "shoes":
      return filterProducts(products, { categoryId: "women", subcategoryId: "shoes" });
    case "accessories":
      return filterProducts(products, { categoryId: "women", subcategoryId: "accessories" });
    default:
      // "all" or anything unknown: full catalogue.
      return products;
  }
}

/**
 * Find a subcategory of a main category by its label (the route param stores
 * the localized label text, so match both languages and the id itself).
 */
export function resolveSubcategoryByLabel(
  main: MainCategory,
  label?: string,
): string | undefined {
  if (!label) return undefined;
  const found = main.subcategories.find(
    (s) =>
      s.id === label ||
      s.name.ar === label ||
      s.name.en === label,
  );
  return found?.id;
}
