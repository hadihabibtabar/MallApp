import type { Product, Store } from "@/types";
import {
  discountedPrice,
  formatPrice,
  isGoldProductTag,
  toPersianDigits,
} from "@/lib/format";
import { buildSourceTabHref } from "@/lib/analytics-context";
import {
  getProductImageTransitionName,
  getProductTitleTransitionName,
} from "@/lib/view-transitions";
import { CatalogResultCard } from "@/components/catalog-result-card";
import { SmartImage } from "@/components/smart-image";
import { TransitionLink } from "@/components/view-transition";
import type { AnalyticsSourceTab } from "@/lib/analytics-context";

interface ProductCardProps {
  product: Product;
  store?: Store;
  variant?: "grid" | "compact";
  sourceTab?: AnalyticsSourceTab;
  statusLabel?: string;
  statusTone?: "active" | "muted";
  onProductClick?: () => void;
  onStoreClick?: () => void;
}

export function ProductCard({
  product,
  store,
  variant = "grid",
  sourceTab,
  statusLabel,
  statusTone,
  onProductClick,
  onStoreClick,
}: ProductCardProps) {
  const isGoldProduct = isGoldProductTag(product.tag);
  const discountPercent =
    typeof product.discount === "number" && product.discount > 0
      ? product.discount
      : null;

  if (variant === "compact" && store) {
    return (
      <CatalogResultCard
        product={product}
        store={store}
        discountPercent={discountPercent}
        // statusLabel={statusLabel}
        statusTone={statusTone}
        sourceTab={sourceTab}
        onProductClick={onProductClick}
        onStoreClick={onStoreClick}
      />
    );
  }

  const productHref = buildSourceTabHref(`/product/${product.id}`, sourceTab);
  const productImageTransitionName = getProductImageTransitionName(product.id);
  const productTitleTransitionName = getProductTitleTransitionName(product.id);

  return (
    <TransitionLink
      href={productHref}
      className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/5 transition hover:-translate-y-0.5 hover:shadow-md lg:rounded-xl"
      onClick={onProductClick}
    >
      <article>
        <div
          className="relative h-40 w-full md:h-48 lg:h-44"
          style={{ viewTransitionName: productImageTransitionName }}
        >
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
          />

          {product.isNew && (
            <span className="absolute right-2 top-2 rounded-full bg-emerald-500 px-2 py-1 text-[11px] font-bold text-white">
              کالکشن جدید
            </span>
          )}

          {discountPercent !== null ? (
            <span
              className={`absolute right-2 rounded-full bg-rose-500 px-2 py-1 text-[11px] font-bold text-white shadow-sm ${
                product.isNew ? "top-10" : "top-2"
              }`}
            >
              %{toPersianDigits(discountPercent)}
            </span>
          ) : null}
        </div>

        <div className="space-y-2 p-3 md:p-4">
          <h3
            className="line-clamp-2 text-sm font-bold text-slate-900 md:text-base"
            style={{ viewTransitionName: productTitleTransitionName }}
          >
            {product.name}
          </h3>

          {store && <p className="text-xs text-slate-500">{store.name}</p>}

          {isGoldProduct ? (
            <div className="space-y-2">
              <p className="line-clamp-2 text-xs leading-6 text-slate-600 md:text-sm">
                {product.description}
              </p>

            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-slate-900 md:text-base">
                {formatPrice(discountedPrice(product.price, product.discount))}
              </span>

              {discountPercent !== null ? (
                <span className="text-xs text-slate-400 line-through">
                  {formatPrice(product.price)}
                </span>
              ) : null}


            </div>
          )}

          <span className="block rounded-xl bg-slate-900 px-3 py-2 text-center text-xs font-semibold text-white transition group-hover:bg-slate-700">
            جزئیات محصول
          </span>
        </div>
      </article>
    </TransitionLink>
  );
}
