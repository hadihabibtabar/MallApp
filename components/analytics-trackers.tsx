"use client";

import { useEffect, useRef } from "react";
import {
  trackCollectionViewed,
  trackDealsViewed,
  trackProductOpened,
  trackStoreOpened,
  trackTabOpened,
} from "@/lib/posthog";
import type {
  AnalyticsSourceTab,
  AnalyticsTab,
} from "@/lib/analytics-context";

interface TabOpenedTrackerProps {
  tab: AnalyticsTab;
}

export function TabOpenedTracker({ tab }: TabOpenedTrackerProps) {
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (hasTrackedRef.current) {
      return;
    }

    hasTrackedRef.current = true;
    trackTabOpened(tab);
  }, [tab]);

  return null;
}

interface DealsViewedTrackerProps {
  dealCount: number;
}

export function DealsViewedTracker({ dealCount }: DealsViewedTrackerProps) {
  useEffect(() => {
    trackDealsViewed({
      source: "deals_tab",
      source_tab: "deals",
      deal_count: dealCount,
    });
  }, [dealCount]);

  return null;
}

interface ProductOpenedTrackerProps {
  productId: string;
  storeId: string;
  storeCategory: string;
  storeFloor: string;
  productDiscount?: number;
  sourceTab?: AnalyticsSourceTab;
}

export function ProductOpenedTracker({
  productId,
  storeId,
  storeCategory,
  storeFloor,
  productDiscount,
  sourceTab,
}: ProductOpenedTrackerProps) {
  useEffect(() => {
    trackProductOpened({
      source: "product_page",
      source_tab: sourceTab,
      product_id: productId,
      store_id: storeId,
      store_category: storeCategory,
      store_floor: storeFloor,
      product_discount: productDiscount,
    });
  }, [productDiscount, productId, sourceTab, storeCategory, storeFloor, storeId]);

  return null;
}

interface StoreOpenedTrackerProps {
  storeId: string;
  storeCategory: string;
  storeFloor: string;
  collectionSize: number;
  sourceTab?: AnalyticsSourceTab;
}

export function StoreOpenedTracker({
  storeId,
  storeCategory,
  storeFloor,
  collectionSize,
  sourceTab,
}: StoreOpenedTrackerProps) {
  useEffect(() => {
    trackStoreOpened({
      source: "store_page",
      source_tab: sourceTab,
      store_id: storeId,
      store_category: storeCategory,
      store_floor: storeFloor,
      collection_size: collectionSize,
    });

    trackCollectionViewed({
      source: "store_page",
      source_tab: sourceTab,
      store_id: storeId,
      store_category: storeCategory,
      store_floor: storeFloor,
      collection_size: collectionSize,
    });
  }, [collectionSize, sourceTab, storeCategory, storeFloor, storeId]);

  return null;
}
