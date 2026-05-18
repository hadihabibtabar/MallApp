"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { DealView } from "@/types";
import { discountedPrice, formatPrice, toPersianDigits } from "@/lib/format";
import { SmartImage } from "@/components/smart-image";

interface DealCardProps {
  item: DealView;
}

function formatCompactTime(expiresAt: string): string {
  const diffMs = new Date(expiresAt).getTime() - Date.now();

  if (diffMs <= 0) {
    return "تمام‌شده";
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  return toPersianDigits(`${hh}:${mm}:${ss}`);
}

export function DealCard({ item }: DealCardProps) {
  const [timeLabel, setTimeLabel] = useState(() => formatCompactTime(item.deal.expiresAt));
  const oldPrice = item.product.price;
  const newPrice = discountedPrice(oldPrice, item.deal.discount);

  useEffect(() => {
    const tick = () => setTimeLabel(formatCompactTime(item.deal.expiresAt));
    const intervalId = setInterval(tick, 1_000);
    tick();
    return () => clearInterval(intervalId);
  }, [item.deal.expiresAt]);

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm ring-1 ring-slate-900/5">
      <div className="flex items-start gap-3">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl">
          <SmartImage
            src={item.product.image}
            alt={item.product.name}
            fill
            className="object-cover"
            fallbackSrc="/images/fallback-image.svg"
            sizes="112px"
          />
          <div className="absolute right-1.5 top-1.5 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
            %{toPersianDigits(item.deal.discount)}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2 text-[10px]">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-600">{item.deal.tag}</span>
            <span className="rounded-full bg-orange-50 px-2 py-0.5 font-bold text-orange-700">{timeLabel}</span>
          </div>

          <h3 className="line-clamp-2 text-base font-black leading-6 text-slate-900">{item.product.name}</h3>

          <div className="mt-2">
            <p className="text-[10px] font-semibold text-slate-400">قیمت بعد از تخفیف</p>
            <div className="mt-0.5 flex items-center gap-2">
              <p className="text-lg font-black text-slate-900">{formatPrice(newPrice)}</p>
              <p className="text-[11px] text-slate-400 line-through">{formatPrice(oldPrice)}</p>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="line-clamp-1 text-[11px] text-slate-500">
              {item.store.name} · {item.store.floor}
            </p>
            <Link
              href={`/store/${item.store.id}`}
              className="rounded-lg bg-slate-900 px-2 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-700"
            >
              مشاهده فروشگاه
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
