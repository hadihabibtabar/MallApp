import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { SmartImage } from "@/components/smart-image";
import { StoreOpenedTracker } from "@/components/analytics-trackers";
import { StoreNavigationButton } from "@/components/store-navigation-cta";
import { toPersianDigits } from "@/lib/format";
import { getStoreById, getStoreProducts } from "@/lib/mock-data";

interface StorePageProps {
  params: Promise<{ id: string }>;
}

export default async function StorePage({ params }: StorePageProps) {
  const { id } = await params;
  const store = getStoreById(id);

  if (!store) {
    notFound();
  }

  const products = getStoreProducts(store.id);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md space-y-5 px-4 pb-10 pt-4">
      <StoreOpenedTracker
        storeId={store.id}
        storeCategory={store.category}
        storeFloor={store.floor}
        collectionSize={products.length}
      />

      <section className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-900/5">
        <div className="relative h-56 w-full">
          <SmartImage
            src={store.heroImage}
            alt={store.name}
            fill
            className="object-cover"
            fallbackSrc="/images/fallback-image.svg"
            sizes="420px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
          <div className="absolute bottom-4 right-4 text-white">
            <p className="text-xs text-white/90">{store.category}</p>
            <h1 className="text-2xl font-black">{store.name}</h1>
            <p className="text-xs text-white/90">{store.floor}</p>
          </div>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-sm leading-7 text-slate-600">{store.description}</p>
          <p className="rounded-2xl bg-slate-100 px-3 py-2 text-xs text-slate-700">{store.locationHint}</p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900">کالکشن جدید</h2>
          <span className="text-xs text-slate-500">{toPersianDigits(products.length)} محصول</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section id="route" className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
        <h2 className="text-base font-extrabold text-slate-900">مسیر</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          به {store.floor} بروید، {store.locationHint}. تابلوهای راهنما تا جلوی فروشگاه شما را همراهی می‌کنند.
        </p>
        <StoreNavigationButton
          source="store_page"
          storeId={store.id}
          className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white"
        >
          رفتن به فروشگاه
        </StoreNavigationButton>
      </section>
    </main>
  );
}
