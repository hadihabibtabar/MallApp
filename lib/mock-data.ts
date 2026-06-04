import categoriesData from "@/data/categories.json";
import productsData from "@/data/products.json";
import storesData from "@/data/stores.json";
import type {
  Category,
  Deal,
  DealView,
  Product,
  Store,
  StoreCategory
} from "@/types";

const DEFAULT_DEAL_EXPIRES_IN_HOURS = 1;
const HOUR_MS = 60 * 60 * 1000;

type DiscountedProduct = Product & { discount: number };

function isDiscountedProduct(product: Product): product is DiscountedProduct {
  return typeof product.discount === "number" && product.discount > 0;
}

export const categories = categoriesData as Category[];
export const products = productsData as Product[];
export const stores = (storesData as Store[]).map((store) => ({
  ...store,
  productIds: products
    .filter((product) => product.storeId === store.id)
    .map((product) => product.id),
  dealIds: products
    .filter(
      (product) => product.storeId === store.id && isDiscountedProduct(product),
    )
    .map((product) => `deal-${product.id}`),
}));

const toProductDeal = (
  product: DiscountedProduct,
  expiresInHours = DEFAULT_DEAL_EXPIRES_IN_HOURS,
): Deal => {
  const store = getStoreById(product.storeId);

  return {
    id: `deal-${product.id}`,
    storeId: product.storeId,
    productId: product.id,
    title: product.name,
    discount: product.discount,
    expiresInHours,
    tag: store?.category ?? "",
    expiresAt: new Date(Date.now() + expiresInHours * HOUR_MS).toISOString(),
  };
};

export const deals = products
  .filter(isDiscountedProduct)
  .map((product) => toProductDeal(product));

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
