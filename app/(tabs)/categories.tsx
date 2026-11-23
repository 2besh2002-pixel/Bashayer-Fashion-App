import { Image, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppText } from '@/src/components/ui/AppText';
import { Icon } from '@/src/components/ui/Icon';
import { Screen } from '@/src/components/ui/Screen';
import { useTranslation } from '@/src/hooks/useTranslation';
import { MAIN_CATEGORIES } from '@/src/data/categories';
import { pick } from '@/src/utils/format';

export default function CategoriesScreen() {
  const router = useRouter();
  const { t, lang } = useTranslation();

  const mainCategories = MAIN_CATEGORIES;

  return (
    <Screen edges={['top', 'bottom']}>
      <View className="border-b border-line bg-paper px-4 py-3">
        <AppText weight={700} className="text-[16px] text-ink">
          {t('titleCategories')}
        </AppText>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="mt-2 flex-row gap-2 px-[18px]">
          {[
            { id: 'all', label: t('all') },
            ...mainCategories.map((c) => ({ id: c.id, label: pick(c.name, lang) })),
          ].map((seg) => (
            <Pressable
              key={seg.id}
              onPress={() => seg.id === 'all' ? router.push('/(tabs)/categories') : router.push(`/categories/${seg.id}`)}
              className={`rounded-full px-3 py-1.5 ${seg.id === 'all' ? 'bg-ink' : 'bg-chipBg'}`}
            >
              <AppText weight={600} className={`text-[10px] ${seg.id === 'all' ? 'text-white' : 'text-ink'}`}>
                {seg.label}
              </AppText>
            </Pressable>
          ))}
        </View>

        {/* Main categories with their subcategories */}
        <View className="mt-5 px-[18px]">
          {mainCategories.map((cat) => (
            <View key={cat.id} className="mb-5">
              <Pressable
                onPress={() => router.push(`/categories/${cat.id}`)}
                className="overflow-hidden rounded-2xl active:opacity-90"
              >
                <View className="relative h-[150px]">
                  <Image source={{ uri: cat.image }} className="h-full w-full" resizeMode="cover" />
                  <View className="absolute inset-0 bg-black/30" />
                  <View className="absolute bottom-0 left-0 right-0 p-4">
                    <AppText serif weight={700} className="text-[20px] text-white">
                      {pick(cat.name, lang)}
                    </AppText>
                    <AppText className="mt-1 text-[10px] text-white/90">
                      {t('exploreCollection')}
                    </AppText>
                  </View>
                </View>
              </Pressable>
              <View className="mt-3">
                {cat.subcategories.map((sub) => (
                  <Pressable
                    key={sub.id}
                    onPress={() =>
                      router.push(`/categories/${cat.id}?subcategory=${encodeURIComponent(pick(sub.name, lang))}`)
                    }
                    className="flex-row items-center justify-between border-b border-line py-3 active:opacity-70"
                  >
                    <AppText className="text-[11px] text-ink">{pick(sub.name, lang)}</AppText>
                    <Icon name="chevron" size={16} color="#78706a" direction="forward" />
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Legacy shoes & bags entry */}
        <View className="mt-2 px-[18px]">
          <Pressable
            onPress={() => router.push('/categories/shoes-bags')}
            className="rounded-2xl border-b border-line pb-3 active:opacity-90"
          >
            <AppText serif weight={700} className="text-[20px] text-ink">
              {t('shoesAndBags')}
            </AppText>
            <AppText className="mt-1 text-[10px] text-ink">{t('exploreCollection')}</AppText>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}
