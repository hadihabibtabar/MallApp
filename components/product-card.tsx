import Link from "next/link";
import type { Product, Store } from "@/types";
import { discountedPrice, formatPrice, toPersianDigits } from "@/lib/format";
import { SmartImage } from "@/components/smart-image";

interface ProductCardProps {
  product: Product;
  store?: Store;
  variant?: "grid" | "compact";
}

export function ProductCard({
  product,
  store,
  variant = "grid",
}: ProductCardProps) {
  const finalPrice = discountedPrice(product.price, product.discount);
  const paymentIcons = {
    digipay: "/images/digipay.webp",
    snapppay: "/images/snapppay.webp",
    tarapay: "/images/tarapay.webp",
  };
  const paymentMethods = product.paymentMethods ?? [];

  if (variant === "compact") {
    return (
      <article className="rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm ring-1 ring-slate-900/5 sm:p-3">
        <div className="flex items-start gap-2.5 sm:gap-3">
          {/* IMAGE + PAYMENT WRAPPER */}
          <div className="shrink-0">
            <Link
              href={`/product/${product.id}`}
              className="relative block h-24 w-24 overflow-hidden rounded-xl sm:h-28 sm:w-28"
            >
              <SmartImage
                src={product.image}
                alt={product.name}
                fill
                className="object-cover"
                fallbackSrc="/images/fallback-image.svg"
                sizes="(min-width: 640px) 112px, 96px"
              />
{product.discount !==null ?(
              <div className="absolute right-1 top-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
                %{toPersianDigits(product.discount)}
              </div> ):null}
            </Link>

            {/* PAYMENT METHODS (UNDER IMAGE) */}
            {paymentMethods.length > 0 && (
              <div className="mt-2 flex justify-center gap-1.5">
                {paymentMethods.map((method) => (
                  <img
                    key={method}
                    src={paymentIcons[method]}
                    alt={method}
                    className="h-6 w-6 rounded-md border border-slate-200 bg-white object-cover shadow-sm"
                  />
                ))}
              </div>
            )}
          </div>

          {/* CONTENT */}
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center justify-between gap-1.5 text-[10px]">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-600">
             {product.tag}
              </span>

              {product.isNew && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                  کالکشن جدید
                </span>
              )}
            </div>

            <h3 className="line-clamp-2 text-sm leading-5 text-slate-900 sm:text-base">
              <Link href={`/product/${product.id}`}>{product.name}</Link>
            </h3>

            <div className="mt-1.5">
              <p className="text-[10px] font-semibold text-slate-400">
                قیمت محصول
              </p>

              <div className="mt-0.5 flex items-center gap-1.5">
                  
                <p className="text-base text-slate-900 sm:text-lg">
                  {formatPrice(finalPrice)}
                </p>
                {product.discount !==null ?(
                <p className="text-[11px] text-slate-400 line-through">
                  {formatPrice(product.price)}
                </p>):null}
              </div>
            </div>

            <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <p className="line-clamp-1 min-w-0 text-[11px] text-slate-500">
                {store ? `${store.name} · ${store.floor}` : "فروشگاه محصول"}
              </p>

              <Link
                href={`/product/${product.id}`}
                className="shrink-0 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[14px] font-semibold text-white transition hover:bg-slate-700 sm:text-[11px]"
              >
                مشاهده محصول
              </Link>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/5 transition hover:-translate-y-0.5 hover:shadow-md lg:rounded-xl">
      <div className="relative h-40 w-full md:h-48 lg:h-44">
        <SmartImage
          src={product.image}
          alt={product.name}
          fill
          className="object-cover"
          fallbackSrc="/images/fallback-image.svg"
        />

        {product.isNew && (
          <span className="absolute right-2 top-2 rounded-full bg-emerald-500 px-2 py-1 text-[11px] font-bold text-white">
            کالکشن جدید
          </span>
        )}
      </div>

      <div className="space-y-2 p-3 md:p-4">
        <h3 className="line-clamp-2 text-sm font-bold text-slate-900 md:text-base">
          {product.name}
        </h3>

        {store && <p className="text-xs text-slate-500">{store.name}</p>}

        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold text-slate-900 md:text-base">
            {formatPrice(finalPrice)}
          </span>

          {product.discount ? (
            <span className="text-xs text-slate-400 line-through">
              {formatPrice(product.price)}
            </span>
          ) : null}

          {product.discount ? (
            <span className="rounded-full bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700">
              %{toPersianDigits(product.discount)}
            </span>
          ) : null}
        </div>

        <Link
          href={`/product/${product.id}`}
          className="block rounded-xl bg-slate-900 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-slate-700"
        >
          مشاهده محصول
        </Link>
      </div>
    </article>
  );
}
