"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  DealsViewedTracker,
  TabOpenedTracker,
} from "@/components/analytics-trackers";
import { DealCard } from "@/components/deal-card";
import { ProductCard } from "@/components/product-card";
import {
  FLOOR_LEVELS,
  getFloorLabel,
  parseStoreFloorToLevel,
} from "@/lib/floor-filter";
import { getCatalogSearchResults } from "@/lib/catalog-search";
import { toPersianDigits } from "@/lib/format";
import {
  trackCategoryChipClicked,
  trackSearchIntent,
  trackSearchPerformed,
  trackSearchResultClicked,
  trackVisitIntent,
} from "@/lib/posthog";
import type { FloorFilterValue } from "@/lib/floor-filter";
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

type DiscountedProduct = Product & { discount: number };

const ALL_TAG = "همه";
const FOOD_TAG = "غذا";
const FOOD_RELATED_TAGS = new Set([FOOD_TAG, "کافه", "صبحانه"]);
const STORAGE_KEY = "hamilia-active-deals-v1";
const FOOD_STORAGE_KEY = "hamilia-active-food-deals-v1";
const TARGET_DEAL_COUNT = 5;
const HIDE_AFTER_EXPIRED_MS = 5 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MIN_DEAL_HOURS = 1;
const MAX_DEAL_HOURS = 5;
const SELECTION_START_HOUR = 8;
const SELECTION_END_HOUR = 23;

function isDiscountedProduct(product: Product): product is DiscountedProduct {
  return typeof product.discount === "number" && product.discount > 0;
}

function isFoodRelatedProduct(
  product: Product,
  storeById: Map<string, Store>,
): boolean {
  const store = storeById.get(product.storeId);

  return (
    FOOD_RELATED_TAGS.has(product.tag.trim()) || store?.category === FOOD_TAG
  );
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

function readStoredDeals(storageKey = STORAGE_KEY): StoredDeal[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isStoredDeal) : [];
  } catch {
    return [];
  }
}

function persistStoredDeals(deals: StoredDeal[], storageKey = STORAGE_KEY) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(deals));
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
  shouldIncludeProduct: (product: Product) => boolean,
): StoredDeal[] {
  const nowMs = now.getTime();

  if (!isSelectionWindowOpen(now)) {
    return [];
  }

  const discountedProducts = products.filter(
    (product) =>
      isDiscountedProduct(product) &&
      storeById.has(product.storeId) &&
      shouldIncludeProduct(product),
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

function NightDealsMessage() {
  return (
    <div className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-sky-50 p-5 text-center shadow-sm ring-1 ring-amber-100 md:col-span-2 md:p-7 lg:col-span-3">
      <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-amber-200 bg-white text-sm font-black text-amber-700 shadow-sm">
        ۸:۰۰
        <span className="absolute -left-2 -top-2 rounded-full bg-slate-900 px-2 py-1 text-[10px] font-bold text-white">
          Zzz
        </span>
      </div>
      <p className="text-base font-extrabold text-slate-900 md:text-lg">
        ما و کیف پولت فعلاً آتش‌بس اعلام کردیم.🚀
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-600">
       💸 وسوسه‌ها از ساعت ۸ صبح شیفتشون شروع میشه!
      </p>
    </div>
  );
}

export function DealsList({ products, stores }: DealsListProps) {
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>(ALL_TAG);
  const [selectedFloor, setSelectedFloor] = useState<FloorFilterValue>("all");
  const [storedDeals, setStoredDeals] = useState<StoredDeal[]>([]);
  const [foodStoredDeals, setFoodStoredDeals] = useState<StoredDeal[]>([]);
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
          currentDeals.length > 0
            ? currentDeals
            : readStoredDeals(STORAGE_KEY);
        const nextDeals = syncStoredDeals(
          sourceDeals,
          products,
          storeById,
          now,
          (product) => !isFoodRelatedProduct(product, storeById),
        );

        persistStoredDeals(nextDeals, STORAGE_KEY);

        return nextDeals;
      });
      setFoodStoredDeals((currentDeals) => {
        const sourceDeals =
          currentDeals.length > 0
            ? currentDeals
            : readStoredDeals(FOOD_STORAGE_KEY);
        const nextDeals = syncStoredDeals(
          sourceDeals,
          products,
          storeById,
          now,
          (product) => isFoodRelatedProduct(product, storeById),
        );

        persistStoredDeals(nextDeals, FOOD_STORAGE_KEY);

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

  const foodDeals = useMemo(() => {
    return foodStoredDeals
      .map((storedDeal) => toDealView(storedDeal, productById, storeById))
      .filter((item): item is DealView => Boolean(item))
      .sort((a, b) =>
        compareDealsByExpiryStatus(
          a.deal.expiresAt,
          b.deal.expiresAt,
          sortNowMs,
        ),
      );
  }, [foodStoredDeals, productById, sortNowMs, storeById]);

  const activeFoodDealCount = useMemo(() => {
    return foodDeals.filter((item) => {
      const expiresAtMs = getTime(item.deal.expiresAt);
      return expiresAtMs !== null && expiresAtMs > sortNowMs;
    }).length;
  }, [foodDeals, sortNowMs]);

  const tags = useMemo(() => {
    return Array.from(new Set(deals.map((item) => item.deal.tag))).filter(
      (tag) => Boolean(tag) && tag !== FOOD_TAG,
    );
  }, [deals]);

  useEffect(() => {
    if (
      selectedTag !== ALL_TAG &&
      selectedTag !== FOOD_TAG &&
      !tags.includes(selectedTag)
    ) {
      setSelectedTag(ALL_TAG);
    }
  }, [selectedTag, tags]);

  const filteredDeals = useMemo(() => {
    if (isSearching) {
      return [];
    }

    const sourceDeals = selectedTag === FOOD_TAG ? foodDeals : deals;

    return sourceDeals.filter((item) => {
      const matchesTag =
        selectedTag === ALL_TAG ||
        selectedTag === FOOD_TAG ||
        item.deal.tag === selectedTag;
      const level = parseStoreFloorToLevel(item.store.floor);
      const matchesFloor = selectedFloor === "all" || level === selectedFloor;
      return matchesTag && matchesFloor;
    });
  }, [deals, foodDeals, isSearching, selectedTag, selectedFloor]);

  const productSearchResults = useMemo(() => {
    return getCatalogSearchResults({
      products,
      storeById,
      query: normalizedQuery,
      selectedFloor,
    });
  }, [normalizedQuery, products, selectedFloor, storeById]);
  const hasNoResults = isSearching
    ? productSearchResults.length === 0
    : hasLoadedDeals && filteredDeals.length === 0;

  useEffect(() => {
    trackSearchIntent({
      source_tab: "deals",
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
      source_tab: "deals",
      search_query: searchQuery,
      results_count: productSearchResults.length,
      search_type: "submit",
      has_results: productSearchResults.length > 0,
    });
  };

  const handleTagClick = (tag: string) => {
    setSelectedTag(tag);
    trackCategoryChipClicked({
      source_tab: "deals",
      category: tag,
    });
  };

  const handleSearchResultClick = (product: Product, store: Store) => {
    const searchQuery = query.trim();

    if (!searchQuery) {
      return;
    }

    trackSearchResultClicked({
      source_tab: "search",
      search_query: searchQuery,
      product_id: product.id,
      store_id: store.id,
      store_category: store.category,
      store_floor: store.floor,
      product_discount: product.discount ?? undefined,
    });
  };

  const handleSearchResultStoreClick = (product: Product, store: Store) => {
    const searchQuery = query.trim();

    handleSearchResultClick(product, store);

    trackVisitIntent({
      source_tab: "search",
      search_query: searchQuery || undefined,
      product_id: product.id,
      store_id: store.id,
      store_category: store.category,
      store_floor: store.floor,
      product_discount: product.discount ?? undefined,
      cta: "go_to_store",
    });
  };

  return (
    <>
      <TabOpenedTracker tab="deals" />
      <DealsViewedTracker dealCount={deals.length} />

      <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-sm ring-1 ring-slate-900/5 md:p-5">
        {/*Just Desktop  */}
        <label
          htmlFor="deals-search"
          className="mb-2 hidden text-sm font-bold text-slate-500 md:block"
        >
          جستجو در تخفیف‌ها و کالکشن جدید
        </label>

        <form className="relative" onSubmit={handleSearchSubmit}>
          <input
            id="deals-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="نام محصول، فروشگاه، تخفیف یا کالکشن را جستجو کنید"
            className="
      h-12 md:h-14
      w-full
      rounded-xl
      border border-slate-200
      bg-slate-50
      py-0
      px-4 md:px-5
      text-sm md:text-base
      text-slate-900
      outline-none
      transition
      focus:border-slate-400
      focus:bg-white
      md:shadow-sm
    "
          />
        </form>
      </section>

      {/* <section className="rounded-2xl border border-rose-100 bg-gradient-to-l from-rose-50 to-orange-50 p-3 shadow-sm md:p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-700 md:text-sm">
            {selectedTag === "همه" ? "مرتب‌شده بر اساس زمان پایان تخفیف" : `فیلتر تگ: ${selectedTag}`}
          </p>
          <span className="rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white md:text-xs">
            {toPersianDigits(urgentCount)} پیشنهاد فوری
          </span>
        </div>
      </section> */}

      <section className="space-y-2 md:space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 md:text-xs">
            طبقه:
          </span>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedFloor("all")}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                selectedFloor === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              همه طبقات
            </button>
            {FLOOR_LEVELS.map((floorLevel) => (
              <button
                key={floorLevel}
                onClick={() => setSelectedFloor(floorLevel)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  selectedFloor === floorLevel
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {getFloorLabel(floorLevel)}
              </button>
            ))}
          </div>
        </div>

        {!isSearching && (
          <div className="flex items-end gap-2">
            <span className="pb-1.5 text-[11px] font-bold text-slate-500">
              تگ:
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1 pt-5">
              <div className="relative shrink-0">
                <span
                  className={`absolute -top-4 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-extrabold shadow-sm ${
                    selectedTag === FOOD_TAG
                      ? "bg-white text-rose-700 ring-1 ring-rose-200"
                      : "bg-rose-600 text-white"
                  }`}
                >
                  {toPersianDigits(activeFoodDealCount)} فعال
                </span>
                <button
                  onClick={() => handleTagClick(FOOD_TAG)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-extrabold transition ${
                    selectedTag === FOOD_TAG
                      ? "bg-rose-600 text-white shadow-sm ring-1 ring-rose-300"
                      : "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                  }`}
                >
                  {FOOD_TAG}
                </button>
              </div>
              <button
                onClick={() => handleTagClick(ALL_TAG)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  selectedTag === ALL_TAG
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {ALL_TAG}
              </button>
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    selectedTag === tag
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-2.5 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:grid-cols-3">
        {isSearching
          ? productSearchResults.map((result) => (
              <ProductCard
                key={`search-${result.product.id}`}
                product={result.product}
                store={result.store}
                variant="compact"
                sourceTab="search"
                onProductClick={() =>
                  handleSearchResultClick(result.product, result.store)
                }
                onStoreClick={() =>
                  handleSearchResultStoreClick(result.product, result.store)
                }
              />
            ))
          : filteredDeals.map((item) => (
              <DealCard key={item.deal.id} item={item} />
            ))}

        {hasNoResults && !isSearching && isDealSelectionClosed && (
          <NightDealsMessage />
        )}

        {hasNoResults && (isSearching || !isDealSelectionClosed) && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 md:col-span-2 lg:col-span-3">
            محصولی با فیلتر انتخابی پیدا نشد.
          </div>
        )}
      </section>
    </>
  );
}
