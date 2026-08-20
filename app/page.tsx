"use client";

import { useEffect } from "react";
import {
  TransitionLink,
  useViewTransitionRouter,
} from "@/components/view-transition";

export default function LandingPage() {
  const router = useViewTransitionRouter();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      router.replace("/deals");
    }, 1700);

    return () => clearTimeout(timeoutId);
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-between px-5 pb-10 pt-12 md:max-w-3xl md:px-8 md:py-16 lg:max-w-2xl lg:px-6">
      <section className="space-y-5">
        <div className="inline-flex items-center rounded-full border border-white/80 bg-white/85 px-4 py-2 text-xs font-bold text-slate-700 shadow-sm md:text-sm">
          همیلا سنتر
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-soft ring-1 ring-slate-900/5 md:p-8 lg:p-10">
          <h1 className="text-3xl font-bold leading-tight text-slate-900 md:text-4xl lg:text-5xl">
            به همیلا سنتر خوش آمدید
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600 md:mt-4 md:text-base md:leading-8">
            تخفیف‌های لحظه‌ای و محصولات جدید فروشگاه‌ها را ببینید و سریع مسیر
            رسیدن را پیدا کنید.
          </p>
        </div>

        <div className="rounded-3xl bg-gradient-to-l from-slate-900 to-slate-700 p-5 text-white shadow-soft md:p-6 lg:p-8">
          <p className="text-sm font-bold text-white/95 md:text-base">
            در حال ورود به داشبورد...
          </p>
          <p className="mt-2 text-xs leading-6 text-white/75 md:text-sm md:mt-3 md:leading-7">
            اگر انتقال خودکار انجام نشد، از دکمه زیر وارد شوید.
          </p>
        </div>
      </section>

      <TransitionLink
        href="/deals"
        className="mt-8 rounded-2xl bg-white px-5 py-3 text-center text-sm font-bold text-slate-900 shadow-soft transition hover:bg-slate-100 md:py-4 md:text-base"
      >
        ورود به تخفیف‌ها
      </TransitionLink>
      <div className="w-full text-center">
        <p className="text-xs text-slate-400">1.0.1-beta.1</p>
      </div>
    </main>
  );
}
