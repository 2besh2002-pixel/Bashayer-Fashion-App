import { PRODUCTS } from "../src/data/products";
import {
  filterProducts,
  productHasDiscount,
  productIsAvailable,
  productPriceRange,
} from "../src/utils/filterProducts";

describe("product filtering", () => {
  test("filters by main category (women / men / kids)", () => {
    expect(filterProducts(PRODUCTS, { categoryId: "women" }).map((p) => p.id)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 10, 13, 14,
    ]);
    expect(filterProducts(PRODUCTS, { categoryId: "men" }).map((p) => p.id)).toEqual([8, 9]);
    expect(filterProducts(PRODUCTS, { categoryId: "kids" }).map((p) => p.id)).toEqual([11, 12]);
  });

  test("filters by subcategory within the main category", () => {
    expect(
      filterProducts(PRODUCTS, { categoryId: "women", subcategoryId: "dresses" }).map((p) => p.id),
    ).toEqual([1, 5]);
    expect(
      filterProducts(PRODUCTS, { categoryId: "women", subcategoryId: "jackets" }).map((p) => p.id),
    ).toEqual([3]);
    expect(
      filterProducts(PRODUCTS, { categoryId: "women", subcategoryId: "bags" }).map((p) => p.id),
    ).toEqual([2, 7]);
    expect(
      filterProducts(PRODUCTS, { categoryId: "women", subcategoryId: "tops" }).map((p) => p.id),
    ).toEqual([10]);
    expect(
      filterProducts(PRODUCTS, { categoryId: "kids", subcategoryId: "kids-shoes" }).map((p) => p.id),
    ).toEqual([12]);
  });

  test("filters by price range using variation price ranges", () => {
    // Product 1's variation range reaches its compareAt of 520.
    expect(filterProducts(PRODUCTS, { priceMax: 250 }).map((p) => p.id)).toEqual([
      6, 8, 11, 12, 13, 14,
    ]);
    expect(filterProducts(PRODUCTS, { priceMin: 600 }).map((p) => p.id)).toEqual([3]);
    expect(filterProducts(PRODUCTS, { priceMin: 350, priceMax: 500 }).map((p) => p.id)).toEqual([
      1, 4, 5, 9,
    ]);
  });

  test("filters by available colors", () => {
    expect(filterProducts(PRODUCTS, { availableColors: ["gray"] }).map((p) => p.id)).toEqual([1]);
    expect(filterProducts(PRODUCTS, { availableColors: ["tan"] }).map((p) => p.id)).toEqual([
      2, 7, 9, 12,
    ]);
    expect(filterProducts(PRODUCTS, { availableColors: ["black", "white"] }).map((p) => p.id)).toEqual([
      2, 4, 7, 9, 11, 12,
    ]);
  });

  test("filters by available sizes (color-specific availability)", () => {
    expect(filterProducts(PRODUCTS, { availableSizes: ["l"] }).map((p) => p.id)).toEqual([
      1, 3, 5, 8, 10, 11, 13,
    ]);
    expect(filterProducts(PRODUCTS, { availableSizes: ["xl"] }).map((p) => p.id)).toEqual([
      1, 3, 5, 8, 10, 11, 13,
    ]);
  });

  test("filters by product availability (stock unknown counts as available)", () => {
    for (const product of PRODUCTS) {
      expect(productIsAvailable(product)).toBe(true);
    }
    const noneAvailable = {
      ...PRODUCTS[0],
      colors: PRODUCTS[0].colors.map((c) => ({ ...c, available: false })),
    };
    expect(productIsAvailable(noneAvailable)).toBe(false);
    expect(filterProducts([noneAvailable], { inStock: true })).toEqual([]);
  });

  test("filters by discounts when configured", () => {
    expect(filterProducts(PRODUCTS, { hasDiscount: true }).map((p) => p.id)).toEqual([1, 3, 10]);
    expect(productHasDiscount(PRODUCTS[0])).toBe(true); // Product 1 compareAt 520 > 429
    expect(productHasDiscount(PRODUCTS[1])).toBe(false);
  });

  test("products always carry category and subcategory ids", () => {
    for (const product of PRODUCTS) {
      expect(product.categoryId).toBeTruthy();
      expect(productPriceRange(product).min).toBeGreaterThanOrEqual(0);
    }
  });
});
