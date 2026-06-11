"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { TabOpenedTracker } from "@/components/analytics-trackers";
import { StoreCard } from "@/components/store-card";
import {
  FLOOR_LEVELS,
  getFloorLabel,
  parseStoreFloorToLevel,
} from "@/lib/floor-filter";
import {
  trackCategoryChipClicked,
  trackSearchIntent,
  trackSearchPerformed,
} from "@/lib/posthog";
import type { FloorFilterValue } from "@/lib/floor-filter";
import type { Store, StoreCategory } from "@/types";

interface StoresDirectoryProps {
  stores: Store[];
  categories: StoreCategory[];
}

export function StoresDirectory({ stores, categories }: StoresDirectoryProps) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    StoreCategory | "همه"
  >("همه");
  const [selectedFloor, setSelectedFloor] = useState<FloorFilterValue>("all");
  const isSearching = query.trim().length > 0;

  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      const matchesQuery =
        store.name.toLowerCase().includes(query.toLowerCase()) ||
        store.brand.toLowerCase().includes(query.toLowerCase());
      const matchesCategory =
        selectedCategory === "همه" || store.category === selectedCategory;
      const floorLevel = parseStoreFloorToLevel(store.floor);
      const matchesFloor =
        selectedFloor === "all" || floorLevel === selectedFloor;

      return matchesQuery && matchesCategory && matchesFloor;
    });
  }, [query, selectedCategory, selectedFloor, stores]);

  useEffect(() => {
    trackSearchIntent({
      source_tab: "stores",
      search_query: query,
      results_count: filteredStores.length,
      has_results: filteredStores.length > 0,
    });
  }, [filteredStores.length, query]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const searchQuery = query.trim();

    if (!searchQuery) {
      return;
    }

    trackSearchPerformed({
      source_tab: "stores",
      search_query: searchQuery,
      results_count: filteredStores.length,
      search_type: "submit",
      has_results: filteredStores.length > 0,
    });
  };

  const handleCategoryClick = (category: StoreCategory | "همه") => {
    setSelectedCategory(category);
    trackCategoryChipClicked({
      source_tab: "stores",
      category,
    });
  };

  return (
    <section className="space-y-4">
      <TabOpenedTracker tab="stores" />

      <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-sm ring-1 ring-slate-900/5">
        <label
          htmlFor="store-search"
          className="mb-2 block text-xs font-bold text-slate-500"
        >
          جستجو بین فروشگاه‌ها
        </label>
        <form className="relative" onSubmit={handleSearchSubmit}>
          <input
            id="store-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="مثلا dandy یا sanjaaq"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-0 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          />
        </form>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500">طبقه:</span>
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

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500">
            دسته‌بندی:
          </span>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => handleCategoryClick("همه")}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                selectedCategory === "همه"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              همه
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryClick(category)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  selectedCategory === category
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 lg:grid-cols-3 xl:grid-cols-4">
        {filteredStores.map((store) => (
          <StoreCard
            key={store.id}
            store={store}
            sourceTab={isSearching ? "search" : "stores"}
          />
        ))}

        {filteredStores.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 md:col-span-2 lg:col-span-3 xl:col-span-4">
            فروشگاهی با این فیلترها پیدا نشد.
          </div>
        )}
      </div>
    </section>
  );
}
