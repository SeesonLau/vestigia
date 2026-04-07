// constants/ThemeContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { darkColors, lightColors, ThemeColors } from "./theme";

const STORAGE_KEY = "vestigia_theme_override";

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: darkColors,
  isDark: true,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  // null = follow system, "dark" / "light" = manual override
  const [override, setOverride] = useState<"dark" | "light" | null>(null);
  const [loaded, setLoaded] = useState(false);

  //Load persisted override on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === "dark" || val === "light") setOverride(val);
      setLoaded(true);
    });
  }, []);

  const isDark = override != null ? override === "dark" : systemScheme !== "light";
  const colors = isDark ? darkColors : lightColors;

  const toggleTheme = useCallback(() => {
    const next = isDark ? "light" : "dark";
    setOverride(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  }, [isDark]);

  const value = useMemo<ThemeContextValue>(
    () => ({ colors, isDark, toggleTheme }),
    [colors, isDark, toggleTheme]
  );

  //Don't render until preference is loaded (avoids flash)
  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
