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
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative h-40 w-full">
        <SmartImage
          src={product.image}
          alt={product.name}
          fill
          className="object-cover"
          fallbackSrc="/images/fallback-image.svg"
          sizes="220px"
        />
        {product.isNew && (
          <span className="absolute right-2 top-2 rounded-full bg-emerald-500 px-2 py-1 text-[11px] font-bold text-white">
            کالکشن جدید
          </span>
        )}
      </div>
      <div className="space-y-2 p-3">
        <h3 className="line-clamp-2 text-sm font-bold leading-6 text-slate-900">{product.name}</h3>
        {store && <p className="text-xs text-slate-500">{store.name}</p>}
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold text-slate-900">{formatPrice(finalPrice)}</span>
          <span className="text-xs text-slate-400 line-through">{formatPrice(product.price)}</span>
          <span className="rounded-full bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700">
            %{toPersianDigits(product.discount)}
          </span>
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
