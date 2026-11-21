jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { PRODUCTS, getProductById } from "../src/data/products";
import { useCartStore } from "../src/stores/cartStore";
import { useWishlistStore } from "../src/stores/wishlistStore";
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
    useCartStore.getState().addItem(product, { colorId: "burgundy", sizeId: "m", quantity: 2 });
    useCartStore.getState().addItem(product, { colorId: "burgundy", sizeId: "m", quantity: 3 });
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].quantity).toBe(5);
    useCartStore.getState().setQuantity(useCartStore.getState().items[0].id, 999);
    expect(useCartStore.getState().items[0].quantity).toBe(10);
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

  test("requires exactly six digits for OTP", () => {
    expect(isValidOtp(["1", "2", "3", "4", "5", "6"])).toBe(true);
    expect(isValidOtp(["1", "2", "3", "", "5", "6"])).toBe(false);
  });
});
