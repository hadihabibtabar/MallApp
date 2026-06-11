import Link from "next/link";
import type { Store } from "@/types";
import { buildSourceTabHref } from "@/lib/analytics-context";
import { SmartImage } from "@/components/smart-image";
import type { AnalyticsSourceTab } from "@/lib/analytics-context";

interface StoreCardProps {
  store: Store;
  sourceTab?: AnalyticsSourceTab;
}

export function StoreCard({ store, sourceTab }: StoreCardProps) {
  const storeHref = buildSourceTabHref(`/store/${store.id}`, sourceTab);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/5 transition hover:shadow-md lg:rounded-xl lg:p-4">
      <div className="flex gap-3 p-3 md:gap-4 md:p-4 lg:flex-col lg:gap-5">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl md:h-28 md:w-28 lg:h-48 lg:w-full">
          <SmartImage
            src={store.heroImage}
            alt={store.name}
            fill
            className="object-cover"
            fallbackSrc="/images/fallback-image.svg"
            sizes="(min-width: 1024px) 400px, (min-width: 768px) 112px, 96px"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between md:gap-2">
          <div className="space-y-1">
            <h3 className="line-clamp-1 text-base font-extrabold text-slate-900 md:text-lg">
              {store.name}
            </h3>
            <p className="text-xs font-semibold text-slate-500 md:text-sm">
              {store.category}
            </p>
            <p className="line-clamp-1 text-xs text-slate-500 md:text-sm">
              {store.floor} · {store.locationHint}
            </p>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 md:mt-3 md:gap-3 lg:flex-col lg:items-start">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 md:text-xs">
              {store.floor}
            </span>
            <Link
              href={storeHref}
              className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 md:rounded-lg md:px-4 md:py-2.5 md:text-sm lg:w-full lg:text-center"
            >
              مشاهده
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
