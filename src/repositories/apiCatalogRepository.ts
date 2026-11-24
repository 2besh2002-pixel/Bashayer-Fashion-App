/**
 * Catalog repository backed by the documented Middleware endpoints.
 * Only reached when EXPO_PUBLIC_DATA_SOURCE=api. No requests in mock mode.
 */

import type { Lang, Product } from "@/src/types";
import type { CatalogQuery, CatalogRepository, ProductPage } from "@/src/repositories/types";
import { apiClient } from "@/src/api/client";
import { API_PATHS } from "@/src/api/endpoints";
import { ApiError } from "@/src/api/errors";
import {
  mapApiCategory,
  mapApiProductPage,
  mapApiProduct,
  resolveRemoteProductId,
} from "@/src/api/mappers";
import type { ApiCategory, ApiProduct, ApiProductDetail, ApiProductPage } from "@/src/api/types";
import { currentStoreId } from "@/src/repositories/apiShared";

/** Docs: per_page default 20, maximum 100. */
const MAX_PER_PAGE = 100;

function requireProductPage(
  value: ApiProductPage | null | undefined,
  allowEmpty: boolean,
): ApiProductPage {
  if (
    !value ||
    typeof value !== "object" ||
    !Array.isArray(value.data) ||
    value.data.some((product) => !isValidProduct(product)) ||
    (!allowEmpty && value.data.length === 0)
  ) {
    throw new ApiError("The service returned an unexpected response.", 0, "invalid-response");
  }
  return value;
}

function isValidProduct(product: ApiProduct): boolean {
  return Boolean(product && typeof product.id === "string" && typeof product.name === "string");
}

export const apiCatalogRepository: CatalogRepository = {
  async listProducts() {
    const page = await apiClient.get<ApiProductPage>(API_PATHS.catalog.products(currentStoreId()), {
      query: { page: 1, per_page: MAX_PER_PAGE },
    });
    return mapApiProductPage(requireProductPage(page, false));
  },

  async listProductsPaged(query: CatalogQuery = {}): Promise<ProductPage> {
    const page = Math.max(1, Math.floor(query.page ?? 1));
    const perPage = Math.min(MAX_PER_PAGE, Math.max(1, Math.floor(query.perPage ?? 20)));
    const response = await apiClient.get<ApiProductPage>(
      API_PATHS.catalog.products(currentStoreId()),
      {
        query: {
          page,
          per_page: perPage,
          // Only the three documented filters are sent.
          category_id: query.categoryId,
          search: query.search,
        },
      },
    );
    const allowEmpty =
      page !== 1 || Boolean(query.categoryId) || Boolean(query.search?.trim());
    const validResponse = requireProductPage(response, allowEmpty);
    const pagination = validResponse.pagination;
    return {
      items: mapApiProductPage(validResponse),
      page: pagination?.page ?? page,
      perPage: pagination?.perPage ?? perPage,
      total: pagination?.total ?? 0,
      totalPages: pagination?.totalPages ?? 1,
    };
  },

  async getProduct(id: number): Promise<Product | undefined> {
    // The UI passes the mapped numeric id; the API accepts internal id or Salla id.
    const remoteId = resolveRemoteProductId(id);
    try {
      const api = await apiClient.get<ApiProductDetail>(
        API_PATHS.catalog.product(currentStoreId(), remoteId),
      );
      if (!api || !isValidProduct(api)) {
        throw new ApiError("The service returned an unexpected response.", 0, "invalid-response");
      }
      return mapApiProduct(api);
    } catch (error) {
      if (error instanceof ApiError && error.isNotFound) return undefined;
      throw error;
    }
  },

  async listCategories() {
    const categories = await apiClient.get<ApiCategory[]>(
      API_PATHS.catalog.categories(currentStoreId()),
    );
    if (
      !Array.isArray(categories) ||
      categories.length === 0 ||
      categories.some((category) => !category || typeof category.id !== "string" || typeof category.name !== "string")
    ) {
      throw new ApiError("The service returned an unexpected response.", 0, "invalid-response");
    }
    return categories.map(mapApiCategory);
  },

  async search(query: string, _lang: Lang): Promise<Product[]> {
    // The documented search parameter is `search`; there is no language param.
    const response = await apiClient.get<ApiProductPage>(
      API_PATHS.catalog.products(currentStoreId()),
      { query: { page: 1, per_page: MAX_PER_PAGE, search: query } },
    );
    return mapApiProductPage(requireProductPage(response, true));
  },
};
