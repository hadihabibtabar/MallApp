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

export function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 hidden w-full border-b border-slate-200/50 bg-white/95 backdrop-blur-sm md:block">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 py-3 lg:px-6 lg:py-4">
        <ul className="flex gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "bg-slate-900 text-white shadow-md"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
