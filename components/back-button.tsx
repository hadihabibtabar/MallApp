"use client";

import { useRouter, usePathname } from "next/navigation";

const hiddenPaths = new Set(["/", "/deals", "/stores", "/Admin"]);

export function BackButton() {
  const router = useRouter();
  const pathname = usePathname();

  if (!pathname || hiddenPaths.has(pathname) || pathname.startsWith("/Admin/")) {
    return null;
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/deals");
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 px-3 md:top-6 md:px-6">
      <div className="mx-auto flex w-full max-w-md justify-end md:max-w-2xl lg:max-w-5xl">
        <button
          type="button"
          onClick={handleBack}
          className="glass pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/85 text-slate-700 shadow-md ring-1 ring-slate-900/5 transition hover:bg-white/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40 md:h-10 md:w-10"
          aria-label="بازگشت به صفحه قبل"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 md:h-4 md:w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
