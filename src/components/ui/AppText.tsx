// import { Text as RNText, type TextProps } from "react-native";

// import { useSettingsStore } from "@/src/stores/settingsStore";
// import { fontFamilyFor, type FontWeight } from "@/src/theme/typography";

// export interface AppTextProps extends TextProps {
//   weight?: FontWeight;
//   /** Use the display serif (Latin) / bold Arabic face. */
//   serif?: boolean;
//   italic?: boolean;
//   align?: "left" | "center" | "right";
// }

// /**
//  * Language-aware text. Picks the correct font family for Arabic vs English so
//  * screens never hardcode font names. Styling (size/colour) is applied via
//  * NativeWind `className` or `style`.
//  */
// export function AppText({ weight = 400, serif, align, italic, style, ...props }: AppTextProps) {
//   const lang = useSettingsStore((s) => s.lang);
//   const family = fontFamilyFor(lang, { weight, serif, italic });
//   return (
//     <RNText
//       {...props}
//       style={[
//         {
//           fontFamily: family,
//           direction: lang === "ar" ? "rtl" : "ltr",
//           writingDirection: lang === "ar" ? "rtl" : "ltr",
//           ...(align ? { textAlign: align } : {}),
//         },
//         style,
//       ]}
//     />
//   );
// }

import { Text as RNText, type TextProps } from "react-native";

import { useSettingsStore } from "@/src/stores/settingsStore";
import { fontFamilyFor, type FontWeight } from "@/src/theme/typography";

export interface AppTextProps extends TextProps {
  weight?: FontWeight;
  /** Use the display serif (Latin) / bold Arabic face. */
  serif?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
  /** Optional shortcut: centers the text. Ignored if `align` is set. */
  center?: boolean;
}

export function AppText({
  weight = 400,
  serif,
  align,
  center,
  italic,
  style,
  ...props
}: AppTextProps) {
  const lang = useSettingsStore((s) => s.lang);
  const family = fontFamilyFor(lang, { weight, serif, italic });
  const textAlign = align ?? (center ? "center" : undefined);

  return (
    <RNText
      {...props}
      style={[
        {
          fontFamily: family,
          direction: lang === "ar" ? "rtl" : "ltr",
          writingDirection: lang === "ar" ? "rtl" : "ltr",
          ...(textAlign ? { textAlign } : {}),
        },
        style,
      ]}
    />
  );
}
