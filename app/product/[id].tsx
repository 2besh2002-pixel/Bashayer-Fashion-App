import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Icon } from '@/src/components/ui/Icon';
import { PageHeader } from '@/src/components/ui/PageHeader';
import { Screen } from '@/src/components/ui/Screen';
import { useTranslation } from '@/src/hooks/useTranslation';
import { useCartStore } from '@/src/stores/cartStore';
import { usePrice } from '@/src/hooks/usePrice';
import { useUiStore } from '@/src/stores/uiStore';
import { useWishlistStore } from '@/src/stores/wishlistStore';
import { pick } from '@/src/utils/format';
import { resolveVariation, retainAvailableSize } from '@/src/utils/productVariants';
import { ProductGrid } from '@/src/components/commerce/ProductCard';
import { QuantityStepper } from '@/src/components/commerce/QuantityStepper';
import { useCatalogProducts } from '@/src/hooks/useCatalogProducts';
import { ProductImage } from '@/src/components/commerce/ProductImage';

export default function ProductScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products, isLoading, hasError, retry } = useCatalogProducts();
  const product = products.find((item) => item.id === Number(id));
  const { t, lang } = useTranslation();
  const price = usePrice();
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useUiStore((s) => s.showToast);
  const isFavorite = useWishlistStore((s) => s.ids.includes(product?.id ?? 0));
  const toggleWishlist = useWishlistStore((s) => s.toggle);

  const [selection, setSelection] = useState<{
    productId: number | null;
    colorId: string | null;
    sizeId: string | null;
  }>({ productId: null, colorId: null, sizeId: null });
  const [quantity, setQuantity] = useState(1);
  const [gallery, setGallery] = useState<{ productId: number | null; index: number }>({
    productId: null,
    index: 0,
  });
  const [openDetails, setOpenDetails] = useState(false);
  const [openService, setOpenService] = useState(false);
  const [openDelivery, setOpenDelivery] = useState(false);
  const [openReturns, setOpenReturns] = useState(false);

  const initialColor = product?.colors.find((color) => color.available) ?? null;
  const initialSizes = initialColor?.sizes ?? product?.sizes ?? [];
  const selectedColor =
    product && selection.productId === product.id ? selection.colorId : initialColor?.id ?? null;
  const selectedSize =
    product && selection.productId === product.id
      ? selection.sizeId
      : initialSizes.find((size) => size.available)?.id ?? null;
  const activeIndex = product && gallery.productId === product.id ? gallery.index : 0;

  // The selected variation drives: images, available sizes, price, stock,
  // original price, discount and add-to-cart eligibility.
  const variation = product ? resolveVariation(product, selectedColor, selectedSize) : null;
  const galleryImages = variation?.images ?? [];
  const dedicatedImages = variation?.color?.images?.length ? variation.color.images : [];
  const availableSizes = variation?.availableSizes ?? [];
  const showSizeSelector = availableSizes.length > 1;
  const showOneSize = !showSizeSelector && availableSizes.length > 0;

  const stockText =
    variation?.stock === 0
      ? t('soldOut')
      : variation?.stock != null
        ? `${t('inStock')} · ${variation.stock}`
        : t('stockUnknown');
  const maxQuantity = Math.max(1, Math.min(10, variation?.stock ?? 10));

  if (!product || !variation) {
    return (
      <Screen edges={['top', 'bottom']}>
        <PageHeader title={t('titleProduct')} showBack />
        <View className="flex-1 items-center justify-center">
          {isLoading ? (
            <AppText className="text-muted">{t('loading')}</AppText>
          ) : hasError ? (
            <Pressable onPress={retry}>
              <AppText className="text-muted">{t('retry')}</AppText>
            </Pressable>
          ) : (
            <AppText className="text-muted">{t('noResults')}</AppText>
          )}
        </View>
      </Screen>
    );
  }

  const color = product.colors.find((c) => c.id === selectedColor) ?? null;

  const handleColorChange = (colorId: string) => {
    setSelection({
      productId: product.id,
      colorId,
      sizeId: retainAvailableSize(product, colorId, selectedSize),
    });
    // The gallery resets to the first image of the newly selected color.
    setGallery({ productId: product.id, index: 0 });
    setQuantity(1);
  };

  const handleAdd = () => {
    if (!variation.isAvailable) {
      if (variation.stock === 0) {
        showToast(t('soldOut'));
      } else if (variation.hasSizeOptions && !selectedSize) {
        showToast(t('selectSizeFirst'));
      } else {
        showToast(t('itemUnavailable'));
      }
      return;
    }
    if (addItem(product, { colorId: selectedColor, sizeId: selectedSize, quantity })) {
      showToast(t('itemAddedToCart'));
    } else {
      showToast(t('itemUnavailable'));
    }
  };

  const related = products
    .filter((item) => item.id !== product.id && item.categoryId === product.categoryId)
    .concat(products.filter((item) => item.id !== product.id && item.categoryId !== product.categoryId))
    .slice(0, 4);

  return (
    <Screen edges={['top', 'bottom']}>
      <PageHeader title={t('titleProduct')} showBack />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="relative">
          <ProductImage
            uri={galleryImages[activeIndex] ?? galleryImages[0]}
            className="h-[360px] w-full"
          />
          <Pressable
            onPress={() => toggleWishlist(product.id)}
            className="absolute top-4 h-[40px] w-[40px] items-center justify-center rounded-full bg-white/90 active:opacity-70"
            style={{ end: 16 }}
          >
            <Icon name="heart" size={20} color={isFavorite ? '#6b2637' : '#211e1c'} filled={isFavorite} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/(tabs)/cart')}
            accessibilityRole="button"
            accessibilityLabel={t('navCart')}
            className="absolute bottom-4 h-[40px] w-[40px] items-center justify-center rounded-full bg-white/90 active:opacity-70"
            style={{ start: 16 }}
          >
            <Icon name="bag" size={20} color="#211e1c" />
          </Pressable>
          <View
            className="absolute bottom-4 rounded-full bg-black/50 px-3 py-1"
            style={{ end: 16 }}
          >
            {galleryImages.length > 0 ? (
              <AppText className="text-[9px] text-white">
                {activeIndex + 1} / {galleryImages.length}
              </AppText>
            ) : null}
          </View>
        </View>

        {galleryImages.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 18, gap: 8 }}
          >
            {galleryImages.map((img, i) => (
              <Pressable
                key={i}
                onPress={() => setGallery({ productId: product.id, index: i })}
                className="h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-xl"
              >
                <ProductImage uri={img} className="h-full w-full" />
                <View
                  className={`absolute inset-0 border-2 ${
                    activeIndex === i ? 'border-wine' : 'border-transparent'
                  }`}
                />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {product.colors.length > 0 && dedicatedImages.length === 0 ? (
          <AppText className="mt-2 px-[18px] text-[9px] text-muted">
            {t('galleryAllProductImages')}
          </AppText>
        ) : null}

        <View className="mt-4 px-[18px] pt-4">
          <AppText className="text-[9px] tracking-[2px] text-muted">NASEEJ EDIT</AppText>
          <AppText serif weight={700} className="mt-1 text-[20px] text-ink">
            {pick(product.name, lang)}
          </AppText>
          <View className="mt-1 flex-row items-center gap-2">
            <Icon name="star" size={14} color="#b48847" filled />
            <AppText className="text-[10px] text-muted">
              {product.rating} ({product.reviewCount} {t('reviews')})
            </AppText>
          </View>
          <View className="mt-2 flex-row items-center gap-3">
            <AppText weight={700} className="text-[18px] text-wine">
              {price(variation.price)}
            </AppText>
            {variation.compareAt ? (
              <AppText className="text-[11px] text-muted line-through">
                {price(variation.compareAt)}
              </AppText>
            ) : null}
            {variation.discountPercent ? (
              <View className="rounded-md bg-[#f3e6e8] px-2 py-1">
                <AppText weight={700} className="text-[9px] text-wine">
                  {t('savePercent')} {variation.discountPercent}%
                </AppText>
              </View>
            ) : null}
          </View>
        </View>

        {product.colors.length > 0 ? (
          <View className="mt-4 px-[18px]">
            <View className="flex-row items-center justify-between">
              <AppText weight={700} className="text-[12px] text-ink">
                {t('color')} · {color ? pick(color.name, lang) : ''}
              </AppText>
            </View>
            <View className="mt-2 flex-row gap-3">
              {product.colors.map((c) => (
                <Pressable
                  key={c.id}
                  disabled={!c.available}
                  onPress={() => handleColorChange(c.id)}
                  className={`h-[34px] w-[34px] items-center justify-center rounded-full border-2 ${
                    selectedColor === c.id ? 'border-wine' : 'border-transparent'
                  } ${!c.available ? 'opacity-40' : 'active:opacity-70'}`}
                >
                  <View
                    className="h-[26px] w-[26px] rounded-full border border-line"
                    style={{ backgroundColor: c.hex }}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {showSizeSelector || showOneSize ? (
          <View className="mt-4 px-[18px]">
            <View className="flex-row items-center justify-between">
              <AppText weight={700} className="text-[12px] text-ink">
                {t('size')} · {showSizeSelector ? selectedSize : t('oneSize')}
              </AppText>
              {product.measurements?.length ? (
                <Pressable onPress={() => router.push('/size-guide')}>
                  <AppText className="text-[10px] text-wine">{t('sizeGuide')}</AppText>
                </Pressable>
              ) : null}
            </View>
            {showSizeSelector ? (
              <View className="mt-2 flex-row flex-wrap gap-2">
                {availableSizes.map((s) => (
                  <Pressable
                    key={s.id}
                    disabled={!s.available}
                    onPress={() =>
                      {
                        setSelection({
                          productId: product.id,
                          colorId: selectedColor,
                          sizeId: s.id,
                        });
                        setQuantity(1);
                      }
                    }
                    className={`h-[40px] min-w-[44px] items-center justify-center rounded-xl border px-3 ${
                      selectedSize === s.id ? 'border-wine bg-wine' : 'border-line bg-white'
                    } ${!s.available ? 'opacity-40' : 'active:opacity-70'}`}
                  >
                    <AppText
                      weight={600}
                      className={`text-[11px] ${selectedSize === s.id ? 'text-white' : 'text-ink'}`}
                    >
                      {s.label}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <View className="mt-2 px-[18px]">
          <AppText className="text-[9px] text-muted">
            {stockText} · {t('sku')}: {variation.sku}
          </AppText>
        </View>

        <View className="mt-5 flex-row items-center justify-between px-[18px]">
          <AppText weight={700} className="text-[12px] text-ink">
            {t('quantity')}
          </AppText>
          <QuantityStepper
            value={quantity}
            onIncrease={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
            onDecrease={() => setQuantity((q) => Math.max(1, q - 1))}
            min={1}
            max={maxQuantity}
          />
        </View>

        <View className="mt-4 px-[18px]">
          <Button disabled={!variation.isAvailable} onPress={handleAdd} iconLeft="bag" iconRight="arrow">
            {t('addToCart')} · {price(variation.price)}
          </Button>
        </View>

        <View className="mt-5 border-t border-line px-[18px] pt-4">
          <Pressable
            onPress={() => setOpenDetails((v) => !v)}
            className="flex-row items-center justify-between border-b border-line py-3"
          >
            <View className="flex-row items-center gap-2">
              <Icon name="eye" size={16} color="#211e1c" />
              <AppText className="text-[11px] text-ink">{t('productDetailsTab')}</AppText>
            </View>
            <Icon name={openDetails ? 'close' : 'plus'} size={16} color="#78706a" />
          </Pressable>
          {openDetails ? (
            <View className="border-b border-line py-3">
              <AppText className="text-[10px] leading-[1.7] text-muted">
                {pick(product.description, lang)}
              </AppText>
              {product.materialNote ? (
                <AppText className="mt-2 text-[10px] leading-[1.7] text-muted">
                  {pick(product.materialNote, lang)}
                </AppText>
              ) : null}
            </View>
          ) : null}

          <Pressable
            onPress={() => setOpenService((v) => !v)}
            className="flex-row items-center justify-between border-b border-line py-3"
          >
            <View className="flex-row items-center gap-2">
              <Icon name="help" size={16} color="#211e1c" />
              <AppText className="text-[11px] text-ink">{t('serviceTab')}</AppText>
            </View>
            <Icon name={openService ? 'close' : 'plus'} size={16} color="#78706a" />
          </Pressable>
          {openService ? (
            <View className="border-b border-line py-3">
              <AppText className="text-[10px] leading-[1.7] text-muted">{t('serviceDemoText')}</AppText>
            </View>
          ) : null}

          <Pressable
            onPress={() => setOpenDelivery((v) => !v)}
            className="flex-row items-center justify-between border-b border-line py-3"
          >
            <View className="flex-row items-center gap-2">
              <Icon name="truck" size={16} color="#211e1c" />
              <AppText className="text-[11px] text-ink">{t('deliveryTab')}</AppText>
            </View>
            <Icon name={openDelivery ? 'close' : 'plus'} size={16} color="#78706a" />
          </Pressable>
          {openDelivery ? (
            <View className="border-b border-line py-3">
              <AppText className="text-[10px] leading-[1.7] text-muted">{t('deliveryDemoText')}</AppText>
            </View>
          ) : null}

          <Pressable
            onPress={() => setOpenReturns((v) => !v)}
            className="flex-row items-center justify-between border-b border-line py-3"
          >
            <View className="flex-row items-center gap-2">
              <Icon name="box" size={16} color="#211e1c" />
              <AppText className="text-[11px] text-ink">{t('returnsTab')}</AppText>
            </View>
            <Icon name={openReturns ? 'close' : 'plus'} size={16} color="#78706a" />
          </Pressable>
          {openReturns ? (
            <View className="border-b border-line py-3">
              <AppText className="text-[10px] leading-[1.7] text-muted">{t('returnsDemoText')}</AppText>
            </View>
          ) : null}
        </View>

        <View className="mt-4 px-[18px]">
          <AppText className="text-[9px] tracking-[2px] text-muted">{t('productDetailsHeading')}</AppText>
          <AppText className="mt-2 text-[11px] leading-[1.8] text-muted">
            {pick(product.description, lang)}
          </AppText>
          {product.materialNote ? (
            <AppText className="mt-2 text-[10px] text-muted">
              {pick(product.materialNote, lang)}
            </AppText>
          ) : null}
        </View>

        {related.length > 0 ? (
          <View className="mt-6">
            <View className="px-[18px] pb-3">
              <AppText weight={700} className="text-[14px] text-ink">
                {t('newArrivals')}
              </AppText>
            </View>
            <ProductGrid products={related} onPress={(p) => router.push(`/product/${p.id}`)} />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
