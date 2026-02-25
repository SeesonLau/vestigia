// app/_layout.tsx
import { Stack } from "expo-router";
import { Colors } from "../constants/theme";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.bg.primary },
        animation: "fade",
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(clinic)" />
      <Stack.Screen name="(patient)" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="index" />
    </Stack>
  );
}
