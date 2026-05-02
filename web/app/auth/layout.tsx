// app/auth/layout.tsx
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-12 dark:bg-zinc-950">
      <header className="mb-8 select-none">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Lumen{" "}
          <span className="text-emerald-600 dark:text-emerald-400">AI</span>
        </h1>
      </header>
      <main className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {children}
      </main>
      <footer className="mt-8 text-xs text-zinc-500 dark:text-zinc-400">
        Diabetic Peripheral Neuropathy thermal screening
      </footer>
    </div>
  );
}
