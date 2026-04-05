// app/(admin)/_layout.tsx
import { Stack } from "expo-router";
import { useTheme } from "../../constants/ThemeContext";

export default function AdminLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: "slide_from_right",
      }}
    />
  );
}
