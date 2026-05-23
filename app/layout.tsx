import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PostHogProvider } from "@/components/posthog-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "همیلا سنتر",
  description: "تخفیف‌ها و محصولات جدید فروشگاه‌های همیلا سنتر"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body className="antialiased">
        <PostHogProvider />
        {children}
      </body>
    </html>
  );
}
