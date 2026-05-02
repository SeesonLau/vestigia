// app/auth/reset-password/page.tsx
import type { Metadata } from "next";
import ResetPasswordClient from "./ResetPasswordClient";

export const metadata: Metadata = {
  title: "Reset password — Lumen AI",
  description: "Continue in the Lumen AI app to set a new password.",
};

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
