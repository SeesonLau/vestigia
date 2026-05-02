// app/auth/verified/page.tsx
import type { Metadata } from "next";
import VerifiedClient from "./VerifiedClient";

export const metadata: Metadata = {
  title: "Account verified — Lumen AI",
  description: "Your Lumen AI account has been verified.",
};

export default function VerifiedPage() {
  return <VerifiedClient />;
}
