import type { Lang, Product } from "@/src/types";
import type { CatalogRepository } from "@/src/repositories/types";
import { MAIN_CATEGORIES } from "@/src/data/categories";
import { PRODUCTS, getProductById } from "@/src/data/products";
import { pick } from "@/src/utils/format";

function matches(product: Product, query: string, lang: Lang): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  // Search both locales so Arabic queries find English slugs and vice versa.
  const category = MAIN_CATEGORIES.find((c) => c.id === product.categoryId);
  const haystack = [
    product.name.ar,
    product.name.en,
    product.description.ar,
    product.description.en,
    product.slug,
    product.categoryId,
    product.subcategoryId ?? "",
    category?.name.ar ?? "",
    category?.name.en ?? "",
    pick(product.badge, lang),
  ]
    .join(" ")
    .toLowerCase();
  // Every token must appear somewhere, so multi-word searches stay useful.
  return q.split(/\s+/).every((token) => haystack.includes(token));
}

export const mockCatalogRepository: CatalogRepository = {
  async listProducts() {
    return PRODUCTS;
  },
  async getProduct(id) {
    return getProductById(id);
  },
  async listCategories() {
    return MAIN_CATEGORIES;
  },
  async search(query, lang) {
    return PRODUCTS.filter((p) => matches(p, query, lang));
  },
};
