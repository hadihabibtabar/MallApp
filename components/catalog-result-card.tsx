import Link from "next/link";
import type { Product, Store } from "@/types";
import {
  discountedPrice,
  formatPrice,
  isGoldProductTag,
  toPersianDigits,
} from "@/lib/format";
import { buildSourceTabHref } from "@/lib/analytics-context";
import { SmartImage } from "@/components/smart-image";
import type { AnalyticsSourceTab } from "@/lib/analytics-context";

interface CatalogResultCardProps {
  product: Product;
  store: Store;
  discountPercent?: number | null;
  statusLabel?: string;
  statusTone?: "active" | "muted";
  sourceTab?: AnalyticsSourceTab;
  onProductClick?: () => void;
  onStoreClick?: () => void;
}

const paymentIcons = {
  digipay: "/images/digipay.webp",
  snapppay: "/images/snapppay.webp",
  tarapay: "/images/tarapay.webp",
};

const statusToneClassNames = {
  active: "bg-orange-50 text-orange-700",
  muted: "bg-slate-100 text-slate-500",
};

export function CatalogResultCard({
  product,
  store,
  discountPercent,
  statusLabel,
  statusTone = "active",
  sourceTab,
  onProductClick,
  onStoreClick,
}: CatalogResultCardProps) {
  const isGoldProduct = isGoldProductTag(product.tag);
  const hasDiscount =
    typeof discountPercent === "number" && discountPercent > 0;
  const paymentMethods = product.paymentMethods ?? [];
  const productHref = buildSourceTabHref(`/product/${product.id}`, sourceTab);
  const storeHref = buildSourceTabHref(`/store/${store.id}`, sourceTab);

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm ring-1 ring-slate-900/5 transition hover:border-slate-300 hover:shadow-md sm:p-3">
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className="shrink-0">
          <Link
            href={productHref}
            aria-label={product.name}
            className="relative block h-24 w-24 overflow-hidden rounded-xl bg-slate-100 transition hover:opacity-95 sm:h-28 sm:w-28"
            onClick={onProductClick}
          >
            <SmartImage
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
              fallbackSrc="/images/fallback-image.svg"
              sizes="(min-width: 640px) 112px, 96px"
            />

            {hasDiscount ? (
              <div className="absolute right-1 top-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm sm:right-1.5 sm:top-1.5 sm:px-2 sm:text-[10px]">
                %{toPersianDigits(discountPercent)}
              </div>
            ) : null}
          </Link>

          {paymentMethods.length > 0 ? (
            <div className="mt-2 flex justify-center gap-1.5">
              {paymentMethods.map((method) => (
                <img
                  key={method}
                  src={paymentIcons[method]}
                  alt={method}
                  className="h-5 w-5 rounded-lg border border-slate-200 bg-white object-cover shadow-sm sm:h-6 sm:w-6"
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          {(statusLabel || product.isNew) && (
<div className="mb-1.5 flex items-center justify-between text-[12px]">
  <div>
    {product.isNew ? ( <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700"> کالکشن جدید </span> ) : null}
  </div>
  <div>
    {statusLabel && (
      <span
        className={`tabular-nums rounded-full px-2 py-0.5 font-bold ${statusToneClassNames[statusTone]}`}
      >
        {statusLabel}
      </span>
    )}
  </div>

  
</div>
          )}

          <h3 className="line-clamp-2 text-sm font-extrabold leading-5 text-slate-950 sm:text-base sm:leading-6">
            <Link
              href={productHref}
              className="transition hover:text-slate-700"
              onClick={onProductClick}
            >
              {product.name}
            </Link>
          </h3>

          {isGoldProduct ? (
            <p className="mt-2 line-clamp-2 text-xs leading-6 text-slate-600 sm:text-sm">
              {product.description}
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="text-base font-bold text-slate-950 sm:text-lg">
                {formatPrice(
                  discountedPrice(product.price, discountPercent ?? null),
                )}
              </p>

              {hasDiscount ? (
                <p className="text-[11px] font-semibold text-slate-400 line-through">
                  {formatPrice(product.price)}
                </p>
              ) : null}
            </div>
          )}

          <div className="mt-3 border-t border-slate-100 pt-2">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <div className="min-w-0">
                <p className="line-clamp-1 text-xs font-bold text-slate-900 sm:text-sm">
                  {store.name}
                </p>
                <p className="mt-0.5 line-clamp-1 text-[11px] font-bold text-slate-500">
                  {store.floor}
                </p>
              </div>

              <Link
                href={storeHref}
                onClick={onStoreClick}
                className="shrink-0 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-extrabold text-white transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 sm:px-3 sm:text-xs"
              >
                رفتن به فروشگاه
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
