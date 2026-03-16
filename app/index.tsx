// app/index.tsx
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import LoadingScreen from "../components/layout/LoadingScreen";
import { useAuthStore } from "../store/authStore";

export default function Index() {
  const { restoreSession } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [initialRole, setInitialRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    restoreSession().then((role) => {
      setInitialRole(role);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!loading) {
      if (initialRole) {
        switch (initialRole) {
          case "clinic":
            router.replace("/(clinic)");
            break;
          case "patient":
            router.replace("/(patient)");
            break;
          case "admin":
            router.replace("/(admin)");
            break;
          default:
            router.replace("/(auth)/login");
        }
      } else {
        router.replace("/(auth)/login");
      }
    }
  }, [loading, initialRole]);

  return <LoadingScreen />;
}
