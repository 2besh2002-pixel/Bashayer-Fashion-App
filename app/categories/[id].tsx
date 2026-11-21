import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppText } from '@/src/components/ui/AppText';
import { ProductGrid } from '@/src/components/commerce/ProductCard';
import { Screen } from '@/src/components/ui/Screen';
import { useTranslation } from '@/src/hooks/useTranslation';
import { CATEGORY_GROUPS, PRODUCTS, SUBCATEGORY_PRODUCT_IDS } from '@/src/data/products';
import { pick } from '@/src/utils/format';
import { PageHeader } from '@/src/components/ui/PageHeader';
import type { Product } from '@/src/types';

type SortOption = 'newest' | 'priceAsc' | 'priceDesc' | 'rating';

/**
 * Dedicated category listing screen.
 * Products are scoped to the current category and can be narrowed further by a
 * subcategory passed through the `subcategory` search param.
 */
export default function CategoryListingScreen() {
  const router = useRouter();
  const { id, subcategory } = useLocalSearchParams<{ id: string; subcategory?: string }>();
  const { t, lang } = useTranslation();
  const [sort, setSort] = useState<SortOption | null>(null);

  // Resolve category title using existing translation keys.
  const titleKeyMap: Record<string, string> = {
    women: 'women',
    men: 'men',
    kids: 'kids',
    shoes: 'shoes',
    bags: 'bags',
    accessories: 'categoryAccessories',
    dresses: 'categoryDresses',
    'shoes-bags': 'shoesAndBags',
  };
  const titleKey = titleKeyMap[id] ?? id;
  const title = t(titleKey as any);

  // Subcategories come from CATEGORY_GROUPS for this category group.
  const subcategories = CATEGORY_GROUPS.find((g) => g.id === id)?.items ?? [];

  // The param stores the label text in the language it was picked in. Resolve
  // against both variants so the active chip survives a language toggle.
  const activeSubcategory = subcategories.find(
    (item) => item.ar === subcategory || item.en === subcategory,
  );
  const hasSubcategoryFilter = Boolean(subcategory);

  // Scope products to the current category. Women spans dresses + accessories;
  // shoes-bags spans shoes + bags. Other groups match their categoryId directly.
  const baseProducts: Product[] = id === 'shoes-bags'
    ? PRODUCTS.filter((p) => ['shoes', 'bags'].includes(p.categoryId))
    : id === 'women'
      ? PRODUCTS.filter((p) => ['dresses', 'accessories'].includes(p.categoryId))
      : PRODUCTS.filter((p) => p.categoryId === id);

  // Apply the subcategory filter using the shared id mapping. An unmapped (or
  // empty) subcategory intentionally yields the no-results state.
  const mappedIds = subcategory ? SUBCATEGORY_PRODUCT_IDS[subcategory] : undefined;
  const displayedProducts = [...(hasSubcategoryFilter
    ? mappedIds && mappedIds.length > 0
      ? baseProducts.filter((p) => mappedIds.includes(p.id))
      : []
    : baseProducts)];

  if (sort === 'newest') displayedProducts.sort((a, b) => b.id - a.id);
  else if (sort === 'priceAsc') displayedProducts.sort((a, b) => a.price - b.price);
  else if (sort === 'priceDesc') displayedProducts.sort((a, b) => b.price - a.price);
  else if (sort === 'rating') displayedProducts.sort((a, b) => b.rating - a.rating);

  const chooseSubcategory = (label?: string) => router.setParams({ subcategory: label });

  const sortOptions: { key: SortOption; label: string }[] = [
    { key: 'newest', label: t('sortNewest') },
    { key: 'priceAsc', label: t('sortPriceAsc') },
    { key: 'priceDesc', label: t('sortPriceDesc') },
    { key: 'rating', label: t('sortRating') },
  ];

  return (
    <Screen edges={['top', 'bottom']}>
      <PageHeader title={title} showBack />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Subcategory filters — narrow products within this category */}
        {subcategories.length > 0 ? (
          <View className="mt-2 px-[18px]">
            <AppText weight={700} className="text-[16px] text-ink">
              {t('subcategories')}
            </AppText>
            <View className="mt-3 flex-row flex-wrap gap-2">
              <Pressable
                onPress={() => chooseSubcategory(undefined)}
                className={`rounded-full border px-3 py-1.5 active:opacity-70 ${
                  !activeSubcategory ? 'border-ink bg-ink' : 'border-line bg-paper'
                }`}
              >
                <AppText weight={600} className={`text-[10px] ${!activeSubcategory ? 'text-white' : 'text-ink'}`}>
                  {t('allCategoryItems')}
                </AppText>
              </Pressable>
              {subcategories.map((item) => {
                const label = pick(item, lang);
                const isActive = Boolean(
                  activeSubcategory && activeSubcategory.ar === item.ar && activeSubcategory.en === item.en,
                );
                return (
                  <Pressable
                    key={label}
                    onPress={() => chooseSubcategory(label)}
                    className={`rounded-full border px-3 py-1.5 active:opacity-70 ${
                      isActive ? 'border-ink bg-ink' : 'border-line bg-paper'
                    }`}
                  >
                    <AppText weight={600} className={`text-[10px] ${isActive ? 'text-white' : 'text-ink'}`}>
                      {label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            {/* Compact sort control */}
            <View className="mt-4 flex-row flex-wrap items-center gap-2">
              <AppText weight={600} className="text-[11px] text-muted">
                {t('sort')}
              </AppText>
              {sortOptions.map((option) => {
                const isActive = sort === option.key;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => setSort((prev) => (prev === option.key ? null : option.key))}
                    className={`rounded-full border px-2.5 py-1 active:opacity-70 ${
                      isActive ? 'border-wine bg-wine' : 'border-line bg-paper'
                    }`}
                  >
                    <AppText className={`text-[9px] ${isActive ? 'text-white' : 'text-ink'}`}>
                      {option.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Product listing */}
        {displayedProducts.length > 0 ? (
          <>
            <View className="mt-5 px-[18px]">
              <AppText weight={700} className="text-[16px] text-ink">
                {t('exploreCollection')}
              </AppText>
            </View>
            <ProductGrid products={displayedProducts} onPress={(p) => router.push(`/product/${p.id}`)} />
          </>
        ) : (
          <View className="items-center justify-center px-8 py-16">
            <AppText weight={700} className="text-[16px] text-ink">
              {t('noResults')}
            </AppText>
            <AppText className="mt-2 text-center text-[11px] text-muted">
              {t('noResultsHint')}
            </AppText>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
