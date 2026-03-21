// app/index.tsx
import { Redirect } from "expo-router";
import React from "react";
import LoadingScreen from "../components/layout/LoadingScreen";
import { dbg } from "../lib/debug";
import { useAuthStore } from "../store/authStore";

dbg("index", "module loaded");

export default function Index() {
  const initialized = useAuthStore((s) => s.initialized);
  const user = useAuthStore((s) => s.user);

  dbg("index", `render — initialized=${initialized} role=${user?.role ?? "null"}`);

  if (!initialized) return <LoadingScreen />;

  if (user?.role === "clinic") return <Redirect href="/(clinic)" />;
  if (user?.role === "patient") return <Redirect href="/(patient)" />;
  if (user?.role === "admin") return <Redirect href="/(admin)" />;
  return <Redirect href="/(auth)/login" />;
}
