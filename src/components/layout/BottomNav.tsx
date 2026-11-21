import { useEffect, useMemo } from "react";
import { Platform, Pressable, View, useWindowDimensions, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { BottomTabBarProps } from "expo-router/js-tabs";

import { AppText } from "@/src/components/ui/AppText";
import { Icon, type IconName } from "@/src/components/ui/Icon";
import { useTranslation } from "@/src/hooks/useTranslation";
import { selectCartCount, useCartStore } from "@/src/stores/cartStore";
import { colors } from "@/src/theme/tokens";
import type { TranslationKey } from "@/src/i18n/translations";

interface TabDef {
  key: string;
  route: string;
  icon: IconName;
  label: TranslationKey;
}

/**
 * ONE logical order for BOTH languages. The row sets `direction`, so in RTL the
 * first item renders at the physical right and the last at the left:
 * right → left = الأقسام، المفضلة، الرئيسية، السلة، حسابي. Home is the middle
 * item, so it stays exactly centered in both directions.
 */
const TABS: TabDef[] = [
  { key: "categories", route: "categories", icon: "grid", label: "navCategories" },
  { key: "wishlist", route: "wishlist", icon: "heart", label: "navWishlist" },
  { key: "home", route: "index", icon: "home", label: "navHome" },
  { key: "cart", route: "cart", icon: "bag", label: "navCart" },
  { key: "account", route: "account", icon: "user", label: "navAccount" },
];

const TAB_COUNT = TABS.length;
const DEFAULT_ACTIVE_INDEX = 2; // home ("index")
const CIRCLE_SIZE = 44;
const NAV_ICON_SIZE = 21;
const HOME_ICON_SIZE = 22;
const INACTIVE_COLOR = "#918982";
const ANIMATION_DURATION_MS = 300;
const TAB_PERCENT = 100 / TAB_COUNT;

const INDICATOR_BASE_STYLE: ViewStyle = {
  position: "absolute",
  left: 0,
  top: 6,
  width: CIRCLE_SIZE,
  height: CIRCLE_SIZE,
  borderRadius: CIRCLE_SIZE / 2,
  backgroundColor: colors.ink,
  zIndex: 0, // tab content sits above the circle
};

/**
 * Centre of the active tab as a percentage of the nav container's own width.
 * This is derived from the real container layout (not a hardcoded screen
 * coordinate), so it adapts to every device width and to RTL/LTR without ever
 * reversing the layout twice.
 */
function tabCenterPercent(index: number, isRTL: boolean): number {
  const physicalIndex = isRTL ? TAB_COUNT - 1 - index : index;
  return physicalIndex * TAB_PERCENT + TAB_PERCENT / 2;
}

export function BottomNav({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useTranslation();
  const cartCount = useCartStore(selectCartCount);
  const { width: screenWidth } = useWindowDimensions();

  // The active Expo Router route is the single source of truth. Navigation
  // triggered from any other screen updates this route, so the circle follows
  // it automatically.
  const activeRoute = state.routes[state.index]?.name;
  const activeTabIndex = useMemo(() => {
    const index = TABS.findIndex((tab) => tab.route === activeRoute);
    return index >= 0 ? index : DEFAULT_ACTIVE_INDEX;
  }, [activeRoute]);

  const targetPercent = tabCenterPercent(activeTabIndex, isRTL);
  const indicatorLeft = useSharedValue(targetPercent);

  // Snap on first mount; animate every subsequent change (including rapid
  // repeated presses — Reanimated retargets the in-flight animation safely).
  const isFirstLayout = useMemo(() => ({ value: true }), []);
  useEffect(() => {
    if (isFirstLayout.value) {
      indicatorLeft.value = targetPercent;
      isFirstLayout.value = false;
      return;
    }
    indicatorLeft.value = withTiming(targetPercent, {
      duration: ANIMATION_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [targetPercent, indicatorLeft, isFirstLayout]);

  // One numeric shared value drives both platforms. Native converts the
  // percentage to pixels for a transform (fully UI-thread animated); web uses
  // the percentage directly as a layout-relative `left`.
  const nativeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (indicatorLeft.value / 100) * screenWidth - CIRCLE_SIZE / 2 },
    ],
  }));
  const webStyle = useAnimatedStyle(() => ({
    left: `${indicatorLeft.value}%`,
    marginLeft: -CIRCLE_SIZE / 2,
  }));
  const animatedStyle = Platform.OS === "web" ? webStyle : nativeStyle;

  const badgeStyle = isRTL ? { start: -8 } : { end: -8 };

  return (
    <View
      className="border-t border-line bg-paper"
      style={{ paddingBottom: Math.max(insets.bottom, 6) }}
    >
      <View className="h-[78px] w-full" style={{ position: 'relative' }}>
        {/* Single empty black circle; purely decorative, behind the active icon. */}
        <Animated.View pointerEvents="none" style={[INDICATOR_BASE_STYLE, animatedStyle]} />

        <View className="h-full w-full flex-row" style={{ direction: isRTL ? "rtl" : "ltr", zIndex: 1 }}>
          {TABS.map((tab) => {
            const active = tab.route === activeRoute;
            const iconSize = tab.key === "home" ? HOME_ICON_SIZE : NAV_ICON_SIZE;
            const iconColor = active ? "#ffffff" : INACTIVE_COLOR;
            const labelColor = active ? colors.wine : INACTIVE_COLOR;
            const route = state.routes.find((item) => item.name === tab.route);

            return (
              <Pressable
                key={tab.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t(tab.label)}
                onPress={() => {
                  if (route) navigateToTab(route.key);
                }}
                className="flex-1 items-center justify-start active:opacity-70"
                style={{ paddingTop: 6 }}
              >
                <View className="h-[44px] w-[44px] items-center justify-center">
                  <Icon
                    name={tab.icon}
                    size={iconSize}
                    color={iconColor}
                    filled={active && tab.key === "wishlist"}
                  />
                  {tab.key === "cart" && cartCount > 0 ? (
                    <View
                      className="absolute -top-1 h-[16px] min-w-[16px] items-center justify-center rounded-full border-2 border-white bg-wine px-0"
                      style={badgeStyle}
                    >
                      <AppText weight={700} className="text-[8px] text-white">
                        {cartCount > 9 ? "9+" : cartCount}
                      </AppText>
                    </View>
                  ) : null}
                </View>
                <AppText
                  weight={active ? 700 : 500}
                  numberOfLines={1}
                  className="mt-0.5 text-[8px]"
                  style={{ color: labelColor }}
                >
                  {t(tab.label)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
