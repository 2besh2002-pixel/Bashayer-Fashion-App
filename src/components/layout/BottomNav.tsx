import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

export function BottomNav({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useTranslation();
  const cartCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
  const tabs = isRTL ? TABS_RTL : TABS_LTR;

  const activeRoute = state.routes[state.index]?.name;

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
        {tabs.map((tab) => {
          const active = tab.route === activeRoute;
          const isHome = tab.key === "home";
          const iconSize = isHome ? HOME_ICON_SIZE : NAV_ICON_SIZE;
          // Home tab: larger 44px circle. Other tabs: 34px rounded rect.
          const containerSize = isHome ? 44 : 34;
          const containerRadius = isHome ? "rounded-full" : "rounded-xl";
          const activeBgStyle = active ? { backgroundColor: isHome ? colors.wine : "#f2e6e8" } : undefined;
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
                className={`h-[${containerSize}px] w-[${containerSize}px] items-center justify-center ${containerRadius} relative`}
                style={{ marginTop: isHome ? -12 : 0 }}
              >
                {active ? (
                  <View pointerEvents="none" className="absolute inset-0" style={activeBgStyle} />
                ) : null}
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
