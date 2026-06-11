import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { SmartImage } from "@/components/smart-image";
import { StoreOpenedTracker } from "@/components/analytics-trackers";
import { StoreNavigationButton } from "@/components/store-navigation-cta";
import { toPersianDigits } from "@/lib/format";
import { normalizeAnalyticsSourceTab } from "@/lib/analytics-context";
import { getStoreById, getStoreProducts } from "@/lib/mock-data";

interface StorePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ source_tab?: string | string[] }>;
}

export default async function StorePage({
  params,
  searchParams,
}: StorePageProps) {
  const { id } = await params;
  const { source_tab: sourceTabParam } = await searchParams;
  const store = getStoreById(id);

  if (!store) {
    notFound();
  }

  const products = getStoreProducts(store.id);
  const sourceTab = normalizeAnalyticsSourceTab(sourceTabParam);
const paymentIcons = {
  digipay: "/images/digipay.webp",
  snapppay: "/images/snapppay.webp",
  tarapay: "/images/tarapay.webp",
};
  const paymentMethods = store.paymentMethods ?? [];
  return (
    <main className="mx-auto min-h-screen w-full max-w-md space-y-5 px-4 pb-10 pt-4 md:max-w-2xl md:px-6 md:py-8 lg:max-w-5xl lg:px-8">
      <StoreOpenedTracker
        storeId={store.id}
        storeCategory={store.category}
        storeFloor={store.floor}
        collectionSize={products.length}
        sourceTab={sourceTab}
      />

      <section className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-900/5">
        <div className="relative h-56 w-full md:h-64 lg:h-80">
          <SmartImage
            src={store.heroImage}
            alt={store.name}
            fill
            className="object-cover"
            fallbackSrc="/images/fallback-image.svg"
            sizes="(min-width: 1024px) 800px, (min-width: 768px) 600px, 420px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
          <div className="absolute bottom-4 right-4 text-white md:bottom-6 md:right-6">
            <p className="text-xs text-white/90 md:text-sm">{store.category}</p>
            <h1 className="text-2xl font-black md:text-3xl lg:text-4xl">{store.name}</h1>
            <p className="text-xs text-white/90 md:text-sm">{store.floor}</p>
          </div>
        </div>
<div className="space-y-3 p-4 md:p-6 md:space-y-4">
  <div className="flex items-start justify-between gap-4">
    <p className="flex-1 text-sm leading-7 text-slate-600 md:text-base md:leading-8">
      {store.description}
    </p>

    {paymentMethods.length > 0 && (
      <div className="flex shrink-0 items-center gap-2">
        {paymentMethods.map((method) => (
          <img
            key={method}
            src={paymentIcons[method]}
            alt={method}
            className="h-6 w-6 rounded-xl border border-slate-200 bg-white object-cover shadow-sm"
          />
        ))}
      </div>
    )}
  </div>

  <p className="rounded-2xl bg-slate-100 px-3 py-2 text-xs text-slate-700 md:text-sm">
    {store.locationHint}
  </p>
</div>
      </section>

      <section className="space-y-3 md:space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900 md:text-lg">کالکشن جدید</h2>
          <span className="text-xs text-slate-500 md:text-sm">{toPersianDigits(products.length)} محصول</span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              sourceTab={sourceTab ?? "stores"}
            />
          ))}
        </div>
      </section>

      <section id="route" className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-900/5 md:p-6">
        <h2 className="text-base font-extrabold text-slate-900 md:text-lg">مسیر</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600 md:text-base md:leading-8">
          به {store.floor} بروید، {store.locationHint}. تابلوهای راهنما تا جلوی فروشگاه شما را همراهی می‌کنند.
        </p>
        {/* <StoreNavigationButton
          source="store_page"
          storeId={store.id}
          className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-700 md:py-4 md:text-base md:rounded-xl"
        >
          رفتن به فروشگاه
        </StoreNavigationButton> */}
      </section>
    </main>
  );
}
