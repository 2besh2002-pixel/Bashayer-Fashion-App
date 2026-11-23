import { Image, View } from "react-native";

import { Icon } from "@/src/components/ui/Icon";

interface ProductImageProps {
  uri?: string | null;
  className: string;
  resizeMode?: "cover" | "contain";
}

/** Render a quiet product placeholder when mock/API data has no image. */
export function ProductImage({
  uri,
  className,
  resizeMode = "cover",
}: ProductImageProps) {
  if (!uri) {
    return (
      <View className={`${className} items-center justify-center bg-[#eee9e2]`}>
        <Icon name="bag" size={28} color="#9a928b" />
      </View>
    );
  }
  return <Image source={{ uri }} className={className} resizeMode={resizeMode} />;
}
