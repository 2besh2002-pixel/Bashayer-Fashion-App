import { View } from "react-native";

import { AppText } from "@/src/components/ui/AppText";
import { BackButton } from "@/src/components/ui/BackButton";
import { useTranslation } from "@/src/hooks/useTranslation";

interface PageHeaderProps {
  title: string;
  /** Show a back button (secondary screens). Root tabs hide it. */
  showBack?: boolean;
  /** Optional trailing action node (e.g. search icon). */
  right?: React.ReactNode;
}

/**
 * Compact secondary/primary page header (ported from `.page-header`):
 * a back button on the leading edge, a spacer, and the title centered
 * across the full screen width — independent of the action columns.
 */
export function PageHeader({ title, showBack, right }: PageHeaderProps) {
  const { isRTL } = useTranslation();
  return (
    <View
      className="relative h-[61px] flex-row items-center border-b border-[#f0ebe4] bg-paper px-4"
      style={{ direction: isRTL ? "rtl" : "ltr" }}
    >
      <View className="w-[42px] items-start">
        {showBack ? <BackButton /> : null}
      </View>
      <View className="absolute left-0 right-0 top-0 h-[61px] items-center justify-center">
        <AppText weight={700} numberOfLines={1} className="text-center text-[16px] text-ink">
          {title}
        </AppText>
      </View>
      <View className="flex-1" />
      <View className="w-[42px] items-end">{right}</View>
    </View>
  );
}