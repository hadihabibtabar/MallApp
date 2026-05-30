import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { BackButton } from "@/components/back-button";
import { PostHogProvider } from "@/components/posthog-provider";
import "./globals.css";

const iranYekan = localFont({
  src: [
    {
      path: "../public/fonts/Qs_Iranyekan thin.ttf",
      weight: "100",
      style: "normal",
    },
    {
      path: "../public/fonts/Qs_Iranyekan light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/Qs_Iranyekan.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/Qs_Iranyekan medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/Qs_Iranyekan bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/Qs_Iranyekan extrabold.ttf",
      weight: "800",
      style: "normal",
    },
    {
      path: "../public/fonts/Qs_Iranyekan black.ttf",
      weight: "900",
      style: "normal",
    },
    {
      path: "../public/fonts/Qs_Iranyekan extrablack.ttf",
      weight: "950",
      style: "normal",
    },
  ],
  variable: "--font-iran-yekan",
  display: "swap",
  fallback: ["Tahoma", "sans-serif"],
});

export const metadata: Metadata = {
  title: "همیلا سنتر",
  description: "تخفیف‌ها و محصولات جدید فروشگاه‌های همیلا سنتر",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body
        className={`${iranYekan.variable} ${iranYekan.className} antialiased`}
      >
        <PostHogProvider />
        <BackButton />
        {children}
      </body>
    </html>
  );
}
