// hooks/useInactivityTimeout.ts
import { useCallback, useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../store/authStore";

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes (FR-104)

export function useInactivityTimeout() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backgroundAtRef = useRef<number | null>(null);

  const forceLogout = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    await logout();
    router.replace("/(auth)/login");
  }, [logout, router]);

  const resetTimer = useCallback(() => {
    if (!user) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(forceLogout, TIMEOUT_MS);
  }, [user, forceLogout]);

  // Start timer when user logs in, clear when they log out
  useEffect(() => {
    if (!user) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    resetTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user?.id]);

  // Handle app going to background — check elapsed time on return
  useEffect(() => {
    const handleAppState = async (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        backgroundAtRef.current = Date.now();
        if (timerRef.current) clearTimeout(timerRef.current);
      } else if (nextState === "active") {
        if (backgroundAtRef.current !== null && user) {
          const elapsed = Date.now() - backgroundAtRef.current;
          if (elapsed >= TIMEOUT_MS) {
            await forceLogout();
          } else {
            resetTimer();
          }
        }
        backgroundAtRef.current = null;
      }
    };

    const sub = AppState.addEventListener("change", handleAppState);
    return () => sub.remove();
  }, [user?.id, forceLogout, resetTimer]);

  return { resetTimer };
}
