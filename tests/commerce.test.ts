jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { PRODUCTS, getProductById } from "../src/data/products";
import { BURGUNDY_PLATEAU_DRESS, GREY_DRESS } from "../src/data/images";
import { lineUnitPrice } from "../src/hooks/useCartDetailed";
import { useCartStore } from "../src/stores/cartStore";
import { useWishlistStore } from "../src/stores/wishlistStore";
import type { CartItem } from "../src/types";
import { convertFromSar, formatPrice } from "../src/utils/currency";
import { isValidOtp, isValidPhone, toFullPhone } from "../src/utils/validation";
import { variantLineId } from "../src/utils/format";

beforeEach(() => {
  useCartStore.setState({ items: [] });
  useWishlistStore.setState({ ids: [] });
});

describe("currency conversion", () => {
  test("SAR is the immutable base and round-trips exactly", () => {
    expect(convertFromSar(429, "SAR")).toBe(429);
    expect(formatPrice(429, "en", "SAR")).toContain("429");
  });

  test("converts numerically and never double-converts a derived value", () => {
    const usd = convertFromSar(429, "USD");
    expect(usd).toBeCloseTo(114.35, 1);
    // Passing a converted USD value back through the converter would be wrong;
    // the UI always passes base SAR, so a second call on the base is identical.
    expect(convertFromSar(429, "USD")).toBe(usd);
    expect(formatPrice(429, "ar", "USD")).toContain("$");
  });
});

describe("cart variants", () => {
  test("different variations are separate lines", () => {
    const product = getProductById(1)!;
    useCartStore.getState().addItem(product, { colorId: "burgundy", sizeId: "m" });
    useCartStore.getState().addItem(product, { colorId: "ivory", sizeId: "m" });
    expect(useCartStore.getState().items).toHaveLength(2);
    expect(useCartStore.getState().items[0].id).toBe(variantLineId(1, "burgundy", "m"));
  });

  test("same variation merges and quantity is clamped", () => {
    const product = getProductById(1)!;
    useCartStore.getState().addItem(product, { colorId: "gray", sizeId: "m", quantity: 2 });
    useCartStore.getState().addItem(product, { colorId: "gray", sizeId: "m", quantity: 3 });
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(5);
    useCartStore.getState().setQuantity(useCartStore.getState().items[0].id, 999);
    expect(useCartStore.getState().items[0].quantity).toBe(10);
  });
});

describe("cart quantity respects variation stock", () => {
  test("increment caps at the variation stock and stays there", () => {
    const product = getProductById(2)!; // Calypso bag: tan stock 4, black stock 2
    useCartStore.getState().addItem(product, { colorId: "tan" });
    const id = useCartStore.getState().items[0].id;
    const increment = useCartStore.getState().increment;
    increment(id);
    expect(useCartStore.getState().items[0].quantity).toBe(2);
    increment(id);
    expect(useCartStore.getState().items[0].quantity).toBe(3);
    increment(id);
    increment(id);
    expect(useCartStore.getState().items[0].quantity).toBe(4); // capped at tan stock 4
  });

  test("setQuantity caps at the variation stock", () => {
    const product = getProductById(2)!;
    useCartStore.getState().addItem(product, { colorId: "tan" });
    const id = useCartStore.getState().items[0].id;
    useCartStore.getState().setQuantity(id, 99);
    expect(useCartStore.getState().items[0].quantity).toBe(4); // tan stock 4
  });

  test("decrement never drops below the minimum and caps at the stock", () => {
    const product = getProductById(2)!; // tan stock 4
    useCartStore.getState().addItem(product, { colorId: "tan", quantity: 4 });
    const id = useCartStore.getState().items[0].id;
    const decrement = useCartStore.getState().decrement;
    decrement(id);
    decrement(id);
    expect(useCartStore.getState().items[0].quantity).toBe(2);
    decrement(id);
    decrement(id);
    decrement(id);
    expect(useCartStore.getState().items[0].quantity).toBe(1); // minimum reached
  });
});

describe("updateVariation", () => {
  test("recalculates price, SKU and image when the color changes", () => {
    const product = getProductById(1)!; // dress-1 Burgundy M
    useCartStore.getState().addItem(product, { colorId: "burgundy", sizeId: "m" });
    const line = useCartStore.getState().items[0];
    expect(line.unitPrice).toBe(439);
    expect(line.sku).toBe("NSJ-DRESS1-BURG-M");
    expect(useCartStore.getState().updateVariation(line.id, product, "gray", "s")).toBe(true);
    const updated = useCartStore.getState().items[0];
    expect(updated.id).toBe(variantLineId(1, "gray", "s"));
    expect(updated.unitPrice).toBe(399); // gray color price
    expect(updated.sku).toBe("1-gray-s");
    expect(updated.colorName?.en).toBe("Gray");
    expect(updated.image).toBe(GREY_DRESS);
  });

  test("removes the line when the new combination is out of stock", () => {
    const product = getProductById(1)!;
    useCartStore.getState().addItem(product, { colorId: "burgundy", sizeId: "m" });
    const line = useCartStore.getState().items[0];
    // Burgundy L is confirmed out of stock in the catalogue data.
    expect(useCartStore.getState().updateVariation(line.id, product, "burgundy", "l")).toBe(false);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  test("merging into the same variation keeps the combined quantity", () => {
    const product = getProductById(2)!; // bag: tan stock 4, black stock 2
    useCartStore.getState().addItem(product, { colorId: "tan", quantity: 2 });
    useCartStore.getState().addItem(product, { colorId: "black" });
    expect(useCartStore.getState().items).toHaveLength(2);
    const tanLine = useCartStore.getState().items.find((i) => i.colorId === "tan")!;
    expect(useCartStore.getState().updateVariation(tanLine.id, product, "black", null)).toBe(true);
    const merged = useCartStore.getState().items;
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe(variantLineId(2, "black", null));
    // Black line (1) + moved Tan line (2), capped at the Black variation stock (2).
    expect(merged[0].quantity).toBe(2);
  });
});

describe("cart variation snapshots", () => {
  test("cart item stores the exact variation data", () => {
    const product = getProductById(1)!;
    useCartStore.getState().addItem(product, { colorId: "burgundy", sizeId: "s" });
    const item = useCartStore.getState().items[0];
    expect(item.id).toBe(variantLineId(1, "burgundy", "s"));
    expect(item.variationId).toBe("1:burgundy:s");
    expect(item.sku).toBe("1-burgundy-s");
    expect(item.colorName?.en).toBe("Burgundy");
    expect(item.sizeLabel).toBe("S");
    expect(item.unitPrice).toBe(429);
    expect(item.productName?.en).toBe("Laurène Pleated Dress");
    expect(item.image).toBe(BURGUNDY_PLATEAU_DRESS);
    expect(item.discountPercent).toBe(18);
  });

  test("gray dress adds to cart with its selected color and size", () => {
    const product = getProductById(1)!;
    useCartStore.getState().addItem(product, { colorId: "gray", sizeId: "s" });
    const item = useCartStore.getState().items[0];
    expect(item.colorId).toBe("gray");
    expect(item.colorName?.en).toBe("Gray");
    expect(item.sizeId).toBe("s");
    expect(item.sizeLabel).toBe("S");
    expect(item.image).toBe(GREY_DRESS);
    expect(item.unitPrice).toBe(399);
  });

  test("one-size product adds without size selection", () => {
    const product = getProductById(7)!;
    useCartStore.getState().addItem(product, { colorId: "tan" });
    const item = useCartStore.getState().items[0];
    expect(item.sizeId).toBeNull();
    expect(item.sizeLabel).toBe("O/S");
  });

  test("unavailable variations cannot be added and known stock caps quantity", () => {
    const product = getProductById(1)!;
    expect(useCartStore.getState().addItem(product, { colorId: "burgundy", sizeId: "l" })).toBe(
      false,
    );
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(
      useCartStore.getState().addItem(product, {
        colorId: "burgundy",
        sizeId: "m",
        quantity: 9,
      }),
    ).toBe(true);
    expect(useCartStore.getState().items[0].quantity).toBe(3);
    useCartStore.getState().increment(useCartStore.getState().items[0].id);
    expect(useCartStore.getState().items[0].quantity).toBe(3);
  });

  test("a product without options can be added using its base price", () => {
    const product = getProductById(14)!;
    expect(useCartStore.getState().addItem(product)).toBe(true);
    const item = useCartStore.getState().items[0];
    expect(item.colorId).toBeNull();
    expect(item.sizeId).toBeNull();
    expect(item.unitPrice).toBe(45);
    expect(item.productName?.en).toBe("Minimal Hair Clip · Sample");
  });

  test("different variations are separate lines; same variation merges", () => {
    const product = getProductById(5)!;
    useCartStore.getState().addItem(product, { colorId: "ivory", sizeId: "m" });
    useCartStore.getState().addItem(product, { colorId: "burgundy", sizeId: "l" });
    expect(useCartStore.getState().items).toHaveLength(2);
    useCartStore.getState().addItem(product, { colorId: "burgundy", sizeId: "l" });
    expect(useCartStore.getState().items).toHaveLength(2);
    const line = useCartStore.getState().items.find((i) => i.colorId === "burgundy");
    expect(line?.quantity).toBe(2);
    expect(line?.unitPrice).toBe(375);
  });
});

describe("cart line price", () => {
  test("lineUnitPrice uses the stored snapshot; falls back for legacy lines", () => {
    const product = getProductById(1)!;
    const legacy = {
      id: "1:burgundy:s",
      productId: 1,
      colorId: "burgundy",
      sizeId: "s",
      quantity: 1,
      variationId: "1:burgundy:s",
      sku: "1-burgundy-s",
      unitPrice: undefined,
    } as unknown as CartItem;
    expect(lineUnitPrice(legacy, product)).toBe(429);
    const fresh = { ...legacy, unitPrice: 160 } as CartItem;
    expect(lineUnitPrice(fresh, product)).toBe(160);
  });
});

describe("favorites", () => {
  test("toggle adds and removes a product id", () => {
    const id = PRODUCTS[0].id;
    useWishlistStore.getState().toggle(id);
    expect(useWishlistStore.getState().ids).toContain(id);
    useWishlistStore.getState().toggle(id);
    expect(useWishlistStore.getState().ids).not.toContain(id);
  });
});

describe("phone + OTP validation", () => {
  test("validates local demo phone numbers", () => {
    expect(isValidPhone("500000000")).toBe(true);
    expect(isValidPhone("123")).toBe(false);
    expect(toFullPhone("+966", "500000000")).toBe("+966500000000");
  });

  test("requires exactly four digits for OTP", () => {
    expect(isValidOtp(["1", "2", "3", "4"])).toBe(true);
    expect(isValidOtp(["1", "2", "3", ""])).toBe(false);
  });
});
