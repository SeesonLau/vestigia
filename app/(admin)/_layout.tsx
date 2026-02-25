// app/(admin)/_layout.tsx
import { Stack } from "expo-router";
import React from "react";
import { Colors } from "../../constants/theme";

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.bg.primary },
        animation: "slide_from_right",
      }}
    />
  );
}
