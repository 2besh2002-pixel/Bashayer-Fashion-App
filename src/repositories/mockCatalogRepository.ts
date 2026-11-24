import type { Lang, Product } from "@/src/types";
import type { CatalogQuery, CatalogRepository, ProductPage } from "@/src/repositories/types";
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
  /**
   * Local equivalent of the documented pagination/filter parameters. It keeps
   * the existing local filters (both languages, category labels) working while
   * mirroring the API's page / per_page / category_id / search contract.
   */
  async listProductsPaged(query: CatalogQuery = {}): Promise<ProductPage> {
    const page = Math.max(1, Math.floor(query.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Math.floor(query.perPage ?? 20)));
    let list = PRODUCTS;
    if (query.categoryId) {
      list = list.filter((p) => p.categoryId === query.categoryId);
    }
    if (query.search && query.search.trim()) {
      const term = query.search;
      list = list.filter((p) => matches(p, term, "ar") || matches(p, term, "en"));
    }
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const start = (page - 1) * perPage;
    return { items: list.slice(start, start + perPage), page, perPage, total, totalPages };
  },
};
