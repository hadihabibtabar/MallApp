"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/deals",
    label: "تخفیف‌ها",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2l2.2 4.46L19 7.1l-3.5 3.4.82 4.8L12 13.05 7.68 15.3l.82-4.8L5 7.1l4.8-.64L12 2z" />
      </svg>
    )
  },
  {
    href: "/stores",
    label: "فروشگاه‌ها",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 9l2-5h14l2 5" />
        <path d="M4 9h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9z" />
        <path d="M9 13h6" />
      </svg>
    )
  }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="glass fixed bottom-2.5 left-1/2 z-50 w-[calc(100%-1.25rem)] max-w-md -translate-x-1/2 rounded-2xl border border-white/70 p-1.5 shadow-soft">
      <ul className="grid grid-cols-2 gap-1.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex h-11 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? "bg-slate-900 text-white shadow-lg"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
