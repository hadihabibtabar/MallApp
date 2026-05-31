import categoriesData from "@/data/categories.json";
import dealsData from "@/data/deals.json";
import productsData from "@/data/products.json";
import storesData from "@/data/stores.json";
import type {
  Category,
  Deal,
  DealSeed,
  DealView,
  Product,
  Store,
  StoreCategory
} from "@/types";

const toDealWithExpiry = (seed: DealSeed): Deal => {
  const expiresAt = new Date(Date.now() + seed.expiresInHours * 60 * 60 * 1000).toISOString();
  return { ...seed, expiresAt };
};

export const categories = categoriesData as Category[];
export const stores = storesData as Store[];
export const products = productsData as Product[];
export const deals = (dealsData as DealSeed[]).map(toDealWithExpiry);

export function getStoreById(storeId: string): Store | undefined {
  return stores.find((store) => store.id === storeId);
}

export function getProductById(productId: string): Product | undefined {
  return products.find((product) => product.id === productId);
}

export function getStoreProducts(storeId: string): Product[] {
  return products.filter((product) => product.storeId === storeId);
}

export function getStoreDeals(storeId: string): Deal[] {
  return deals.filter((deal) => deal.storeId === storeId);
}

export function getDealsView(): DealView[] {
  return deals
    .map((deal) => {
      const store = getStoreById(deal.storeId);
      const product = getProductById(deal.productId);

      if (!store || !product) {
        return null;
      }

      return { deal, store, product };
    })
    .filter((item): item is DealView => Boolean(item));
}

export function getBrandStores(): Store[] {
  return [...stores].sort((a, b) => a.brand.localeCompare(b.brand));
}

export const categoryOptions: StoreCategory[] = Array.from(
  new Set<StoreCategory>([
    ...categories.map((category) => category.name),
    ...stores.map((store) => store.category),
  ]),
);
