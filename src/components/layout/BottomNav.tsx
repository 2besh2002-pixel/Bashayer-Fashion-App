import { Animated, Pressable, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect } from "react";
import { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import type { BottomTabBarProps } from "expo-router/js-tabs";

import { AppText } from "@/src/components/ui/AppText";
import { Icon, type IconName } from "@/src/components/ui/Icon";
import { useTranslation } from "@/src/hooks/useTranslation";
import { useCartStore } from "@/src/stores/cartStore";
import { colors } from "@/src/theme/tokens";
import type { TranslationKey } from "@/src/i18n/translations";

interface TabDef {
  key: string;
  route: string;
  icon: IconName;
  label: TranslationKey;
  /** Home tab uses a larger circle; others use a smaller rounded square. */
  isHome?: boolean;
}

const TABS_LTR: TabDef[] = [
  { key: "categories", route: "categories", icon: "grid", label: "navCategories" },
  { key: "wishlist", route: "wishlist", icon: "heart", label: "navWishlist" },
  { key: "home", route: "index", icon: "home", label: "navHome", isHome: true },
  { key: "cart", route: "cart", icon: "bag", label: "navCart" },
  { key: "account", route: "account", icon: "user", label: "navAccount" },
];

const TABS_RTL = [...TABS_LTR].reverse();

/** Visual tokens ported from the design reference. */
const NAV_ICON_SIZE = 21;
const HOME_ICON_SIZE = 22;
const INACTIVE_ICON = "#918982";
const LABEL_INACTIVE = "#918982";
const TAB_COUNT = 5;
const ANIMATION_DURATION_MS = 300;

export function BottomNav({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useTranslation();
  const cartCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
  const tabs = isRTL ? TABS_RTL : TABS_LTR;
  const { width: screenWidth } = useWindowDimensions();

  const activeRoute = state.routes[state.index]?.name;

  // Shared value for animated indicator translateX (in px, from base position)
  const indicatorTranslate = useSharedValue(0);

  const activeTabIndex = tabs.findIndex((t) => t.route === activeRoute);
  const targetIndex = activeTabIndex >= 0 ? activeTabIndex : 2; // Default: home (index 2)

  const tabWidth = screenWidth / TAB_COUNT;
  // In LTR, indicator base at left: 0, translate by targetIndex * tabWidth.
  // In RTL, indicator base at right: 0, translate by targetIndex * tabWidth (visually).
  const targetOffset = targetIndex * tabWidth;

  // Animate the indicator to the target position when active tab changes
  useEffect(() => {
    indicatorTranslate.value = withTiming(targetOffset, {
      duration: ANIMATION_DURATION_MS,
    });
  }, [targetIndex, targetOffset, indicatorTranslate]);

  const animatedTransform = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorTranslate.value }],
  }));

  const handlePress = (routeName: string) => {
    const target = state.routes.find((r) => r.name === routeName);
    if (target) navigateToTab(target.key);
  };

  // In RTL, mirror directional/count badges by swapping logical edge.
  const badgeStyle = isRTL ? { start: -8 } : { end: -8 };

  return (
    <View
      className="border-t border-line bg-paper"
      style={{ paddingBottom: Math.max(insets.bottom, 6), direction: isRTL ? "rtl" : "ltr" }}
    >
      <View
        className="h-[78px] flex-row"
        style={{ direction: isRTL ? "rtl" : "ltr" }}
      >
        {/* Animated circular indicator — moves to the active tab */}
        <Animated.View
          pointerEvents="none"
          className="absolute bottom-[6px] top-1 flex h-[44px] w-[44px] items-center justify-center rounded-full bg-wine"
          style={[{ zIndex: 1, ...(isRTL ? { right: 0 } : { left: 0 }) }, animatedTransform as any]}
        >
          <Icon name="home" size={HOME_ICON_SIZE} color="#ffffff" />
        </Animated.View>

        {tabs.map((tab) => {
          const active = tab.route === activeRoute;
          const isHome = tab.key === "home";
          const iconSize = isHome ? HOME_ICON_SIZE : NAV_ICON_SIZE;
          const containerClass = isHome
            ? "h-[44px] w-[44px] rounded-full"
            : "h-[34px] w-[34px] rounded-xl";
          const iconColor = active ? "#ffffff" : INACTIVE_ICON;
          const labelColor = active ? colors.wine : LABEL_INACTIVE;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t(tab.label)}
              onPress={() => handlePress(tab.route)}
              className="flex-1 items-center active:opacity-70"
              style={{ paddingTop: 6 }}
            >
              <View
                className={`${containerClass} items-center justify-center relative`}
                style={{ marginTop: isHome ? -12 : 0 }}
              >
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
  );
}
