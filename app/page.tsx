"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trackAppOpened } from "@/lib/posthog";

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    trackAppOpened({ source: "landing" });

    const timeoutId = setTimeout(() => {
      router.replace("/deals");
    }, 1700);

    return () => clearTimeout(timeoutId);
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-between px-5 pb-10 pt-12">
      <section className="space-y-5">
        <div className="inline-flex items-center rounded-full border border-white/80 bg-white/85 px-4 py-2 text-xs font-bold text-slate-700 shadow-sm">
          همیلا سنتر
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-soft ring-1 ring-slate-900/5">
          <h1 className="text-3xl font-black leading-tight text-slate-900">به همیلا سنتر خوش آمدید</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            تخفیف‌های لحظه‌ای و محصولات جدید فروشگاه‌ها را ببینید و سریع مسیر رسیدن را پیدا کنید.
          </p>
        </div>

        <div className="rounded-3xl bg-gradient-to-l from-slate-900 to-slate-700 p-5 text-white shadow-soft">
          <p className="text-sm font-bold text-white/95">در حال ورود به داشبورد...</p>
          <p className="mt-2 text-xs leading-6 text-white/75">اگر انتقال خودکار انجام نشد، از دکمه زیر وارد شوید.</p>
        </div>
      </section>

      <Link
        href="/deals"
        className="mt-8 rounded-2xl bg-white px-5 py-3 text-center text-sm font-bold text-slate-900 shadow-soft transition hover:bg-slate-100"
      >
        ورود به تخفیف‌ها
      </Link>
    </main>
  );
}
