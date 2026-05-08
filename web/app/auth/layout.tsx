// app/auth/layout.tsx
import type { ReactNode } from "react";
import { LumenLogo } from "../../components/LumenLogo";
import { ThermalBackground } from "../../components/ThermalBackground";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ThermalBackground />
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <header className="mb-8 flex flex-col items-center select-none">
          <LumenLogo size={56} className="mb-3 shadow-lg shadow-teal-500/20" />
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Lumen{" "}
            <span className="text-teal-600 dark:text-teal-400">AI</span>
          </h1>
        </header>
        <main className="w-full max-w-md rounded-2xl border border-zinc-200/80 bg-white/85 p-8 shadow-xl shadow-zinc-900/5 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/85 dark:shadow-black/30">
          {children}
        </main>
        <footer className="mt-8 text-xs text-zinc-500 dark:text-zinc-400">
          Diabetic Peripheral Neuropathy thermal screening
        </footer>
      </div>
    </>
  );
}
