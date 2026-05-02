// components/ui/InitialsAvatar.tsx
//Teams-style avatar: solid coloured circle with up to two initials.
//If imageUrl is provided, renders the image with the initials block
//as a fallback while loading or on error.

import React, { useState } from "react";
import { Image, StyleSheet, Text, View, ViewStyle } from "react-native";

interface InitialsAvatarProps {
  /** 1–2 character string. Use the helpers below to derive. */
  initials: string;
  /** Stable string used to pick the background color. Defaults to `initials`. */
  seed?: string;
  /** Diameter in px. Defaults to 40. */
  size?: number;
  /** When set, renders the image; falls back to initials on error. */
  imageUrl?: string | null;
  borderWidth?: number;
  borderColor?: string;
  style?: ViewStyle;
}

//Curated palette — bright enough that white text reads well on top.
const PALETTE = [
  "#F87171", "#FB923C", "#FBBF24", "#A3E635", "#34D399",
  "#22D3EE", "#60A5FA", "#A78BFA", "#F472B6", "#FB7185",
  "#94A3B8", "#10B981",
];

function pickColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export default function InitialsAvatar({
  initials,
  seed,
  size = 40,
  imageUrl,
  borderWidth = 0,
  borderColor,
  style,
}: InitialsAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const safeInitials = (initials || "?").slice(0, 2).toUpperCase();
  const bg = pickColor(seed ?? safeInitials);

  const showImage = imageUrl && !imageFailed;

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: bg,
    borderWidth,
    borderColor,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };

  if (showImage) {
    return (
      <View style={[containerStyle, style]}>
        <Image
          source={{ uri: imageUrl! }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          onError={() => setImageFailed(true)}
        />
      </View>
    );
  }

  return (
    <View
      style={[containerStyle, style]}
      accessibilityRole="image"
      accessibilityLabel={`Avatar with initials ${safeInitials}`}
    >
      <Text style={[styles.label, { fontSize: Math.round(size * 0.4) }]}>
        {safeInitials}
      </Text>
    </View>
  );
}

//Initials helpers ────────────────────────────────────────────────────
export function personInitials(first?: string | null, last?: string | null): string {
  const f = first?.trim()?.[0]?.toUpperCase() ?? "";
  const l = last?.trim()?.[0]?.toUpperCase() ?? "";
  return (f + l) || "?";
}

export function facilityInitials(name?: string | null): string {
  if (!name) return "?";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return (words[0][0] ?? "?").toUpperCase();
  return ((words[0][0] ?? "") + (words[1][0] ?? "")).toUpperCase() || "?";
}

const styles = StyleSheet.create({
  label: {
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
