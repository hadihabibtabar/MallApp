"use client";

import { useEffect } from "react";
import {
  trackCollectionViewed,
  trackDealsViewed,
  trackProductOpened,
  trackStoreOpened,
} from "@/lib/posthog";

interface DealsViewedTrackerProps {
  dealCount: number;
}

export function DealsViewedTracker({ dealCount }: DealsViewedTrackerProps) {
  useEffect(() => {
    trackDealsViewed({
      source: "deals_tab",
      deal_count: dealCount,
    });
  }, [dealCount]);

  return null;
}

interface ProductOpenedTrackerProps {
  productId: string;
  storeId: string;
  productDiscount?: number;
}

export function ProductOpenedTracker({
  productId,
  storeId,
  productDiscount,
}: ProductOpenedTrackerProps) {
  useEffect(() => {
    trackProductOpened({
      source: "product_page",
      product_id: productId,
      store_id: storeId,
      product_discount: productDiscount,
    });
  }, [productDiscount, productId, storeId]);

  return null;
}

interface StoreOpenedTrackerProps {
  storeId: string;
  storeCategory: string;
  storeFloor: string;
  collectionSize: number;
}

export function StoreOpenedTracker({
  storeId,
  storeCategory,
  storeFloor,
  collectionSize,
}: StoreOpenedTrackerProps) {
  useEffect(() => {
    trackStoreOpened({
      source: "store_page",
      store_id: storeId,
      store_category: storeCategory,
      store_floor: storeFloor,
    });

    trackCollectionViewed({
      source: "store_page",
      store_id: storeId,
      collection_size: collectionSize,
    });
  }, [collectionSize, storeCategory, storeFloor, storeId]);

  return null;
}
