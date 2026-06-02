import Link from "next/link";
import type { Product, Store } from "@/types";
import { discountedPrice, formatPrice, toPersianDigits } from "@/lib/format";
import { SmartImage } from "@/components/smart-image";

interface ProductCardProps {
  product: Product;
  store?: Store;
}

export function ProductCard({ product, store }: ProductCardProps) {
  const finalPrice = discountedPrice(product.price, product.discount);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/5 transition hover:-translate-y-0.5 hover:shadow-md lg:rounded-xl">
      <div className="relative h-40 w-full md:h-48 lg:h-44">
        <SmartImage
          src={product.image}
          alt={product.name}
          fill
          className="object-cover"
          fallbackSrc="/images/fallback-image.svg"
          sizes="(min-width: 1024px) 280px, (min-width: 768px) 320px, 220px"
        />
        {product.isNew && (
          <span className="absolute right-2 top-2 rounded-full bg-emerald-500 px-2 py-1 text-[11px] font-bold text-white md:text-xs">
            کالکشن جدید
          </span>
        )}
      </div>
      <div className="space-y-2 p-3 md:p-4 md:space-y-2.5">
        <h3 className="line-clamp-2 text-sm font-bold leading-6 text-slate-900 md:text-base md:leading-7">{product.name}</h3>
        {store && <p className="text-xs text-slate-500 md:text-sm">{store.name}</p>}
        <div className="flex items-center gap-2 md:gap-2.5">
          <span className="text-sm font-extrabold text-slate-900 md:text-base">{formatPrice(finalPrice)}</span>
          <span className="text-xs text-slate-400 line-through md:text-sm">{formatPrice(product.price)}</span>
          <span className="rounded-full bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 md:text-xs">
            %{toPersianDigits(product.discount)}
          </span>
        </div>
        <Link
          href={`/product/${product.id}`}
          className="block rounded-xl bg-slate-900 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-slate-700 md:rounded-lg md:py-2.5 md:text-sm"
        >
          مشاهده محصول
        </Link>
      </div>
    </article>
  );
}
