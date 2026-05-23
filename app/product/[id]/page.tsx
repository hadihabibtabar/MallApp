import { notFound } from "next/navigation";
import { ProductOpenedTracker } from "@/components/analytics-trackers";
import { SmartImage } from "@/components/smart-image";
import { StoreNavigationLink } from "@/components/store-navigation-cta";
import { discountedPrice, formatPrice, toPersianDigits } from "@/lib/format";
import { getProductById, getStoreById } from "@/lib/mock-data";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = getProductById(id);

  if (!product) {
    notFound();
  }

  const store = getStoreById(product.storeId);

  if (!store) {
    notFound();
  }

  const finalPrice = discountedPrice(product.price, product.discount);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md space-y-5 px-4 pb-10 pt-4">
      <ProductOpenedTracker productId={product.id} storeId={store.id} productDiscount={product.discount} />

      <section className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-900/5">
        <div className="relative h-72 w-full">
          <SmartImage
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
            fallbackSrc="/images/fallback-image.svg"
            sizes="420px"
            priority
          />
          <div className="absolute right-3 top-3 rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white">
            %{toPersianDigits(product.discount)} تخفیف
          </div>
        </div>
        <div className="space-y-3 p-4">
          <h1 className="text-xl font-black text-slate-900">{product.name}</h1>
          <p className="text-sm leading-7 text-slate-600">{product.description}</p>
          <div className="flex items-center gap-2">
            <p className="text-lg font-black text-slate-900">{formatPrice(finalPrice)}</p>
            <p className="text-sm text-slate-400 line-through">{formatPrice(product.price)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
        <h2 className="text-base font-extrabold text-slate-900">اطلاعات فروشگاه</h2>
        <div className="mt-3 space-y-2 text-sm text-slate-600">
          <p>
            <span className="font-bold text-slate-800">فروشگاه:</span> {store.name}
          </p>
          <p>
            <span className="font-bold text-slate-800">طبقه:</span> {store.floor}
          </p>
          <p>
            <span className="font-bold text-slate-800">موقعیت:</span> {store.locationHint}
          </p>
        </div>
      </section>

      <StoreNavigationLink
        href={`/store/${store.id}#route`}
        source="product_page"
        storeId={store.id}
        productId={product.id}
        className="block rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-slate-700"
      >
        رفتن به فروشگاه
      </StoreNavigationLink>
    </main>
  );
}
