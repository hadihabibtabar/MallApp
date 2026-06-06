"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { DealsViewedTracker } from "@/components/analytics-trackers";
import { DealCard } from "@/components/deal-card";
import { ProductCard } from "@/components/product-card";
import {
  FLOOR_LEVELS,
  getFloorLabel,
  parseStoreFloorToLevel,
} from "@/lib/floor-filter";
import { trackSearchIntent, trackSearchPerformed } from "@/lib/posthog";
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

const STORAGE_KEY = "hamilia-active-deals-v1";
const TARGET_DEAL_COUNT = 10;
const HIDE_AFTER_EXPIRED_MS = 5 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MIN_DEAL_HOURS = 1;
const MAX_DEAL_HOURS = 5;
const SELECTION_START_HOUR = 8;
const SELECTION_END_HOUR = 23;
const BREAKFAST_TAG = "صبحانه";
const FOOD_TAG = "غذا";
const BOOSTED_TAG_WEIGHT = 6;
const BOOSTED_TAG_TARGET_SHARE = 0.6;

function matchesSearch(value: string | undefined, query: string): boolean {
  return value?.toLowerCase().includes(query) ?? false;
}

function isDiscountedProduct(product: Product): product is DiscountedProduct {
  return typeof product.discount === "number" && product.discount > 0;
}

function isSelectionWindowOpen(now: Date): boolean {
  const hour = now.getHours();
  return hour >= SELECTION_START_HOUR && hour < SELECTION_END_HOUR;
}

function getBoostedDealTag(now: Date): string | null {
  const hour = now.getHours();

  if (hour >= 8 && hour < 11) {
    return BREAKFAST_TAG;
  }

  if ((hour >= 11 && hour < 14) || (hour >= 20 && hour < 23)) {
    return FOOD_TAG;
  }

  return null;
}

function hasProductTag(product: Product, tag: string): boolean {
  return product.tag.trim() === tag;
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

function getProductSelectionWeight(
  product: Product,
  boostedTag: string | null,
): number {
  return boostedTag && hasProductTag(product, boostedTag)
    ? BOOSTED_TAG_WEIGHT
    : 1;
}

function shuffleProducts(
  products: Product[],
  boostedTag: string | null = null,
): Product[] {
  return products
    .map((product) => ({
      product,
      sort:
        -Math.log(Math.max(Math.random(), Number.EPSILON)) /
        getProductSelectionWeight(product, boostedTag),
    }))
    .sort((a, b) => a.sort - b.sort)
    .map((item) => item.product);
}

function createStoredDeal(product: Product, now: Date): StoredDeal {
  const durationHours = getRandomDealHours();
  const startedAtMs = now.getTime();
  const expiresAtMs = startedAtMs + durationHours * HOUR_MS;

  return {
    productId: product.id,
    startedAt: new Date(startedAtMs).toISOString(),
    expiresAt: new Date(expiresAtMs).toISOString(),
    hideAt: new Date(expiresAtMs + HIDE_AFTER_EXPIRED_MS).toISOString(),
  };
}

function getBoostedDealTargetCount(
  targetCount: number,
  discountedProducts: Product[],
  boostedTag: string | null,
): number {
  if (!boostedTag) {
    return 0;
  }

  const boostedProductCount = discountedProducts.filter((product) =>
    hasProductTag(product, boostedTag),
  ).length;

  return Math.min(
    boostedProductCount,
    Math.ceil(targetCount * BOOSTED_TAG_TARGET_SHARE),
  );
}

function syncStoredDeals(
  currentDeals: StoredDeal[],
  products: Product[],
  storeById: Map<string, Store>,
  now: Date,
): StoredDeal[] {
  const nowMs = now.getTime();
  const discountedProducts = products.filter(
    (product) => isDiscountedProduct(product) && storeById.has(product.storeId),
  );
  const discountedById = new Map(
    discountedProducts.map((product) => [product.id, product]),
  );
  const targetCount = Math.min(TARGET_DEAL_COUNT, discountedProducts.length);
  const seenProductIds = new Set<string>();
  let visibleDeals = currentDeals
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

  if (!isSelectionWindowOpen(now)) {
    return visibleDeals;
  }

  const boostedTag = getBoostedDealTag(now);
  const visibleProductIds = new Set(visibleDeals.map((deal) => deal.productId));
  const boostedTargetCount = getBoostedDealTargetCount(
    targetCount,
    discountedProducts,
    boostedTag,
  );

  if (boostedTag && boostedTargetCount > 0) {
    const visibleBoostedCount = visibleDeals.filter((deal) => {
      const product = discountedById.get(deal.productId);
      return product ? hasProductTag(product, boostedTag) : false;
    }).length;
    const boostedCandidates = shuffleProducts(
      discountedProducts.filter(
        (product) =>
          hasProductTag(product, boostedTag) &&
          !visibleProductIds.has(product.id),
      ),
      boostedTag,
    );
    const replaceableIndexes = visibleDeals
      .map((deal, index) => {
        const product = discountedById.get(deal.productId);
        return product && hasProductTag(product, boostedTag) ? null : index;
      })
      .filter((index): index is number => index !== null)
      .reverse();
    const neededBoostedCount = Math.max(
      0,
      boostedTargetCount - visibleBoostedCount,
    );

    for (
      let index = 0;
      index < neededBoostedCount && boostedCandidates.length > 0;
      index += 1
    ) {
      const product = boostedCandidates.shift();

      if (!product) {
        break;
      }

      const storedDeal = createStoredDeal(product, now);

      if (visibleDeals.length < targetCount) {
        visibleDeals.push(storedDeal);
      } else {
        const replaceableIndex = replaceableIndexes.shift();

        if (replaceableIndex === undefined) {
          break;
        }

        const replacedDeal = visibleDeals[replaceableIndex];

        if (replacedDeal) {
          visibleProductIds.delete(replacedDeal.productId);
        }

        visibleDeals[replaceableIndex] = storedDeal;
      }

      visibleProductIds.add(product.id);
    }
  }

  if (visibleDeals.length >= targetCount) {
    return visibleDeals.sort((a, b) =>
      compareDealsByExpiryStatus(a.expiresAt, b.expiresAt, nowMs),
    );
  }

  const candidates = shuffleProducts(
    discountedProducts.filter((product) => !visibleProductIds.has(product.id)),
    boostedTag,
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
  const [selectedTag, setSelectedTag] = useState<string>("همه");
  const [selectedFloor, setSelectedFloor] = useState<FloorFilterValue>("all");
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

  const tags = useMemo(() => {
    return Array.from(new Set(deals.map((item) => item.deal.tag))).filter(
      Boolean,
    );
  }, [deals]);

  useEffect(() => {
    if (selectedTag !== "همه" && !tags.includes(selectedTag)) {
      setSelectedTag("همه");
    }
  }, [selectedTag, tags]);

  const dealByProductId = useMemo(() => {
    const dealMap = new Map<string, DealView>();

    deals.forEach((item) => {
      if (!dealMap.has(item.product.id)) {
        dealMap.set(item.product.id, item);
      }
    });

    return dealMap;
  }, [deals]);

  const filteredDeals = useMemo(() => {
    if (isSearching) {
      return [];
    }

    return deals.filter((item) => {
      const matchesTag = selectedTag === "همه" || item.deal.tag === selectedTag;
      const level = parseStoreFloorToLevel(item.store.floor);
      const matchesFloor = selectedFloor === "all" || level === selectedFloor;
      return matchesTag && matchesFloor;
    });
  }, [deals, isSearching, selectedTag, selectedFloor]);

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
        matchesSearch(store.name, normalizedQuery) ||
        matchesSearch(store.brand, normalizedQuery) ||
        matchesSearch(store.category, normalizedQuery);

      if (!matchesProduct) {
        return;
      }

      const level = parseStoreFloorToLevel(store.floor);
      const matchesFloor = selectedFloor === "all" || level === selectedFloor;

      if (!matchesFloor) {
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
    selectedFloor,
    storeById,
  ]);
  const hasNoResults = isSearching
    ? productSearchResults.length === 0
    : hasLoadedDeals && filteredDeals.length === 0;

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
      <DealsViewedTracker dealCount={deals.length} />

      <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-sm ring-1 ring-slate-900/5 md:p-5">
        {/*Just Desktop  */}
        <label
          htmlFor="deals-search"
          className="mb-2 hidden text-sm font-bold text-slate-500 md:block"
        >
          جستجو در تخفیف‌ها و محصولات
        </label>

        <form className="relative" onSubmit={handleSearchSubmit}>
          <input
            id="deals-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="نام محصول، فروشگاه یا تخفیف را جستجو کنید"
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
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500">تگ:</span>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedTag("همه")}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  selectedTag === "همه"
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                همه
              </button>
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
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
          ? productSearchResults.map((result) =>
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
            )
          : filteredDeals.map((item) => (
              <DealCard key={item.deal.id} item={item} />
            ))}

        {hasNoResults && isDealSelectionClosed && <NightDealsMessage />}

        {hasNoResults && !isDealSelectionClosed && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 md:col-span-2 lg:col-span-3">
            محصولی با فیلتر انتخابی پیدا نشد.
          </div>
        )}
      </section>
    </>
  );
}
