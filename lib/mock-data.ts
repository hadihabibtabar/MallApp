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
  ProductView,
  Store,
  StoreCategory,
} from "@/types";

const hourMs = 60 * 60 * 1000;
const defaultDealTag = "پیشنهاد";

function getDailyEndDate(seed: DealSeed, now: Date): Date | null {
  const parsedEndAt = new Date(seed.endAt);

  if (Number.isNaN(parsedEndAt.getTime())) {
    return null;
  }

  if (!seed.repeatDaily) {
    return parsedEndAt;
  }

  const repeatedEndAt = new Date(now);
  repeatedEndAt.setHours(
    parsedEndAt.getHours(),
    parsedEndAt.getMinutes(),
    parsedEndAt.getSeconds(),
    parsedEndAt.getMilliseconds(),
  );

  if (repeatedEndAt.getTime() <= now.getTime()) {
    repeatedEndAt.setDate(repeatedEndAt.getDate() + 1);
  }

  return repeatedEndAt;
}

function getDealExpiry(seed: DealSeed, now: Date): {
  expiresAt: string;
  expiresInHours: number;
} {
  const dailyEndDate = getDailyEndDate(seed, now);

  if (dailyEndDate && dailyEndDate.getTime() > now.getTime()) {
    return {
      expiresAt: dailyEndDate.toISOString(),
      expiresInHours: Math.max(1, Math.ceil((dailyEndDate.getTime() - now.getTime()) / hourMs)),
    };
  }

  return {
    expiresAt: new Date(now.getTime() + 24 * hourMs).toISOString(),
    expiresInHours: 24,
  };
}

function toDealWithExpiry(seed: DealSeed, fallbackTag = defaultDealTag): Deal {
  const now = new Date();
  const expiry = getDealExpiry(seed, now);

  return {
    ...seed,
    discount: seed.discountPercent,
    expiresAt: expiry.expiresAt,
    expiresInHours: expiry.expiresInHours,
    tag: fallbackTag,
  };
}

function isCollectionPromotion(product: Product): boolean {
  return (
    product.promotionType === "collection" ||
    product.promotionType === "deal_and_collection"
  );
}

export const categories = categoriesData as Category[];
export const stores = storesData as Store[];

const dealSeeds = dealsData as DealSeed[];
const productDealByProductId = new Map(
  dealSeeds.map((dealSeed) => [dealSeed.productId, dealSeed]),
);

export const products = (productsData as Product[]).map(
  (product): ProductView => ({
    ...product,
    discount: productDealByProductId.get(product.id)?.discountPercent ?? 0,
    isNew: isCollectionPromotion(product),
  }),
);

const storeById = new Map(stores.map((store) => [store.id, store]));

export const deals = dealSeeds.map((dealSeed) =>
  toDealWithExpiry(dealSeed, storeById.get(dealSeed.storeId)?.category),
);

export function getStoreById(storeId: string): Store | undefined {
  return stores.find((store) => store.id === storeId);
}

export function getProductById(productId: string): ProductView | undefined {
  return products.find((product) => product.id === productId);
}

export function getStoreProducts(storeId: string): ProductView[] {
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
