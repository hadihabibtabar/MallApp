export type StoreCategory =
  | "پوشاک"
  | "ورزشی"
  | "دیجیتال"
  | "غذا"
  | "زیبایی"
  | "ساعت"
  | "طلا";

export interface Category {
  id: string;
  name: StoreCategory;
  floors: string[];
  storeIds: string[];
}

export interface Store {
  id: string;
  name: string;
  brand: string;
  floor: string;
  category: StoreCategory;
  locationHint: string;
  description: string;
  heroImage: string;
  productIds: string[];
  dealIds: string[];
   paymentMethods?: ("digipay" | "snapppay" | "tarapay")[];
}

export type PromotionType = "deal" | "collection" | "deal_and_collection";

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  storeId: string;
  promotionType: PromotionType;
  collectionName?: string;
  description: string;
  paymentMethods?: ("digipay" | "snapppay" | "tarapay")[];

}

export interface DealSeed {
  id: string;
  storeId: string;
  productId: string;
  title: string;
  discountPercent: number;
  startAt: string;
  endAt: string;
  priority: number;
  repeatDaily: boolean;
}

export interface Deal extends DealSeed {
  discount: number;
  expiresAt: string;
  expiresInHours: number;
  tag: string;
}

export interface ProductView extends Product {
  discount: number;
  isNew: boolean;
}

export interface DealView {
  deal: Deal;
  store: Store;
  product: ProductView;
}
