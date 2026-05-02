// app/auth/verified/VerifiedClient.tsx
"use client";

import { useEffect, useState } from "react";

const DEEP_LINK = "lumenai://auth/account-activated";

export default function VerifiedClient() {
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    //Forward query + hash so the mobile app can pick up Supabase tokens
    const tail = window.location.search + window.location.hash;
    window.location.replace(DEEP_LINK + tail);
    setAttempted(true);
  }, []);

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
        <CheckIcon />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Account verified
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Your Lumen AI account is ready to use.
        </p>
      </div>
      {attempted ? (
        <p className="pt-2 text-xs text-zinc-500 dark:text-zinc-400">
          If the app didn&apos;t open automatically, return to Lumen AI on your
          mobile device and sign in.
        </p>
      ) : null}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-emerald-600 dark:text-emerald-400"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
