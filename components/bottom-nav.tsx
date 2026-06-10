"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getActivePrimaryNavHref,
  PRIMARY_NAV_HREFS,
} from "@/lib/primary-navigation";

const navItems = [
  {
    href: PRIMARY_NAV_HREFS.stores,
    label: "فروشگاه‌ها",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 9l2-5h14l2 5" />
        <path d="M4 9h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9z" />
        <path d="M9 13h6" />
      </svg>
    )
  },
  {
    href: PRIMARY_NAV_HREFS.deals,
    label: "تخفیف‌ها",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M12 2l2.2 4.46L19 7.1l-3.5 3.4.82 4.8L12 13.05 7.68 15.3l.82-4.8L5 7.1l4.8-.64L12 2z" />
      </svg>
    )
  },
  {
    href: PRIMARY_NAV_HREFS.newCollection,
    label: "کالکشن جدید",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20 7.5l-8-4.5-8 4.5 8 4.5 8-4.5z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 12l8 4.5 8-4.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 16.5l8 4.5 8-4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
];

export function BottomNav() {
  const pathname = usePathname();
  const activeHref = getActivePrimaryNavHref(pathname);

  if (pathname === "/") {
    return null;
  }

  return (
    <nav
      aria-label="ناوبری اصلی"
      className="fixed inset-x-0 bottom-2 z-50 px-3 lg:hidden"
    >
      <ul
        dir="ltr"
        className="mx-auto grid h-14 w-full max-w-[22rem] grid-cols-3 items-center gap-1 rounded-2xl border border-white/80 bg-white/90 p-1 shadow-[0_16px_38px_-24px_rgba(15,23,42,0.7)] ring-1 ring-slate-900/5 backdrop-blur-xl sm:max-w-sm md:max-w-md"
      >
        {navItems.map((item) => {
          const isActive = activeHref === item.href;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                dir="rtl"
                className={`group flex h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-center text-[10px] font-extrabold leading-4 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 md:text-[11px] ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full ${
                    isActive ? "text-white" : "text-slate-400 group-hover:text-slate-700"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="w-full truncate leading-4">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
