import { notFound } from "next/navigation";
import { ProductOpenedTracker } from "@/components/analytics-trackers";
import { SmartImage } from "@/components/smart-image";
import { StoreNavigationLink } from "@/components/store-navigation-cta";
import {
  discountedPrice,
  formatPrice,
  isGoldProductTag,
  toPersianDigits,
} from "@/lib/format";
import {
  buildSourceTabHref,
  normalizeAnalyticsSourceTab,
} from "@/lib/analytics-context";
import { getProductById, getStoreById } from "@/lib/mock-data";

interface ProductPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ source_tab?: string | string[] }>;
}

export default async function ProductPage({
  params,
  searchParams,
}: ProductPageProps) {
  const { id } = await params;
  const { source_tab: sourceTabParam } = await searchParams;
  const product = getProductById(id);

  if (!product) {
    notFound();
  }

  const store = getStoreById(product.storeId);

  if (!store) {
    notFound();
  }

  const isGoldProduct = isGoldProductTag(product.tag);
  const discountPercent =
    typeof product.discount === "number" && product.discount > 0
      ? product.discount
      : null;
  const sourceTab = normalizeAnalyticsSourceTab(sourceTabParam);
  const storeRouteHref = buildSourceTabHref(
    `/store/${store.id}#route`,
    sourceTab,
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-md space-y-5 px-4 pb-10 pt-4 md:max-w-2xl md:px-6 md:py-8 lg:max-w-4xl lg:px-8">
      <ProductOpenedTracker
        productId={product.id}
        storeId={store.id}
        storeCategory={store.category}
        storeFloor={store.floor}
        productDiscount={product.discount ?? undefined}
        sourceTab={sourceTab}
      />

      <div className="md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
        <section className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-slate-900/5">
          <div className="relative h-72 w-full md:h-96">
            <SmartImage
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
              placeholder="blur"
              blurDataURL="..."
              style={{
                objectFit: "cover",
              }}
              fallbackSrc="/images/fallback-image.svg"
              sizes="(min-width: 1024px) 400px, (min-width: 768px) 300px, 420px"
              priority
            />

            {/* badges container */}
            <div className="absolute right-3 top-3 flex flex-col gap-2 items-end">
              {discountPercent !== null && (
                <div className="rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white md:text-sm">
                  %{toPersianDigits(discountPercent)} تخفیف
                </div>
              )}

              {product.isNew && (
                <span className="rounded-full bg-emerald-500 px-2 py-1 text-[11px] font-bold text-white">
                  کالکشن جدید
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="rounded-3xl bg-white shadow-soft ring-1 ring-slate-900/5 p-4 md:p-6">
            <h1 className="text-xl font-black text-slate-900 md:text-2xl lg:text-3xl">
              {product.name}
            </h1>
            {isGoldProduct ? (
              <div className="mt-4 md:mt-5">
                <p className="text-[11px] font-black text-slate-400">
                  توضیحات محصول
                </p>
                <p className="mt-1 text-lg  leading-8 text-slate-900 md:text-2xl md:leading-10">
                  {product.description}
                </p>
              </div>
            ) : (
              <>
                <p className="mt-3 text-sm leading-7 text-slate-600 md:text-base md:leading-8">
                  {product.description}
                </p>
                <div className="mt-4 flex items-center gap-3 md:mt-5">
                  <p className="text-lg font-black text-slate-900 md:text-2xl">
                    {formatPrice(
                      discountedPrice(product.price, product.discount),
                    )}
                  </p>
                  {discountPercent !== null ? (
                    <p className="text-sm text-slate-400 line-through md:text-base">
                      {formatPrice(product.price)}
                    </p>
                  ) : null}
                </div>
              </>
            )}
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-900/5 md:p-6">
            <h2 className="text-base font-extrabold text-slate-900 md:text-lg">
              اطلاعات فروشگاه
            </h2>
            <div className="mt-3 space-y-2 text-sm text-slate-600 md:text-base">
              <p>
                <span className="font-bold text-slate-800">فروشگاه:</span>{" "}
                {store.name}
              </p>
              <p>
                <span className="font-bold text-slate-800">طبقه:</span>{" "}
                {store.floor}
              </p>
              <p>
                <span className="font-bold text-slate-800">موقعیت:</span>{" "}
                {store.locationHint}
              </p>
            </div>
          </section>

          <StoreNavigationLink
            href={storeRouteHref}
            source="product_page"
            sourceTab={sourceTab}
            storeId={store.id}
            storeCategory={store.category}
            storeFloor={store.floor}
            productId={product.id}
            className="block rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-slate-700 md:rounded-xl md:py-4 md:text-base"
          >
            رفتن به فروشگاه
          </StoreNavigationLink>
        </section>
      </div>
    </main>
  );
}
