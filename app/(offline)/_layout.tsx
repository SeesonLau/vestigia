// app/(offline)/_layout.tsx
import { Stack } from "expo-router";
import { useTheme } from "../../constants/ThemeContext";

export default function OfflineLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="live-feed" />
      <Stack.Screen name="save" />
      <Stack.Screen name="history" />
      <Stack.Screen name="patient-details" />
      <Stack.Screen name="bundle-detail" />
      <Stack.Screen name="csv-viewer" />
    </Stack>
  );
}
