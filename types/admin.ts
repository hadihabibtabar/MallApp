export interface AdminCategory {
  id: string;
  name: string;
  floors: string[];
  storeIds: string[];
}

export interface AdminStore {
  id: string;
  name: string;
  brand: string;
  floor: string;
  category: string;
  locationHint: string;
  description: string;
  heroImage: string;
  productIds: string[];
  dealIds: string[];
   paymentMethods?: ("digipay" | "snapppay" | "tarapay")[];
}

export interface AdminProduct {
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

export interface AdminDeal {
  id: string;
  storeId: string;
  productId: string;
  title: string;
  discount: number;
  expiresInHours: number;
  tag: string;
}

export interface AdminCatalog {
  stores: AdminStore[];
  products: AdminProduct[];
  deals: AdminDeal[];
  categories: AdminCategory[];
}
