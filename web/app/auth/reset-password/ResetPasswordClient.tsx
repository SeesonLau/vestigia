// app/auth/reset-password/ResetPasswordClient.tsx
"use client";

import { useEffect, useState } from "react";

const DEEP_LINK = "lumenai://auth/reset-password";

export default function ResetPasswordClient() {
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    //Forward the recovery token (in URL hash) to the mobile app
    const tail = window.location.search + window.location.hash;
    window.location.replace(DEEP_LINK + tail);
    setAttempted(true);
  }, []);

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/30">
        <KeyIcon />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Reset your password
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Continue in the Lumen AI app to set a new password.
        </p>
      </div>
      {attempted ? (
        <p className="pt-2 text-xs text-zinc-500 dark:text-zinc-400">
          If the app didn&apos;t open automatically, return to Lumen AI on your
          mobile device and complete the reset there.
        </p>
      ) : null}
    </div>
  );
}

function KeyIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-sky-600 dark:text-sky-400"
      aria-hidden="true"
    >
      <path d="m21 2-9.6 9.6" />
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-2 2" />
      <path d="m18 5 3 3" />
    </svg>
  );
}
