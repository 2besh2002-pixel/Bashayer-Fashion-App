import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";

import { ProductGrid } from "@/src/components/commerce/ProductCard";
import { AppText } from "@/src/components/ui/AppText";
import { AppTextInput } from "@/src/components/ui/AppTextInput";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Screen } from "@/src/components/ui/Screen";
import { getCategoryByRoute, getProductsByRoute } from "@/src/data/categories";
import { useCatalogProducts } from "@/src/hooks/useCatalogProducts";
import { useTranslation } from "@/src/hooks/useTranslation";
import type { TranslationKey } from "@/src/i18n/translations";
import type { Product, ProductColor } from "@/src/types";
import {
  availableColorIds,
  availableSizeIds,
  filterProducts,
  productPriceRange,
} from "@/src/utils/filterProducts";
import { pick } from "@/src/utils/format";

type SortOption = "newest" | "priceAsc" | "priceDesc" | "rating";

/**
 * Dedicated category listing screen.
 *
 * Works for the new main routes (women / men / kids) and the legacy routes
 * (shoes-bags, dresses, bags, shoes, accessories) so every navigation target
 * keeps working. Products are scoped to the main category + optional
 * subcategory, and filtered by price, colors, sizes, availability and
 * discounts using the real catalogue data.
 */
export default function CategoryListingScreen() {
  const router = useRouter();
  const { id, subcategory } = useLocalSearchParams<{ id: string; subcategory?: string }>();
  const { t, lang } = useTranslation();
  const { products, isLoading, hasError, retry } = useCatalogProducts();
  const [sort, setSort] = useState<SortOption | null>(null);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [discountsOnly, setDiscountsOnly] = useState(false);

  // Main categories carry real names; legacy ids map to existing translation keys.
  const main = getCategoryByRoute(id);
  const titleKeyMap: Record<string, string> = {
    dresses: "categoryDresses",
    bags: "categoryBags",
    shoes: "categoryShoes",
    accessories: "categoryAccessories",
    "shoes-bags": "shoesAndBags",
  };
  const title = main ? pick(main.name, lang) : t((titleKeyMap[id] ?? id) as TranslationKey);

  // Subcategories come from the main category definition.
  const subcategories = main?.subcategories ?? [];

  // The param stores the label text in the language it was picked in.
  const activeSubId = subcategories.find(
    (s) => pick(s.name, lang) === subcategory || s.id === subcategory,
  )?.id;
  const hasSubcategoryFilter = Boolean(activeSubId);

  // Base products for this route (scoped to the main category or legacy group).
  const baseProducts: Product[] = getProductsByRoute(id, products);

  // Real filter options from the products themselves.
  const colorMap = new Map<string, ProductColor>();
  for (const product of baseProducts) {
    for (const color of product.colors) {
      if (!colorMap.has(color.id)) colorMap.set(color.id, color);
    }
  }
  const availableColorIdsInCategory = new Set(baseProducts.flatMap((p) => availableColorIds(p)));
  const availableColorList = Array.from(colorMap.values()).filter((color) =>
    availableColorIdsInCategory.has(color.id),
  );
  const availableSizes = Array.from(new Set(baseProducts.flatMap((p) => availableSizeIds(p))));
  const sizeLabelById = (sizeId: string): string => {
    for (const color of colorMap.values()) {
      const found = color.sizes.find((s) => s.id === sizeId);
      if (found) return found.label;
    }
    for (const product of baseProducts) {
      const found = product.sizes?.find((s) => s.id === sizeId);
      if (found) return found.label;
    }
    return sizeId;
  };

  // Apply filters with the centralized filter logic.
  const parsedMin = minPrice.trim() ? Number.parseFloat(minPrice) : undefined;
  const parsedMax = maxPrice.trim() ? Number.parseFloat(maxPrice) : undefined;
  const validMin = parsedMin != null && !Number.isNaN(parsedMin) ? parsedMin : undefined;
  const validMax = parsedMax != null && !Number.isNaN(parsedMax) ? parsedMax : undefined;

  let displayedProducts = filterProducts(baseProducts, {
    categoryId: main?.id,
    subcategoryId: hasSubcategoryFilter ? activeSubId : undefined,
    priceMin: validMin,
    priceMax: validMax,
    availableColors: selectedColors.length ? selectedColors : undefined,
    availableSizes: selectedSizes.length ? selectedSizes : undefined,
    inStock: inStockOnly || undefined,
    hasDiscount: discountsOnly || undefined,
  });

  if (sort === "newest") displayedProducts = [...displayedProducts].sort((a, b) => b.id - a.id);
  else if (sort === "priceAsc") {
    displayedProducts = [...displayedProducts].sort(
      (a, b) => productPriceRange(a).min - productPriceRange(b).min,
    );
  } else if (sort === "priceDesc") {
    displayedProducts = [...displayedProducts].sort(
      (a, b) => productPriceRange(b).max - productPriceRange(a).max,
    );
  } else if (sort === "rating")
    displayedProducts = [...displayedProducts].sort((a, b) => b.rating - a.rating);

  const toggleColor = (id: string) =>
    setSelectedColors((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleSize = (id: string) =>
    setSelectedSizes((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleInStock = () => setInStockOnly((v) => !v);
  const toggleDiscounts = () => setDiscountsOnly((v) => !v);

  const resetFilters = () => {
    setMinPrice("");
    setMaxPrice("");
    setSelectedColors([]);
    setSelectedSizes([]);
    setInStockOnly(false);
    setDiscountsOnly(false);
  };

  const chooseSubcategory = (label?: string) => router.setParams({ subcategory: label });

  const sortOptions: { key: SortOption; label: string }[] = [
    { key: "newest", label: t("sortNewest") },
    { key: "priceAsc", label: t("sortPriceAsc") },
    { key: "priceDesc", label: t("sortPriceDesc") },
    { key: "rating", label: t("sortRating") },
  ];

  const hasFilters =
    inStockOnly ||
    discountsOnly ||
    selectedColors.length ||
    selectedSizes.length ||
    validMin != null ||
    validMax != null;

  return (
    <Screen edges={["top", "bottom"]}>
      <PageHeader title={title} showBack />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {isLoading ? (
          <AppText className="px-[18px] py-4 text-[10px] text-muted">{t("loading")}</AppText>
        ) : hasError ? (
          <Pressable onPress={retry} className="px-[18px] py-4">
            <AppText className="text-[10px] text-muted">{t("retry")}</AppText>
          </Pressable>
        ) : null}
        {/* Subcategory filters — narrow products within this category */}
        {subcategories.length > 0 ? (
          <View className="mt-2 px-[18px]">
            <AppText weight={700} className="text-[16px] text-ink">
              {t("subcategories")}
            </AppText>
            <View className="mt-3 flex-row flex-wrap gap-2">
              <Pressable
                onPress={() => chooseSubcategory(undefined)}
                className={`rounded-full border px-3 py-1.5 active:opacity-70 ${
                  !hasSubcategoryFilter ? "border-ink bg-ink" : "border-line bg-paper"
                }`}
              >
                <AppText
                  weight={600}
                  className={`text-[10px] ${!hasSubcategoryFilter ? "text-white" : "text-ink"}`}
                >
                  {t("allCategoryItems")}
                </AppText>
              </Pressable>
              {subcategories.map((item) => {
                const label = pick(item.name, lang);
                const isActive = activeSubId === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => chooseSubcategory(label)}
                    className={`rounded-full border px-3 py-1.5 active:opacity-70 ${
                      isActive ? "border-ink bg-ink" : "border-line bg-paper"
                    }`}
                  >
                    <AppText
                      weight={600}
                      className={`text-[10px] ${isActive ? "text-white" : "text-ink"}`}
                    >
                      {label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            {/* Compact sort control */}
            <View className="mt-4 flex-row flex-wrap items-center gap-2">
              <AppText weight={600} className="text-[11px] text-muted">
                {t("sort")}
              </AppText>
              {sortOptions.map((option) => {
                const isActive = sort === option.key;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => setSort((prev) => (prev === option.key ? null : option.key))}
                    className={`rounded-full border px-2.5 py-1 active:opacity-70 ${
                      isActive ? "border-wine bg-wine" : "border-line bg-paper"
                    }`}
                  >
                    <AppText className={`text-[9px] ${isActive ? "text-white" : "text-ink"}`}>
                      {option.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Real filters driven by catalog data */}
        {availableColorList.length || availableSizes.length || hasFilters ? (
          <View className="mt-2 px-[18px]">
            <AppText weight={700} className="text-[14px] text-ink">
              {t("filterTitle")}
            </AppText>

            {availableColorList.length ? (
              <View className="mt-3 flex-row flex-wrap gap-2">
                <AppText weight={600} className="self-center text-[10px] text-muted">
                  {t("color")}
                </AppText>
                {availableColorList.map((color) => {
                  const isActive = selectedColors.includes(color.id);
                  return (
                    <Pressable
                      key={color.id}
                      onPress={() => toggleColor(color.id)}
                      className={`flex-row items-center gap-1.5 rounded-full border px-2.5 py-1 active:opacity-70 ${
                        isActive ? "border-wine bg-wine" : "border-line bg-paper"
                      }`}
                    >
                      <View
                        className="h-2 w-2 rounded-full border border-line"
                        style={{ backgroundColor: color.hex }}
                      />
                      <AppText className={`text-[9px] ${isActive ? "text-white" : "text-ink"}`}>
                        {pick(color.name, lang)}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {availableSizes.length ? (
              <View className="mt-2 flex-row flex-wrap gap-2">
                <AppText weight={600} className="self-center text-[10px] text-muted">
                  {t("size")}
                </AppText>
                {availableSizes.map((sizeId) => {
                  const isActive = selectedSizes.includes(sizeId);
                  return (
                    <Pressable
                      key={sizeId}
                      onPress={() => toggleSize(sizeId)}
                      className={`rounded-full border px-2.5 py-1 active:opacity-70 ${
                        isActive ? "border-wine bg-wine" : "border-line bg-paper"
                      }`}
                    >
                      <AppText className={`text-[9px] ${isActive ? "text-white" : "text-ink"}`}>
                        {sizeLabelById(sizeId)}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {baseProducts.some(
              (p) => p.compareAt != null || p.colors.some((c) => c.compareAt != null),
            ) ? (
              <Pressable
                onPress={toggleDiscounts}
                className={`mt-2 rounded-full border px-2.5 py-1 active:opacity-70 ${
                  discountsOnly ? "border-wine bg-wine" : "border-line bg-paper"
                }`}
              >
                <AppText className={`text-[9px] ${discountsOnly ? "text-white" : "text-ink"}`}>
                  {t("discountsOnly")}
                </AppText>
              </Pressable>
            ) : null}

            <View className="mt-2 flex-row flex-wrap items-center gap-2">
              <Pressable
                onPress={toggleInStock}
                className={`rounded-full border px-2.5 py-1 active:opacity-70 ${
                  inStockOnly ? "border-wine bg-wine" : "border-line bg-paper"
                }`}
              >
                <AppText className={`text-[9px] ${inStockOnly ? "text-white" : "text-ink"}`}>
                  {t("inStockOnly")}
                </AppText>
              </Pressable>
              {hasFilters ? (
                <Pressable
                  onPress={resetFilters}
                  className="rounded-full border border-line px-2.5 py-1 active:opacity-70"
                >
                  <AppText className="text-[9px] text-ink">{t("reset")}</AppText>
                </Pressable>
              ) : null}
            </View>

            <View className="mt-2 flex-row gap-2">
              <AppTextInput
                value={minPrice}
                onChangeText={setMinPrice}
                placeholder={t("minPrice")}
                placeholderTextColor="#9a928b"
                keyboardType="numeric"
                className="flex-1 text-[9px] text-ink"
              />
              <AppTextInput
                value={maxPrice}
                onChangeText={setMaxPrice}
                placeholder={t("maxPrice")}
                placeholderTextColor="#9a928b"
                keyboardType="numeric"
                className="flex-1 text-[9px] text-ink"
              />
            </View>
          </View>
        ) : null}

        {/* Product listing */}
        {displayedProducts.length > 0 ? (
          <>
            <View className="mt-5 px-[18px]">
              <AppText weight={700} className="text-[16px] text-ink">
                {t("exploreCollection")}
              </AppText>
            </View>
            <ProductGrid
              products={displayedProducts}
              onPress={(p) => router.push(`/product/${p.id}`)}
            />
          </>
        ) : (
          <View className="items-center justify-center px-8 py-16">
            <AppText weight={700} className="text-[16px] text-ink">
              {t("noResults")}
            </AppText>
            <AppText className="mt-2 text-center text-[11px] text-muted">
              {t("noResultsHint")}
            </AppText>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
