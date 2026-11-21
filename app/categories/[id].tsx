import { Pressable, ScrollView, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppText } from '@/src/components/ui/AppText';
import { ProductGrid } from '@/src/components/commerce/ProductCard';
import { Screen } from '@/src/components/ui/Screen';
import { useTranslation } from '@/src/hooks/useTranslation';
import { CATEGORY_GROUPS, PRODUCTS } from '@/src/data/products';
import { pick } from '@/src/utils/format';
import { PageHeader } from '@/src/components/ui/PageHeader';

/**
 * Dedicated category listing screen.
 * Shows products filtered by the given category id, plus the subcategory items
 * from CATEGORY_GROUPS. Pressing a subcategory navigates to search results.
 */
export default function CategoryListingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useTranslation();

  // Resolve category title using existing translation keys.
  const titleKeyMap: Record<string, string> = {
    women: 'women',
    men: 'men',
    kids: 'kids',
    shoes: 'shoes',
    bags: 'bags',
    accessories: 'categoryAccessories',
    dresses: 'categoryDresses',
  };
  const titleKey = titleKeyMap[id] ?? id;
  const title = t(titleKey as any);

  // Show products for this category.
  // "shoes-bags" maps to shoes + bags products.
  const displayedProducts = id === 'shoes-bags'
    ? PRODUCTS.filter((p) => ['shoes', 'bags'].includes(p.categoryId))
    : PRODUCTS.filter((p) => p.categoryId === id);

  // Subcategories: use CATEGORY_GROUPS items where available.
  const subcategories = CATEGORY_GROUPS.find((g) => g.id === id)?.items ?? [];

  return (
    <Screen edges={['top', 'bottom']}>
      <PageHeader title={title} showBack />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Subcategory links */}
        {subcategories.length > 0 ? (
          <View className="mt-2 px-[18px]">
            <AppText weight={700} className="text-[16px] text-ink">
              {t('exploreCollection')}
            </AppText>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {subcategories.map((item) => (
                <Pressable
                  key={pick(item, lang)}
                  onPress={() => router.push(`/search`)}
                  className="rounded-full border border-line bg-paper px-3 py-1.5 active:opacity-70"
                >
                  <AppText className="text-[10px] text-ink">{pick(item, lang)}</AppText>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* Product listing */}
        {displayedProducts.length > 0 ? (
          <ProductGrid products={displayedProducts} onPress={(p) => router.push(`/product/${p.id}`)} />
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
