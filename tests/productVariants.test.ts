import { getProductById, PRODUCTS } from "../src/data/products";
import {
  computeVariationPrice,
  generateSku,
  getVariationStock,
  resolveInitialSelection,
  resolveVariation,
  resolveVariationImages,
  retainAvailableSize,
} from "../src/utils/productVariants";
import { filterProducts } from "../src/utils/filterProducts";
import { GREY_DRESS, BURGUNDY_PLATEAU_DRESS } from "../src/data/images";
import type { Product } from "../src/types";

/** Synthetic dress matching the user's Black/Beige/White scenario. */
const dress: Product = {
  id: 99,
  slug: "scenario-dress",
  name: { ar: "فستان", en: "Scenario Dress" },
  price: 150,
  rating: 4.8,
  reviewCount: 12,
  images: ["base.jpg"],
  categoryId: "women",
  subcategoryId: "dresses",
  description: { ar: "فستان", en: "Dress" },
  colors: [
    {
      id: "black",
      name: { ar: "أسود", en: "Black" },
      hex: "#111111",
      available: true,
      images: ["black-front.jpg", "black-back.jpg"],
      sizes: [
        { id: "s", label: "S", available: true },
        { id: "m", label: "M", available: true },
        { id: "l", label: "L", available: true, price: 160 },
      ],
    },
    {
      id: "beige",
      name: { ar: "بيج", en: "Beige" },
      hex: "#c2b280",
      available: true,
      price: 180,
      images: [],
      sizes: [
        { id: "m", label: "M", available: true },
        { id: "l", label: "L", available: true, price: 190 },
        { id: "xl", label: "XL", available: true },
      ],
    },
    {
      id: "white",
      name: { ar: "أبيض", en: "White" },
      hex: "#ffffff",
      available: true,
      price: 165,
      images: ["white.jpg"],
      sizes: [
        { id: "s", label: "S", available: true },
        { id: "m", label: "M", available: true },
      ],
    },
  ],
  variations: [
    // Combination-specific price for Black/L beats the size override (160).
    {
      id: "99:black:l",
      colorId: "black",
      sizeId: "l",
      sku: "99-black-l",
      price: 170,
      stock: 2,
      available: true,
    },
  ],
};

/** Synthetic shirt with per-size and per-color stock levels. */
const stitchedShirt: Product = {
  id: 98,
  slug: "stitched-shirt",
  name: { ar: "قميص مخيط", en: "Stitched Shirt" },
  price: 100,
  rating: 4.2,
  reviewCount: 12,
  images: ["stitched-1.jpg"],
  categoryId: "men",
  subcategoryId: "men-shirts",
  description: { ar: "قميص", en: "Shirt" },
  colors: [
    {
      id: "ivory",
      name: { ar: "عاجي", en: "Ivory" },
      hex: "#e7dfd0",
      available: true,
      images: [],
      sizes: [
        { id: "s", label: "S", available: true, stock: 5 },
        { id: "m", label: "M", available: true, stock: 0 },
      ],
    },
    {
      id: "charcoal",
      name: { ar: "فحمي", en: "Charcoal" },
      hex: "#1f2930",
      available: true,
      images: [],
      stock: 8,
      sizes: [
        { id: "s", label: "S", available: true },
        { id: "l", label: "L", available: true },
      ],
    },
  ],
};

describe("variation pricing priority", () => {
  test("exact combination price wins over everything", () => {
    // variation price 170 (combination) beats size override 160 and base 150
    expect(computeVariationPrice(dress, "black", "l")).toBe(170);
  });

  test("size-specific override wins over color price", () => {
    expect(dress.colors[0].sizes.find((s) => s.id === "l")?.price).toBe(160); // Black L size override
    expect(computeVariationPrice(dress, "beige", "l")).toBe(190); // Beige L size override
    expect(computeVariationPrice(dress, "beige", "l")).not.toBe(180);
  });

  test("color-specific price wins over base", () => {
    expect(computeVariationPrice(dress, "beige", "m")).toBe(180);
    expect(computeVariationPrice(dress, "beige", "xl")).toBe(180);
    expect(computeVariationPrice(dress, "white", "s")).toBe(165);
    expect(computeVariationPrice(dress, "white", "m")).toBe(165);
  });

  test("base price when nothing specific applies", () => {
    expect(computeVariationPrice(dress, "black", "s")).toBe(150);
    expect(computeVariationPrice(dress, "black", "m")).toBe(150);
  });

  test("no color or size: product base price", () => {
    expect(computeVariationPrice(dress, null, null)).toBe(150);
    expect(computeVariationPrice(getProductById(14)!, null, null)).toBe(45);
  });

  test("color-only handbag resolves its color price, stock and configured SKU", () => {
    const bag = getProductById(2)!;
    const tan = resolveVariation(bag, "tan", null);
    const black = resolveVariation(bag, "black", null);
    expect(tan.price).toBe(315);
    expect(tan.sku).toBe("NSJ-BAG2-TAN");
    expect(tan.stock).toBe(4);
    expect(tan.hasSizeOptions).toBe(false);
    expect(black.price).toBe(335);
    expect(black.sku).toBe("NSJ-BAG2-BLK");
  });

  test("size-only and option-free mock products resolve without a color", () => {
    const trousers = resolveVariation(getProductById(13)!, null, "m");
    const clip = resolveVariation(getProductById(14)!, null, null);
    expect(trousers.isAvailable).toBe(true);
    expect(trousers.size?.id).toBe("m");
    expect(trousers.price).toBe(220);
    expect(clip.isAvailable).toBe(true);
    expect(clip.price).toBe(45);
    expect(clip.hasColorOptions).toBe(false);
    expect(clip.hasSizeOptions).toBe(false);
  });

  test("configured unavailable combinations are blocked and retain their SKU", () => {
    const product = getProductById(1)!;
    const unavailable = resolveVariation(product, "burgundy", "l");
    expect(unavailable.isAvailable).toBe(false);
    expect(unavailable.sku).toBe("NSJ-DRESS1-BURG-L");
  });

  test("selected color changes the price and available sizes", () => {
    const product = getProductById(5)!;
    const ivory = resolveVariation(product, "ivory", "m");
    const burgundy = resolveVariation(product, "burgundy", "m");
    expect(ivory.price).toBe(350);
    expect(burgundy.price).toBe(375);
    expect(resolveVariation(product, "ivory", null).availableSizes.map((size) => size.id)).toEqual([
      "s",
      "m",
      "l",
    ]);
  });

  test("switching colors clears a size not offered by the new color", () => {
    const product = getProductById(5)!;
    expect(retainAvailableSize(product, "ivory", "xl")).toBeNull();
    expect(retainAvailableSize(product, "ivory", "m")).toBe("m");
  });

  test("restores a cart variant and falls back when a requested option is unavailable", () => {
    const product = getProductById(5)!;
    expect(resolveInitialSelection(product, "burgundy", "l")).toEqual({
      colorId: "burgundy",
      sizeId: "l",
    });
    expect(resolveInitialSelection(product, "ivory", "xl")).toEqual({
      colorId: "ivory",
      sizeId: "s",
    });
  });
});

describe("color-specific images", () => {
  test("color with dedicated images shows only those images", () => {
    expect(resolveVariationImages(dress, "black")).toEqual(["black-front.jpg", "black-back.jpg"]);
    expect(resolveVariationImages(dress, "white")).toEqual(["white.jpg"]);
  });

  test("multiple images per color are preserved", () => {
    expect(dress.colors.find((c) => c.id === "black")?.images).toEqual([
      "black-front.jpg",
      "black-back.jpg",
    ]);
  });

  test("color without dedicated images falls back to product images (no false labeling)", () => {
    const beige = resolveVariationImages(dress, "beige");
    expect(beige).toEqual(dress.images);
  });

  test("switching colors repeatedly gives the right gallery each time", () => {
    expect(resolveVariationImages(dress, "black")).toEqual(["black-front.jpg", "black-back.jpg"]);
    expect(resolveVariationImages(dress, "beige")).toEqual(dress.images);
    expect(resolveVariationImages(dress, "white")).toEqual(["white.jpg"]);
    expect(resolveVariationImages(dress, "black")).toEqual(["black-front.jpg", "black-back.jpg"]);
  });

  test("verified gray dress image is mapped to the gray color on Product 1", () => {
    const product1 = getProductById(1)!;
    const gray = product1.colors.find((c) => c.id === "gray");
    expect(gray?.name.en).toBe("Gray");
    expect(gray?.images).toEqual([GREY_DRESS]);
    expect(resolveVariationImages(product1, "gray")).toEqual([GREY_DRESS]);
    // Burgundy's verified red dress image
    expect(resolveVariationImages(product1, "burgundy")).toEqual([BURGUNDY_PLATEAU_DRESS]);
    expect(resolveVariationImages(product1, "ivory")).toEqual([]);
  });

  test("each product 5 color shows all of its own photos", () => {
    const product5 = getProductById(5)!;
    expect(resolveVariationImages(product5, "ivory")).toEqual([product5.colors[0].images[0]]);
    expect(resolveVariationImages(product5, "burgundy")).toEqual([
      product5.colors[1].images[0],
    ]);
  });
});

describe("availability scenarios", () => {
  test("one-size product: resolves without a size selection", () => {
    const product2 = getProductById(7)!; // Leather tote
    const variation = resolveVariation(product2, "tan", null);
    expect(variation.isAvailable).toBe(true);
    expect(variation.price).toBe(520);
    expect(variation.availableSizes).toHaveLength(1);
    expect(variation.availableSizes[0].label).toBe("O/S");
  });

  test("multi-size + single color: selection required, unavailable size blocked", () => {
    const shirt = getProductById(8)!; // Classic cotton shirt
    const color = resolveVariation(shirt, "ivory", null);
    expect(color.isAvailable).toBe(false); // nothing selected yet
    expect(color.availableSizes.map((s) => s.label)).toEqual(["XS", "S", "M", "L", "XL", "XXL"]);
    const ok = resolveVariation(shirt, "ivory", "s");
    expect(ok.isAvailable).toBe(true);
    expect(ok.price).toBe(240);
  });

  test("multi-color with different available sizes (Black/Beige/White scenario)", () => {
    const black = resolveVariation(dress, "black", null);
    expect(black.availableSizes.map((s) => s.id)).toEqual(["s", "m", "l"]);
    const beige = resolveVariation(dress, "beige", null);
    expect(beige.availableSizes.map((s) => s.id)).toEqual(["m", "l", "xl"]);
    const white = resolveVariation(dress, "white", null);
    expect(white.availableSizes.map((s) => s.id)).toEqual(["s", "m"]);
  });

  test("color with unavailable status is blocked", () => {
    const product1 = getProductById(1)!;
    const charcoal = product1.colors.find((c) => c.id === "charcoal");
    expect(charcoal?.available).toBe(false);
    expect(resolveVariation(product1, "charcoal", null).isAvailable).toBe(false);
  });

  test("multi-color product blocks unavailable combinations", () => {
    // Product 5 has all its colors available; switch color on Product 1
    // (XS is sold out for Burgundy).
    const product1 = getProductById(1)!;
    expect(resolveVariation(product1, "burgundy", "x").isAvailable).toBe(false);
    expect(resolveVariation(product1, "burgundy", "s").isAvailable).toBe(true);
  });

  test("color-size filter requires the exact pair, not separate matches", () => {
    expect(filterProducts([dress], { availableColors: ["white"], availableSizes: ["xl"] })).toEqual(
      [],
    );
    expect(
      filterProducts([dress], { availableColors: ["beige"], availableSizes: ["xl"] }),
    ).toEqual([dress]);
  });
});

describe("stock resolution", () => {
  test("stock resolves variation → size → color", () => {
    expect(getVariationStock(stitchedShirt, "ivory", "s")).toBe(5);
    expect(getVariationStock(dress, "black", "l")).toBe(2); // variation stock wins
    expect(getVariationStock(dress, "black", "s")).toBeNull(); // unknown
  });

  test("color-level stock applies when no size/variation stock", () => {
    expect(getVariationStock(stitchedShirt, "charcoal", "s")).toBe(8);
  });

  test("confirmed out of stock blocks the combination", () => {
    expect(resolveVariation(stitchedShirt, "ivory", "m").isAvailable).toBe(false);
    expect(resolveVariation(stitchedShirt, "ivory", "m").stock).toBe(0);
  });

  test("unknown stock is not the same as out of stock", () => {
    const ivoryS = resolveVariation(stitchedShirt, "ivory", "s");
    expect(ivoryS.isAvailable).toBe(true);
    expect(ivoryS.stock).toBe(5);
  });
});

describe("generateSku", () => {
  test("builds stable SKUs from product + color + size", () => {
    expect(generateSku(1, "burgundy", "s")).toBe("1-burgundy-s");
    expect(generateSku(2, "tan", null)).toBe("2-tan");
    expect(generateSku(3, null, null)).toBe("3");
  });
});

describe("catalogue sanity", () => {
  test("every product has a category id and the main categories are intact", () => {
    for (const product of PRODUCTS) {
      expect(typeof product.categoryId).toBe("string");
      expect(product.categoryId.length).toBeGreaterThan(0);
    }
    expect(new Set(PRODUCTS.map((p) => p.categoryId))).toEqual(
      new Set(["women", "men", "kids"]),
    );
  });
});
