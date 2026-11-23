import { BURGUNDY_PLATEAU_DRESS, GREY_DRESS, BURGENDY_LINEN_DRESS, LINEN_GRAY_DRESS } from "../src/data/images";
import { PRODUCTS, getProductById } from "../src/data/products";

test("image constants are non-empty strings", () => {
  const vals = [BURGUNDY_PLATEAU_DRESS, GREY_DRESS, BURGENDY_LINEN_DRESS, LINEN_GRAY_DRESS];
  for (const v of vals) {
    expect(typeof v).toBe("string");
    expect(v.length).toBeGreaterThan(0);
  }
});

test("product 1 Burgundy color has the Burgundy dress image", () => {
  const p1 = getProductById(1)!;
  expect(p1.colors.find((c) => c.id === "burgundy")?.images).toEqual([BURGUNDY_PLATEAU_DRESS]);
  expect(BURGUNDY_PLATEAU_DRESS).toContain("unsplash");
});

test("product 1 Gray color has the grey dress image", () => {
  const p1 = getProductById(1)!;
  expect(p1.colors.find((c) => c.id === "gray")?.images).toEqual([GREY_DRESS]);
});
