// app/(patient)/bundle-detail.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import OnlineBundleDetailScreen from "../../components/thermal/OnlineBundleDetailScreen";

export default function PatientBundleDetailScreen() {
  const router = useRouter();
  const { session_id } = useLocalSearchParams<{ session_id: string }>();
  return (
    <OnlineBundleDetailScreen
      sessionId={session_id ?? ""}
      onViewCsv={(side) =>
        router.push(`/(patient)/csv-viewer?session_id=${session_id}&side=${side}` as any)
      }
    />
  );
}
