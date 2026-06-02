"use client";

import { useMemo, useState } from "react";
import { DealCard } from "@/components/deal-card";
import { ProductCard } from "@/components/product-card";
import { toPersianDigits } from "@/lib/format";
import { FLOOR_LEVELS, getFloorLabel, parseStoreFloorToLevel } from "@/lib/floor-filter";
import type { FloorFilterValue } from "@/lib/floor-filter";
import type { DealView, Product, Store } from "@/types";

interface DealsListProps {
  deals: DealView[];
  products: Product[];
  stores: Store[];
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

function matchesSearch(value: string | undefined, query: string): boolean {
  return value?.toLowerCase().includes(query) ?? false;
}

export function DealsList({ deals, products, stores }: DealsListProps) {
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("همه");
  const [selectedFloor, setSelectedFloor] = useState<FloorFilterValue>("all");
  const normalizedQuery = query.trim().toLowerCase();
  const isSearching = normalizedQuery.length > 0;

  const tags = useMemo(() => {
    return Array.from(new Set(deals.map((item) => item.deal.tag))).filter(Boolean);
  }, [deals]);

  const storeById = useMemo(() => {
    return new Map(stores.map((store) => [store.id, store]));
  }, [stores]);

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
  }, [dealByProductId, isSearching, normalizedQuery, products, selectedFloor, storeById]);

  const urgentCount = useMemo(() => {
    const now = Date.now();
    return filteredDeals.filter((item) => {
      const diff = new Date(item.deal.expiresAt).getTime() - now;
      return diff > 0 && diff < 4 * 60 * 60 * 1000;
    }).length;
  }, [filteredDeals]);

  return (
    <>
<section className="rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-sm ring-1 ring-slate-900/5 md:p-5">
  
  {/*Just Desktop  */}
  <label
    htmlFor="deals-search"
    className="mb-2 hidden text-sm font-bold text-slate-500 md:block"
  >
    جستجو در تخفیف‌ها و محصولات
  </label>

  <input
    id="deals-search"
    value={query}
    onChange={(event) => setQuery(event.target.value)}
     placeholder="نام محصول، فروشگاه یا تخفیف را جستجو کنید"
    className="
      h-12 md:h-14
      w-full
      rounded-xl
      border border-slate-200
      bg-slate-50
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
          <span className="text-[11px] font-bold text-slate-500 md:text-xs">طبقه:</span>
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
                <DealCard key={`deal-${result.item.deal.id}`} item={result.item} />
              ) : (
                <ProductCard
                  key={`product-${result.product.id}`}
                  product={result.product}
                  store={result.store}
                  variant="compact"
                />
              ),
            )
          : filteredDeals.map((item) => <DealCard key={item.deal.id} item={item} />)}

        {(isSearching ? productSearchResults.length === 0 : filteredDeals.length === 0) && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 md:col-span-2 lg:col-span-3">
            محصولی با فیلتر انتخابی پیدا نشد.
          </div>
        )}
      </section>
    </>
  );
}
