// app/(patient)/_layout.tsx
import { Stack } from "expo-router";
import { Colors } from "../../constants/theme";

export default function PatientLayout() {
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
