"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ProductCard } from "@/components/product-card";
import {
  FLOOR_LEVELS,
  getFloorLabel,
  parseStoreFloorToLevel,
} from "@/lib/floor-filter";
import { getCatalogSearchResults } from "@/lib/catalog-search";
import { trackSearchIntent, trackSearchPerformed } from "@/lib/posthog";
import type { FloorFilterValue } from "@/lib/floor-filter";
import type { Product, Store } from "@/types";

interface NewCollectionListProps {
  products: Product[];
  stores: Store[];
}

interface StoredCollectionItem {
  productId: string;
  startedAt: string;
  expiresAt: string;
  hideAt: string;
}

interface CollectionView {
  product: Product;
  store: Store;
  expiresAt: string;
}

const ALL_TAG = "همه";
const STORAGE_KEY = "hamilia-active-new-collection-v1";
const TARGET_COLLECTION_COUNT = 5;
const HOUR_MS = 60 * 60 * 1000;
const MIN_COLLECTION_HOURS = 1;
const MAX_COLLECTION_HOURS = 5;

function isNewCollectionProduct(product: Product): boolean {
  return product.isNew && product.discount === null;
}

function getTime(value: string): number | null {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function compareItemsByExpiry(
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

function isStoredCollectionItem(
  value: unknown,
): value is StoredCollectionItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as StoredCollectionItem;

  return (
    typeof item.productId === "string" &&
    typeof item.startedAt === "string" &&
    typeof item.expiresAt === "string" &&
    typeof item.hideAt === "string" &&
    getTime(item.startedAt) !== null &&
    getTime(item.expiresAt) !== null &&
    getTime(item.hideAt) !== null
  );
}

function readStoredCollection(): StoredCollectionItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isStoredCollectionItem) : [];
  } catch {
    return [];
  }
}

function persistStoredCollection(items: StoredCollectionItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function getRandomCollectionHours(): number {
  return (
    Math.floor(
      Math.random() * (MAX_COLLECTION_HOURS - MIN_COLLECTION_HOURS + 1),
    ) + MIN_COLLECTION_HOURS
  );
}

function shuffleProducts(products: Product[]): Product[] {
  return products
    .map((product) => ({ product, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map((item) => item.product);
}

function createStoredCollectionItem(
  product: Product,
  now: Date,
): StoredCollectionItem {
  const durationHours = getRandomCollectionHours();
  const startedAtMs = now.getTime();
  const expiresAtMs = startedAtMs + durationHours * HOUR_MS;
  const expiresAt = new Date(expiresAtMs).toISOString();

  return {
    productId: product.id,
    startedAt: new Date(startedAtMs).toISOString(),
    expiresAt,
    hideAt: expiresAt,
  };
}

function syncStoredCollection(
  currentItems: StoredCollectionItem[],
  products: Product[],
  storeById: Map<string, Store>,
  now: Date,
): StoredCollectionItem[] {
  const nowMs = now.getTime();

  const collectionProducts = products.filter(
    (product) => isNewCollectionProduct(product) && storeById.has(product.storeId),
  );
  const collectionById = new Map(
    collectionProducts.map((product) => [product.id, product]),
  );
  const targetCount = Math.min(TARGET_COLLECTION_COUNT, collectionProducts.length);
  const seenProductIds = new Set<string>();
  const visibleItems = currentItems
    .filter((item) => {
      if (
        seenProductIds.has(item.productId) ||
        !collectionById.has(item.productId)
      ) {
        return false;
      }

      const hideAtMs = getTime(item.hideAt);

      if (hideAtMs === null || hideAtMs <= nowMs) {
        return false;
      }

      seenProductIds.add(item.productId);
      return true;
    })
    .sort((a, b) => compareItemsByExpiry(a.expiresAt, b.expiresAt, nowMs))
    .slice(0, targetCount);

  if (visibleItems.length >= targetCount) {
    return visibleItems;
  }

  const visibleProductIds = new Set(
    visibleItems.map((item) => item.productId),
  );
  const candidates = shuffleProducts(
    collectionProducts.filter((product) => !visibleProductIds.has(product.id)),
  );
  const nextItems = [...visibleItems];

  while (nextItems.length < targetCount && candidates.length > 0) {
    const product = candidates.shift();

    if (product) {
      nextItems.push(createStoredCollectionItem(product, now));
    }
  }

  return nextItems.sort((a, b) =>
    compareItemsByExpiry(a.expiresAt, b.expiresAt, nowMs),
  );
}

function toCollectionView(
  storedItem: StoredCollectionItem,
  productById: Map<string, Product>,
  storeById: Map<string, Store>,
): CollectionView | null {
  const product = productById.get(storedItem.productId);

  if (!product || !isNewCollectionProduct(product)) {
    return null;
  }

  const store = storeById.get(product.storeId);

  if (!store) {
    return null;
  }

  return {
    product,
    store,
    expiresAt: storedItem.expiresAt,
  };
}

export function NewCollectionList({ products, stores }: NewCollectionListProps) {
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>(ALL_TAG);
  const [selectedFloor, setSelectedFloor] = useState<FloorFilterValue>("all");
  const [storedCollection, setStoredCollection] = useState<
    StoredCollectionItem[]
  >([]);
  const [hasLoadedCollection, setHasLoadedCollection] = useState(false);
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
    const refreshCollection = () => {
      const now = new Date();
      setSortNowMs(now.getTime());
      setStoredCollection((currentItems) => {
        const sourceItems =
          currentItems.length > 0 ? currentItems : readStoredCollection();
        const nextItems = syncStoredCollection(
          sourceItems,
          products,
          storeById,
          now,
        );

        persistStoredCollection(nextItems);

        return nextItems;
      });
      setHasLoadedCollection(true);
    };

    refreshCollection();

    const intervalId = window.setInterval(refreshCollection, 30_000);

    return () => window.clearInterval(intervalId);
  }, [products, storeById]);

  const collectionItems = useMemo(() => {
    return storedCollection
      .map((item) => toCollectionView(item, productById, storeById))
      .filter((item): item is CollectionView => Boolean(item))
      .sort((a, b) => compareItemsByExpiry(a.expiresAt, b.expiresAt, sortNowMs));
  }, [productById, sortNowMs, storeById, storedCollection]);

  const tags = useMemo<string[]>(() => {
    return Array.from(
      new Set(collectionItems.map((item) => item.store.category)),
    ).filter(Boolean);
  }, [collectionItems]);

  useEffect(() => {
    if (selectedTag !== ALL_TAG && !tags.includes(selectedTag)) {
      setSelectedTag(ALL_TAG);
    }
  }, [selectedTag, tags]);

  const filteredCollection = useMemo(() => {
    if (isSearching) {
      return [];
    }

    return collectionItems.filter((item) => {
      const matchesTag =
        selectedTag === ALL_TAG || item.store.category === selectedTag;
      const level = parseStoreFloorToLevel(item.store.floor);
      const matchesFloor = selectedFloor === "all" || level === selectedFloor;

      return matchesTag && matchesFloor;
    });
  }, [collectionItems, isSearching, selectedFloor, selectedTag]);

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
    : hasLoadedCollection && filteredCollection.length === 0;

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
      <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-sm ring-1 ring-slate-900/5 md:p-5">
        <label
          htmlFor="new-collection-search"
          className="mb-2 hidden text-sm font-bold text-slate-500 md:block"
        >
          جستجو در تخفیف‌ها و کالکشن جدید
        </label>

        <form className="relative" onSubmit={handleSearchSubmit}>
          <input
            id="new-collection-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="نام محصول، فروشگاه، تخفیف یا کالکشن را جستجو کنید"
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-0 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white md:h-14 md:px-5 md:text-base md:shadow-sm"
          />
        </form>
      </section>

      <section className="space-y-2 md:space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 md:text-xs">
            طبقه:
          </span>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
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
                type="button"
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
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedTag(ALL_TAG)}
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
                  type="button"
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
          ? productSearchResults.map((item) => (
              <ProductCard
                key={`new-search-${item.product.id}`}
                product={item.product}
                store={item.store}
                variant="compact"
              />
            ))
          : filteredCollection.map((item) => (
              <ProductCard
                key={`new-collection-${item.product.id}`}
                product={item.product}
                store={item.store}
                variant="compact"
              />
            ))}

        {hasNoResults && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 md:col-span-2 lg:col-span-3">
            محصولی با فیلتر انتخابی پیدا نشد.
          </div>
        )}
      </section>
    </>
  );
}
