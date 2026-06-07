"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { DealsViewedTracker } from "@/components/analytics-trackers";
import { DealCard } from "@/components/deal-card";
import { ProductCard } from "@/components/product-card";
import { SmartImage } from "@/components/smart-image";
import { trackSearchIntent, trackSearchPerformed } from "@/lib/posthog";
import type { Deal, DealView, Product, Store } from "@/types";

interface DealsListProps {
  products: Product[];
  stores: Store[];
}

interface StoredDeal {
  productId: string;
  startedAt: string;
  expiresAt: string;
  hideAt: string;
}

interface ProductStoreItem {
  product: Product;
  store: Store;
}

type ProductSearchResult =
  | {
      type: "deal";
      item: DealView;
    }
  | {
      type: "product";
      product: Product;
      store: Store;
    };

type DiscountedProduct = Product & { discount: number };
type FeedProduct = Product & {
  category?: string;
  createdAt?: string;
  isNewCollection?: boolean;
};
type FeedStore = Store & {
  featuredScore?: number;
  type?: string;
};

const STORAGE_KEY = "hamilia-active-deals-v1";
const TARGET_DEAL_COUNT = 5;
const HIDE_AFTER_EXPIRED_MS = 5 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MIN_DEAL_HOURS = 1;
const MAX_DEAL_HOURS = 5;
const SELECTION_START_HOUR = 8;
const SELECTION_END_HOUR = 23;
const SUGGESTED_LIMIT = 6;
const COLLECTION_LIMIT = 8;
const FEATURED_STORES_LIMIT = 4;
const NEW_COLLECTION_WINDOW_MS = 21 * DAY_MS;

const foodIntentKeywords = [
  "food",
  "cafe",
  "coffee",
  "brioche",
  "hyperstar",
  "غذا",
  "کافه",
  "قهوه",
  "خوراک",
  "نوشیدنی",
  "صبحانه",
];

function matchesSearch(value: string | undefined, query: string): boolean {
  return value?.toLowerCase().includes(query) ?? false;
}

function normalizeText(value: string | undefined): string {
  return value?.toLowerCase() ?? "";
}

function isDiscountedProduct(product: Product): product is DiscountedProduct {
  return typeof product.discount === "number" && product.discount > 0;
}

function isSelectionWindowOpen(now: Date): boolean {
  const hour = now.getHours();
  return hour >= SELECTION_START_HOUR && hour < SELECTION_END_HOUR;
}

function getSelectionWindowEnd(now: Date): Date {
  const end = new Date(now);
  end.setHours(SELECTION_END_HOUR, 0, 0, 0);
  return end;
}

function getTime(value: string): number | null {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function stableHash(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 10_000;
  }

  return hash;
}

function compareDealsByExpiryStatus(
  firstExpiresAt: string,
  secondExpiresAt: string,
  nowMs: number,
): number {
  const firstExpiresAtMs = getTime(firstExpiresAt) ?? 0;
  const secondExpiresAtMs = getTime(secondExpiresAt) ?? 0;
  const firstIsExpired = firstExpiresAtMs <= nowMs;
  const secondIsExpired = secondExpiresAtMs <= nowMs;

  if (firstIsExpired !== secondIsExpired) {
    return firstIsExpired ? 1 : -1;
  }

  return firstExpiresAtMs - secondExpiresAtMs;
}

function compareActiveDealPriority(
  first: DealView,
  second: DealView,
): number {
  const discountDifference = second.deal.discount - first.deal.discount;

  if (discountDifference !== 0) {
    return discountDifference;
  }

  return (
    (getTime(first.deal.expiresAt) ?? 0) - (getTime(second.deal.expiresAt) ?? 0)
  );
}

function isStoredDeal(value: unknown): value is StoredDeal {
  if (!value || typeof value !== "object") {
    return false;
  }

  const deal = value as StoredDeal;

  return (
    typeof deal.productId === "string" &&
    typeof deal.startedAt === "string" &&
    typeof deal.expiresAt === "string" &&
    typeof deal.hideAt === "string" &&
    getTime(deal.startedAt) !== null &&
    getTime(deal.expiresAt) !== null &&
    getTime(deal.hideAt) !== null
  );
}

function readStoredDeals(): StoredDeal[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isStoredDeal) : [];
  } catch {
    return [];
  }
}

function persistStoredDeals(deals: StoredDeal[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
}

function getRandomDealHours(): number {
  return (
    Math.floor(Math.random() * (MAX_DEAL_HOURS - MIN_DEAL_HOURS + 1)) +
    MIN_DEAL_HOURS
  );
}

function shuffleProducts(products: Product[]): Product[] {
  return products
    .map((product) => ({ product, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map((item) => item.product);
}

function createStoredDeal(product: Product, now: Date): StoredDeal {
  const durationHours = getRandomDealHours();
  const startedAtMs = now.getTime();
  const expiresAtMs = Math.min(
    startedAtMs + durationHours * HOUR_MS,
    getSelectionWindowEnd(now).getTime(),
  );

  return {
    productId: product.id,
    startedAt: new Date(startedAtMs).toISOString(),
    expiresAt: new Date(expiresAtMs).toISOString(),
    hideAt: new Date(expiresAtMs + HIDE_AFTER_EXPIRED_MS).toISOString(),
  };
}

function syncStoredDeals(
  currentDeals: StoredDeal[],
  products: Product[],
  storeById: Map<string, Store>,
  now: Date,
): StoredDeal[] {
  const nowMs = now.getTime();

  if (!isSelectionWindowOpen(now)) {
    return [];
  }

  const discountedProducts = products.filter(
    (product) => isDiscountedProduct(product) && storeById.has(product.storeId),
  );
  const discountedById = new Map(
    discountedProducts.map((product) => [product.id, product]),
  );
  const targetCount = Math.min(TARGET_DEAL_COUNT, discountedProducts.length);
  const seenProductIds = new Set<string>();
  const visibleDeals = currentDeals
    .filter((deal) => {
      if (
        seenProductIds.has(deal.productId) ||
        !discountedById.has(deal.productId)
      ) {
        return false;
      }

      const hideAtMs = getTime(deal.hideAt);

      if (hideAtMs === null || hideAtMs <= nowMs) {
        return false;
      }

      seenProductIds.add(deal.productId);
      return true;
    })
    .sort((a, b) =>
      compareDealsByExpiryStatus(a.expiresAt, b.expiresAt, nowMs),
    )
    .slice(0, targetCount);

  if (visibleDeals.length >= targetCount) {
    return visibleDeals;
  }

  const visibleProductIds = new Set(visibleDeals.map((deal) => deal.productId));
  const candidates = shuffleProducts(
    discountedProducts.filter((product) => !visibleProductIds.has(product.id)),
  );
  const nextDeals = [...visibleDeals];

  while (nextDeals.length < targetCount && candidates.length > 0) {
    const product = candidates.shift();

    if (product) {
      nextDeals.push(createStoredDeal(product, now));
    }
  }

  return nextDeals.sort((a, b) =>
    compareDealsByExpiryStatus(a.expiresAt, b.expiresAt, nowMs),
  );
}

function toDealView(
  storedDeal: StoredDeal,
  productById: Map<string, Product>,
  storeById: Map<string, Store>,
): DealView | null {
  const product = productById.get(storedDeal.productId);

  if (!product || !isDiscountedProduct(product)) {
    return null;
  }

  const store = storeById.get(product.storeId);
  const startedAtMs = getTime(storedDeal.startedAt);
  const expiresAtMs = getTime(storedDeal.expiresAt);

  if (!store || startedAtMs === null || expiresAtMs === null) {
    return null;
  }

  const expiresInHours = Math.max(
    MIN_DEAL_HOURS,
    Math.round((expiresAtMs - startedAtMs) / HOUR_MS),
  );
  const deal: Deal = {
    id: `deal-${product.id}-${startedAtMs}`,
    storeId: product.storeId,
    productId: product.id,
    title: product.name,
    discount: product.discount,
    expiresInHours,
    tag: store.category,
    expiresAt: storedDeal.expiresAt,
  };

  return { deal, store, product };
}

function toProductStoreItems(
  products: Product[],
  storeById: Map<string, Store>,
): ProductStoreItem[] {
  return products
    .map((product) => {
      const store = storeById.get(product.storeId);
      return store ? { product, store } : null;
    })
    .filter((item): item is ProductStoreItem => Boolean(item));
}

function isFoodIntentItem({ product, store }: ProductStoreItem): boolean {
  const feedProduct = product as FeedProduct;
  const feedStore = store as FeedStore;
  const searchableText = [
    product.id,
    product.name,
    product.tag,
    product.description,
    feedProduct.category,
    store.id,
    store.name,
    store.brand,
    store.category,
    feedStore.type,
  ]
    .map(normalizeText)
    .join(" ");

  return foodIntentKeywords.some((keyword) => searchableText.includes(keyword));
}

function isFreshCollectionItem(item: ProductStoreItem, nowMs: number): boolean {
  const feedProduct = item.product as FeedProduct;

  if (feedProduct.isNewCollection || item.product.isNew) {
    return true;
  }

  if (!feedProduct.createdAt) {
    return false;
  }

  const createdAtMs = getTime(feedProduct.createdAt);

  return (
    createdAtMs !== null &&
    createdAtMs <= nowMs &&
    nowMs - createdAtMs <= NEW_COLLECTION_WINDOW_MS
  );
}

function rotateItems<T>(items: T[], seed: number): T[] {
  if (items.length <= 1) {
    return items;
  }

  const offset = Math.abs(seed) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function scoreFeaturedStore(store: Store): number {
  const feedStore = store as FeedStore;

  if (typeof feedStore.featuredScore === "number") {
    return feedStore.featuredScore;
  }

  return (
    stableHash(store.id) +
    store.productIds.length * 23 +
    store.dealIds.length * 17
  );
}

function NightDealsMessage() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-center shadow-sm ring-1 ring-amber-100 md:col-span-2 lg:col-span-3">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-amber-200 bg-white text-sm font-black text-amber-700 shadow-sm">
        ۸:۰۰
      </div>
      <p className="text-sm font-extrabold text-slate-900 md:text-base">
        تخفیف‌های فعال از ساعت ۸ صبح دوباره تازه می‌شوند.
      </p>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-6 text-slate-600 md:text-sm">
        تا آن موقع پیشنهادهای غذا، کالکشن‌ها و فروشگاه‌های منتخب پایین صفحه آماده‌اند.
      </p>
    </div>
  );
}

function FeedSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-extrabold text-slate-950 md:text-lg">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function HorizontalRail({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 pt-1 md:mx-0 md:px-0">
      {children}
    </div>
  );
}

function FeedProductTile({
  product,
  store,
  href,
  ctaLabel,
  badgeLabel,
}: {
  product: Product;
  store: Store;
  href: string;
  ctaLabel: string;
  badgeLabel?: string;
}) {
  return (
    <article className="flex w-40 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/5 md:w-48">
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden">
        <SmartImage
          src={product.image}
          alt={product.name}
          fill
          className="object-cover"
          fallbackSrc="/images/fallback-image.svg"
          sizes="(min-width: 768px) 192px, 160px"
        />
        {badgeLabel ? (
          <span className="absolute right-2 top-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold text-slate-700 shadow-sm">
            {badgeLabel}
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-3">
        <Link
          href={href}
          className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-slate-950"
        >
          {product.name}
        </Link>
        <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">
          {store.name}
        </p>
        <p className="line-clamp-1 text-[11px] text-slate-400">{store.floor}</p>
        <Link
          href={href}
          className="mt-3 inline-flex h-9 items-center justify-center rounded-xl bg-slate-900 px-3 text-xs font-bold text-white transition hover:bg-slate-700"
        >
          {ctaLabel}
        </Link>
      </div>
    </article>
  );
}

function FeaturedStoreTile({ store }: { store: Store }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/5">
      <Link
        href={`/store/${store.id}`}
        className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 p-3 md:grid-cols-1 md:gap-0 md:p-0"
      >
        <div className="relative h-24 overflow-hidden rounded-xl md:h-36 md:rounded-b-none md:rounded-t-2xl">
          <SmartImage
            src={store.heroImage}
            alt={store.name}
            fill
            className="object-cover"
            fallbackSrc="/images/fallback-image.svg"
            sizes="(min-width: 768px) 260px, 104px"
          />
        </div>
        <div className="flex min-w-0 flex-col justify-between md:p-3">
          <div className="min-w-0">
            <h3 className="line-clamp-1 text-sm font-extrabold text-slate-950 md:text-base">
              {store.name}
            </h3>
            <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">
              {store.category}
            </p>
            <p className="mt-1 line-clamp-1 text-[11px] text-slate-400">
              {store.floor} · {store.locationHint}
            </p>
          </div>
          <span className="mt-3 inline-flex h-9 items-center justify-center rounded-xl bg-slate-900 px-3 text-xs font-bold text-white md:w-full">
            مشاهده فروشگاه
          </span>
        </div>
      </Link>
    </article>
  );
}

function FeedEmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm leading-7 text-slate-500 md:col-span-2 lg:col-span-3">
      {children}
    </div>
  );
}

export function DealsList({ products, stores }: DealsListProps) {
  const [query, setQuery] = useState("");
  const [storedDeals, setStoredDeals] = useState<StoredDeal[]>([]);
  const [hasLoadedDeals, setHasLoadedDeals] = useState(false);
  const [isDealSelectionClosed, setIsDealSelectionClosed] = useState(false);
  const [sortNowMs, setSortNowMs] = useState(() => Date.now());
  const normalizedQuery = query.trim().toLowerCase();
  const isSearching = normalizedQuery.length > 0;

  const storeById = useMemo(() => {
    return new Map(stores.map((store) => [store.id, store]));
  }, [stores]);

  const productById = useMemo(() => {
    return new Map(products.map((product) => [product.id, product]));
  }, [products]);

  useEffect(() => {
    const refreshDeals = () => {
      const now = new Date();
      setSortNowMs(now.getTime());

      setIsDealSelectionClosed(!isSelectionWindowOpen(now));
      setStoredDeals((currentDeals) => {
        const sourceDeals =
          currentDeals.length > 0 ? currentDeals : readStoredDeals();
        const nextDeals = syncStoredDeals(
          sourceDeals,
          products,
          storeById,
          now,
        );

        persistStoredDeals(nextDeals);

        return nextDeals;
      });
      setHasLoadedDeals(true);
    };

    refreshDeals();

    const intervalId = window.setInterval(refreshDeals, 30_000);

    return () => window.clearInterval(intervalId);
  }, [products, storeById]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setSortNowMs(Date.now());
    }, 1_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const deals = useMemo(() => {
    return storedDeals
      .map((storedDeal) => toDealView(storedDeal, productById, storeById))
      .filter((item): item is DealView => Boolean(item))
      .sort((a, b) =>
        compareDealsByExpiryStatus(
          a.deal.expiresAt,
          b.deal.expiresAt,
          sortNowMs,
        ),
      );
  }, [productById, sortNowMs, storeById, storedDeals]);

  const activeDeals = useMemo(() => {
    return deals
      .filter((item) => {
        const expiresAtMs = getTime(item.deal.expiresAt);
        return (
          item.deal.discount > 0 &&
          expiresAtMs !== null &&
          expiresAtMs > sortNowMs
        );
      })
      .sort(compareActiveDealPriority);
  }, [deals, sortNowMs]);

  const dealByProductId = useMemo(() => {
    const dealMap = new Map<string, DealView>();

    deals.forEach((item) => {
      if (!dealMap.has(item.product.id)) {
        dealMap.set(item.product.id, item);
      }
    });

    return dealMap;
  }, [deals]);

  const feedItems = useMemo(() => {
    return toProductStoreItems(products, storeById);
  }, [products, storeById]);

  const suggestedItems = useMemo(() => {
    const foodItems = feedItems.filter(isFoodIntentItem);
    const sourceItems = foodItems.length > 0 ? foodItems : feedItems;

    return [...sourceItems]
      .sort((first, second) => stableHash(first.product.id) - stableHash(second.product.id))
      .slice(0, SUGGESTED_LIMIT);
  }, [feedItems]);

  const newCollectionItems = useMemo(() => {
    const dailySeed = Math.floor(sortNowMs / DAY_MS);
    const freshItems = feedItems.filter((item) =>
      isFreshCollectionItem(item, sortNowMs),
    );
    const sourceItems = freshItems.length > 0 ? freshItems : feedItems;
    const prioritizedItems = [...sourceItems].sort((first, second) => {
      const firstIsFullPrice = first.product.discount === null ? 0 : 1;
      const secondIsFullPrice = second.product.discount === null ? 0 : 1;

      if (firstIsFullPrice !== secondIsFullPrice) {
        return firstIsFullPrice - secondIsFullPrice;
      }

      return stableHash(first.product.id) - stableHash(second.product.id);
    });

    return rotateItems(prioritizedItems, dailySeed).slice(0, COLLECTION_LIMIT);
  }, [feedItems, sortNowMs]);

  const featuredStores = useMemo(() => {
    return [...stores]
      .sort((first, second) => scoreFeaturedStore(second) - scoreFeaturedStore(first))
      .slice(0, FEATURED_STORES_LIMIT);
  }, [stores]);

  const productSearchResults = useMemo<ProductSearchResult[]>(() => {
    if (!isSearching) {
      return [];
    }

    const results: ProductSearchResult[] = [];

    products.forEach((product) => {
      const store = storeById.get(product.storeId);

      if (!store) {
        return;
      }

      const matchesProduct =
        matchesSearch(product.name, normalizedQuery) ||
        matchesSearch(product.description, normalizedQuery) ||
        matchesSearch(product.tag, normalizedQuery) ||
        matchesSearch(product.isNew ? "کالکشن جدید new collection" : undefined, normalizedQuery) ||
        matchesSearch(store.name, normalizedQuery) ||
        matchesSearch(store.brand, normalizedQuery) ||
        matchesSearch(store.category, normalizedQuery);

      if (!matchesProduct) {
        return;
      }

      const deal = dealByProductId.get(product.id);

      if (deal) {
        results.push({ type: "deal", item: deal });
        return;
      }

      results.push({ type: "product", product, store });
    });

    return results;
  }, [
    dealByProductId,
    isSearching,
    normalizedQuery,
    products,
    storeById,
  ]);

  const hasNoSearchResults = isSearching && productSearchResults.length === 0;

  useEffect(() => {
    trackSearchIntent({
      search_query: query,
      results_count: productSearchResults.length,
      has_results: productSearchResults.length > 0,
    });
  }, [productSearchResults.length, query]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const searchQuery = query.trim();

    if (!searchQuery) {
      return;
    }

    trackSearchPerformed({
      search_query: searchQuery,
      results_count: productSearchResults.length,
      search_type: "submit",
      has_results: productSearchResults.length > 0,
    });
  };

  return (
    <>
      <DealsViewedTracker dealCount={activeDeals.length} />

      <section className="sticky top-2 z-30 -mx-1 rounded-2xl border border-white/80 bg-white/95 p-2.5 shadow-soft ring-1 ring-slate-900/5 backdrop-blur md:top-20 md:mx-0 md:p-3">
        <form className="relative" onSubmit={handleSearchSubmit}>
          <label htmlFor="deals-search" className="sr-only">
            جستجو در تخفیف‌ها، محصولات و کالکشن‌ها
          </label>
          <input
            id="deals-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جستجو بین تخفیف‌ها، محصولات و کالکشن‌ها"
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-0 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white md:h-14 md:px-5 md:text-base md:shadow-sm"
          />
        </form>
      </section>

      {isSearching ? (
        <FeedSection title="نتایج جستجو" className="pt-1">
          <div className="space-y-2.5 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:grid-cols-3">
            {productSearchResults.map((result) =>
              result.type === "deal" ? (
                <DealCard
                  key={`deal-${result.item.deal.id}`}
                  item={result.item}
                />
              ) : (
                <ProductCard
                  key={`product-${result.product.id}`}
                  product={result.product}
                  store={result.store}
                  variant="compact"
                />
              ),
            )}

            {hasNoSearchResults ? (
              <FeedEmptyState>نتیجه‌ای برای جستجوی شما پیدا نشد.</FeedEmptyState>
            ) : null}
          </div>
        </FeedSection>
      ) : (
        <div className="space-y-6 pt-1 md:space-y-8">
          <FeedSection title="🔥 تخفیف‌های فعال">
            <div className="space-y-2.5 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:grid-cols-3">
              {!hasLoadedDeals ? (
                <FeedEmptyState>در حال آماده‌سازی پیشنهادهای امروز...</FeedEmptyState>
              ) : activeDeals.length > 0 ? (
                activeDeals.map((item) => (
                  <DealCard key={item.deal.id} item={item} />
                ))
              ) : isDealSelectionClosed ? (
                <NightDealsMessage />
              ) : (
                <FeedEmptyState>
                  فعلاً تخفیف فعالی پیدا نشد؛ پیشنهادهای دیگر همین صفحه آماده‌اند.
                </FeedEmptyState>
              )}
            </div>
          </FeedSection>

          <FeedSection title="🍽 پیشنهاد برای شما">
            <HorizontalRail>
              {suggestedItems.map(({ product, store }) => (
                <FeedProductTile
                  key={`suggested-${product.id}`}
                  product={product}
                  store={store}
                  href={`/store/${store.id}`}
                  ctaLabel="بازدید"
                />
              ))}
            </HorizontalRail>
          </FeedSection>

          <FeedSection title="✨ کالکشن‌های جدید">
            <HorizontalRail>
              {newCollectionItems.map(({ product, store }) => (
                <FeedProductTile
                  key={`collection-${product.id}`}
                  product={product}
                  store={store}
                  href={`/product/${product.id}`}
                  ctaLabel="کاوش"
                  badgeLabel="جدید"
                />
              ))}
            </HorizontalRail>
          </FeedSection>

          <FeedSection title="🏬 فروشگاه‌های منتخب">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {featuredStores.map((store) => (
                <FeaturedStoreTile key={store.id} store={store} />
              ))}
            </div>
          </FeedSection>
        </div>
      )}
    </>
  );
}
