import { parseStoreFloorToLevel } from "@/lib/floor-filter";
import type { FloorFilterValue } from "@/lib/floor-filter";
import type { Product, Store } from "@/types";

export interface CatalogSearchResult {
  product: Product;
  store: Store;
}

interface CatalogSearchOptions {
  products: Product[];
  storeById: Map<string, Store>;
  query: string;
  selectedFloor: FloorFilterValue;
}

function matchesSearch(value: string | undefined, query: string): boolean {
  return value?.toLowerCase().includes(query) ?? false;
}

export function isSearchableCatalogProduct(product: Product): boolean {
  const hasDiscount =
    typeof product.discount === "number" && product.discount > 0;
  const isNewCollectionProduct = product.isNew && product.discount === null;

  return hasDiscount || isNewCollectionProduct;
}

export function getCatalogSearchResults({
  products,
  storeById,
  query,
  selectedFloor,
}: CatalogSearchOptions): CatalogSearchResult[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  return products
    .map((product) => {
      const store = storeById.get(product.storeId);

      if (!store || !isSearchableCatalogProduct(product)) {
        return null;
      }

      const matchesProduct =
        matchesSearch(product.name, normalizedQuery) ||
        matchesSearch(product.description, normalizedQuery) ||
        matchesSearch(product.tag, normalizedQuery) ||
        matchesSearch(store.name, normalizedQuery) ||
        matchesSearch(store.brand, normalizedQuery) ||
        matchesSearch(store.category, normalizedQuery);
      const level = parseStoreFloorToLevel(store.floor);
      const matchesFloor = selectedFloor === "all" || level === selectedFloor;

      return matchesProduct && matchesFloor ? { product, store } : null;
    })
    .filter((item): item is CatalogSearchResult => Boolean(item));
}
