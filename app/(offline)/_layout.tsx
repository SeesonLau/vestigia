// app/(offline)/_layout.tsx
import { Stack } from "expo-router";
import React from "react";

export default function OfflineLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="live-feed" />
      <Stack.Screen name="save" />
    </Stack>
  );
}
