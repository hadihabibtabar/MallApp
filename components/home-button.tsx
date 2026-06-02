"use client";

import { useRouter, usePathname } from "next/navigation";

const hiddenPaths = new Set(["/", "/deals", "/stores", "/Admin"]);

export function HomeButton() {
  const router = useRouter();
  const pathname = usePathname();

  if (!pathname || hiddenPaths.has(pathname) || pathname.startsWith("/Admin/")) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-50 px-3 md:top-20 md:px-6">
      <div className="mx-auto flex w-full max-w-md justify-end md:max-w-2xl lg:max-w-5xl">
        <button
          type="button"
          onClick={() => router.push("/deals")}
          className="glass pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/85 text-slate-700 shadow-md ring-1 ring-slate-900/5 transition hover:bg-white/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40 md:h-10 md:w-10"
          aria-label="رفتن به صفحه اصلی"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 md:h-5 md:w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              d="M3 10.5L12 3l9 7.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M5 9.5V21h14V9.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9 21v-6h6v6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}