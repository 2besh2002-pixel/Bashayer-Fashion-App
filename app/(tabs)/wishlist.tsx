import { useRouter } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";

import { EmptyState } from "@/src/components/commerce/EmptyState";
import { ProductImage } from "@/src/components/commerce/ProductImage";
import { AppText } from "@/src/components/ui/AppText";
import { Button } from "@/src/components/ui/Button";
import { Icon } from "@/src/components/ui/Icon";
import { Screen } from "@/src/components/ui/Screen";
import { useCatalogProducts } from "@/src/hooks/useCatalogProducts";
import { usePrice } from "@/src/hooks/usePrice";
import { useTranslation } from "@/src/hooks/useTranslation";
import { useCartStore } from "@/src/stores/cartStore";
import { useUiStore } from "@/src/stores/uiStore";
import { useWishlistStore } from "@/src/stores/wishlistStore";
import type { Product } from "@/src/types";
import { availableColorSizeCombos } from "@/src/utils/filterProducts";
import { pick } from "@/src/utils/format";

export default function WishlistScreen() {
  const router = useRouter();
  const { t, lang } = useTranslation();
  const price = usePrice();
  const ids = useWishlistStore((s) => s.ids);
  const toggle = useWishlistStore((s) => s.toggle);
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useUiStore((s) => s.showToast);
  const { products, isLoading, hasError, retry } = useCatalogProducts();

  const productById = new Map(products.map((product) => [product.id, product]));
  const items = ids
    .map((id) => productById.get(id))
    .filter((product): product is Product => product != null);

  if (items.length === 0 && (isLoading || hasError)) {
    return (
      <Screen edges={["top", "bottom"]}>
        <View className="relative border-b border-line bg-paper px-4 py-3">
          <View className="absolute bottom-0 left-0 right-0 top-0 items-center justify-center">
            <AppText weight={700} align="center" className="text-[16px] text-ink">
              {t("titleWishlist")}
            </AppText>
          </View>
        </View>
        <Pressable onPress={retry} className="flex-1 items-center justify-center">
          <AppText className="text-muted">{hasError ? t("retry") : t("loading")}</AppText>
        </Pressable>
      </Screen>
    );
  }

  if (items.length === 0) {
    return (
      <Screen edges={["top", "bottom"]}>
        <View className="relative border-b border-line bg-paper px-4 py-3">
          <View className="absolute bottom-0 left-0 right-0 top-0 items-center justify-center">
            <AppText weight={700} align="center" className="text-[16px] text-ink">
              {t("titleWishlist")}
            </AppText>
          </View>
        </View>
        <EmptyState
          icon="heart"
          title={t("wishlistEmptyTitle")}
          text={t("wishlistEmptyText")}
          actionLabel={t("discoverNew")}
          onAction={() => router.push("/(tabs)")}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={["top", "bottom"]}>
      <View className="relative border-b border-line bg-paper px-4 py-7">
        <View className="absolute bottom-0 left-0 right-0 top-0 items-center justify-center">
          <AppText weight={700} align="center" className="text-[16px] text-ink">
            {t("titleWishlist")}
          </AppText>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 12, paddingBottom: 24 }}>
        {items.map((p) => (
          <View key={p.id} className="flex-row gap-3 rounded-2xl border border-line bg-paper p-3">
            <Pressable onPress={() => router.push(`/product/${p.id}`)}>
              <ProductImage uri={p.images[0]} className="h-[90px] w-[78px] rounded-xl" />
            </Pressable>
            <View className="flex-1">
              <AppText weight={600} className="text-[11px] text-ink">
                {pick(p.name, lang)}
              </AppText>
              <AppText className="mt-1 text-[10px] text-wine">{price(p.price)}</AppText>
              <View className="mt-2 flex-row gap-2">
                <View className="flex-1">
                  <Button
                    onPress={() => {
                      const choice = availableColorSizeCombos(p)[0];
                      const added =
                        choice != null &&
                        addItem(p, { colorId: choice.colorId, sizeId: choice.sizeId });
                      showToast(added ? t("itemAddedToCart") : t("itemUnavailable"));
                    }}
                  >
                    {t("addToList")}
                  </Button>
                </View>
                <Pressable
                  onPress={() => toggle(p.id)}
                  className="h-[50px] w-[50px] items-center justify-center rounded-xl border border-line active:opacity-70"
                >
                  <Icon name="trash" size={18} color="#211e1c" />
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
