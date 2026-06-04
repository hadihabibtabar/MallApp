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

export interface Product {
  [x: string]: ReactNode;
  id: string;
  name: string;
  price: number;
  discount: number;
  image: string;
  storeId: string;
  isNew: boolean;
  description: string;
  paymentMethods?: ("digipay" | "snapppay" | "tarapay")[];

}

export interface DealSeed {
  id: string;
  storeId: string;
  productId: string;
  title: string;
  discount: number;
  expiresInHours: number;
  tag: string;
}

export interface Deal extends DealSeed {
  expiresAt: string;
}

export interface DealView {
  deal: Deal;
  store: Store;
  product: Product;
}
