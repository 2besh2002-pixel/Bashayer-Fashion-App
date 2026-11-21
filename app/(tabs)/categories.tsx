import { Image, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppText } from '@/src/components/ui/AppText';
import { Icon } from '@/src/components/ui/Icon';
import { Screen } from '@/src/components/ui/Screen';
import { useTranslation } from '@/src/hooks/useTranslation';
import { CATEGORY_GROUPS } from '@/src/data/products';
import { pick } from '@/src/utils/format';

export default function CategoriesScreen() {
  const router = useRouter();
  const { t, lang } = useTranslation();

  // Main category navigation links - each navigates to its dedicated category route.
  const mainCategories = [
    { id: 'women', label: t('women') },
    { id: 'men', label: t('men') },
    { id: 'kids', label: t('kids') },
  ];

  return (
    <Screen edges={['top', 'bottom']}>
      <View className="border-b border-line bg-paper px-4 py-3">
        <AppText weight={700} className="text-[16px] text-ink">
          {t('titleCategories')}
        </AppText>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="mt-2 flex-row gap-2 px-[18px]">
          {[t('all')].concat(mainCategories.map((c) => c.label)).map((label, i) => (
            <View
              key={label}
              className={`rounded-full px-3 py-1.5 ${i === 0 ? 'bg-ink' : 'bg-chipBg'}`}
            >
              <AppText weight={600} className={`text-[10px] ${i === 0 ? 'text-white' : 'text-ink'}`}>
                {label}
              </AppText>
            </View>
          ))}
        </View>

        {/* Dedicated category routes */}
        <View className="mt-5 px-[18px]">
          {mainCategories.map((cat) => (
            <View key={cat.id} className="mb-5">
              <Pressable
                onPress={() => router.push(`/categories/${cat.id}`)}
                className="overflow-hidden rounded-2xl active:opacity-90"
              >
                <View className="relative h-[150px]">
                  <Image source={{ uri: CATEGORY_GROUPS.find((g) => g.id === cat.id)?.image ?? CATEGORY_GROUPS[0].image }} className="h-full w-full" resizeMode="cover" />
                  <View className="absolute inset-0 bg-black/30" />
                  <View className="absolute bottom-0 left-0 right-0 p-4">
                    <AppText serif weight={700} className="text-[20px] text-white">
                      {cat.label}
                    </AppText>
                    <AppText className="mt-1 text-[10px] text-white/90">
                      {t('exploreCollection')}
                    </AppText>
                  </View>
                </View>
              </Pressable>
              <View className="mt-3">
                {CATEGORY_GROUPS.find((g) => g.id === cat.id)?.items.map((item) => (
                  <Pressable
                    key={pick(item, lang)}
                    onPress={() => router.push(`/categories/${cat.id}`)}
                    className="flex-row items-center justify-between border-b border-line py-3 active:opacity-70"
                  >
                    <AppText className="text-[11px] text-ink">{pick(item, lang)}</AppText>
                    <Icon name="chevron" size={16} color="#78706a" direction="forward" />
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Shoes & Bags group */}
        <View className="mt-2 px-[18px]">
          <Pressable
            onPress={() => router.push('/categories/shoes-bags')}
            className="overflow-hidden rounded-2xl active:opacity-90"
          >
            <View className="relative h-[150px]">
              <Image source={{ uri: CATEGORY_GROUPS.find((g) => g.id === 'shoes-bags')?.image ?? CATEGORY_GROUPS[0].image }} className="h-full w-full" resizeMode="cover" />
              <View className="absolute inset-0 bg-black/30" />
              <View className="absolute bottom-0 left-0 right-0 p-4">
                <AppText serif weight={700} className="text-[20px] text-white">
                  {t('shoesAndBags')}
                </AppText>
                <AppText className="mt-1 text-[10px] text-white/90">
                  {t('exploreCollection')}
                </AppText>
              </View>
            </View>
          </Pressable>
          <View className="mt-3">
            {CATEGORY_GROUPS.find((g) => g.id === 'shoes-bags')?.items.map((item) => (
              <Pressable
                key={pick(item, lang)}
                onPress={() => router.push('/categories/shoes-bags')}
                className="flex-row items-center justify-between border-b border-line py-3 active:opacity-70"
              >
                <AppText className="text-[11px] text-ink">{pick(item, lang)}</AppText>
                <Icon name="chevron" size={16} color="#78706a" direction="forward" />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}


