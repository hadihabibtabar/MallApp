"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { DealView } from "@/types";
import { discountedPrice, formatPrice, toPersianDigits } from "@/lib/format";
import { trackDealClicked } from "@/lib/posthog";
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
  const dealClickProperties = {
    source: "deal_card" as const,
    deal_id: item.deal.id,
    deal_tag: item.deal.tag,
    store_id: item.store.id,
    store_floor: item.store.floor,
    product_id: item.product.id,
    product_discount: item.deal.discount
  };

  useEffect(() => {
    const tick = () => setTimeLabel(formatCompactTime(item.deal.expiresAt));
    const intervalId = setInterval(tick, 1_000);
    tick();
    return () => clearInterval(intervalId);
  }, [item.deal.expiresAt]);

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm ring-1 ring-slate-900/5 sm:p-3">
      <div className="flex items-start gap-2.5 sm:gap-3">
        <Link
          href={`/product/${item.product.id}`}
          className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl sm:h-28 sm:w-28"
          onClick={() => trackDealClicked(dealClickProperties)}
        >
          <SmartImage
            src={item.product.image}
            alt={item.product.name}
            fill
            className="object-cover"
            fallbackSrc="/images/fallback-image.svg"
            sizes="(min-width: 640px) 112px, 96px"
          />
          <div className="absolute right-1 top-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm sm:right-1.5 sm:top-1.5 sm:px-2 sm:text-[10px]">
            %{toPersianDigits(item.deal.discount)}
          </div>
        </Link>

        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center justify-between gap-1.5 text-[10px]">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-600">{item.deal.tag}</span>
            <span className="rounded-full bg-orange-50 px-2 py-0.5 font-bold text-orange-700">{timeLabel}</span>
          </div>

          <h3 className="line-clamp-2 text-sm leading-5 text-slate-900 sm:text-base sm:leading-6">
            <Link href={`/product/${item.product.id}`} onClick={() => trackDealClicked(dealClickProperties)}>
              {item.product.name}
            </Link>
          </h3>

          <div className="mt-1.5">
            <p className="text-[10px] font-semibold text-slate-400">قیمت بعد از تخفیف</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <p className="text-base text-slate-900 sm:text-lg">{formatPrice(newPrice)}</p>
              <p className="text-[11px] text-slate-400 line-through">{formatPrice(oldPrice)}</p>
            </div>
          </div>

          <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <p className="line-clamp-1 min-w-0 text-[11px] text-slate-500">
              {item.store.name} · {item.store.floor}
            </p>
            <Link
              href={`/store/${item.store.id}`}
              onClick={() => trackDealClicked(dealClickProperties)}
              className="shrink-0 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[14px] font-semibold text-white transition hover:bg-slate-700 sm:text-[11px]"
            >
              مشاهده فروشگاه
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
