import Link from "next/link";
import type { Store } from "@/types";
import { SmartImage } from "@/components/smart-image";

interface StoreCardProps {
  store: Store;
}

export function StoreCard({ store }: StoreCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/5 transition hover:shadow-md">
      <div className="flex gap-3 p-3">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl">
          <SmartImage
            src={store.heroImage}
            alt={store.name}
            fill
            className="object-cover"
            fallbackSrc="/images/fallback-image.svg"
            sizes="96px"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div className="space-y-1">
            <h3 className="line-clamp-1 text-base font-extrabold text-slate-900">{store.name}</h3>
            <p className="text-xs font-semibold text-slate-500">{store.category}</p>
            <p className="line-clamp-1 text-xs text-slate-500">
              {store.floor} · {store.locationHint}
            </p>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{store.floor}</span>
            <Link
              href={`/store/${store.id}`}
              className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
            >
              مشاهده
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
