// components/thermal/ZoomableImage.tsx
//Wraps an <Image> with a tap-to-open behaviour that hands measured bounds
//to the LightboxProvider. The bounds drive the shared-element-style
//transition.

import React, { useRef } from "react";
import {
  Image, type ImageProps, TouchableOpacity, View, type ViewStyle,
} from "react-native";
import { useLightbox } from "./ImageLightbox";

interface Props extends Omit<ImageProps, "source"> {
  uri: string | null | undefined;
  containerStyle?: ViewStyle;
  /** Disable the lightbox (e.g. when the image is missing). */
  disabled?: boolean;
}

export default function ZoomableImage({
  uri, containerStyle, disabled, ...imgProps
}: Props) {
  const ref = useRef<View>(null);
  const { open } = useLightbox();

  if (!uri) return null;

  return (
    <TouchableOpacity
      activeOpacity={disabled ? 1 : 0.85}
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        ref.current?.measureInWindow((x, y, width, height) => {
          if (width > 0 && height > 0) {
            open({ uri, bounds: { x, y, width, height } });
          }
        });
      }}
      style={containerStyle}
    >
      <View ref={ref} collapsable={false}>
        <Image source={{ uri }} {...imgProps} />
      </View>
    </TouchableOpacity>
  );
}
