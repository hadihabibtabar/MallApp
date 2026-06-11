"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { trackStoreNavigation, trackVisitIntent } from "@/lib/posthog";
import type { AnalyticsSourceTab } from "@/lib/analytics-context";

interface StoreNavigationLinkProps {
  href: string;
  className: string;
  children: ReactNode;
  storeId: string;
  storeCategory?: string;
  storeFloor?: string;
  productId?: string;
  sourceTab?: AnalyticsSourceTab;
  source: "product_page" | "store_page";
}

function trackStoreNavigationIntent({
  source,
  sourceTab,
  storeId,
  storeCategory,
  storeFloor,
  productId,
}: {
  source: "product_page" | "store_page";
  sourceTab?: AnalyticsSourceTab;
  storeId: string;
  storeCategory?: string;
  storeFloor?: string;
  productId?: string;
}) {
  const properties = {
    source,
    source_tab: sourceTab,
    store_id: storeId,
    store_category: storeCategory,
    store_floor: storeFloor,
    product_id: productId,
    cta: "go_to_store",
  };

  trackStoreNavigation(properties);
  trackVisitIntent(properties);
}

export function StoreNavigationLink({
  href,
  className,
  children,
  storeId,
  storeCategory,
  storeFloor,
  productId,
  sourceTab,
  source,
}: StoreNavigationLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() =>
        trackStoreNavigationIntent({
          source,
          sourceTab,
          storeId,
          storeCategory,
          storeFloor,
          productId,
        })
      }
    >
      {children}
    </Link>
  );
}

interface StoreNavigationButtonProps {
  className: string;
  children: ReactNode;
  storeId: string;
  storeCategory?: string;
  storeFloor?: string;
  sourceTab?: AnalyticsSourceTab;
  source: "product_page" | "store_page";
}

export function StoreNavigationButton({
  className,
  children,
  storeId,
  storeCategory,
  storeFloor,
  sourceTab,
  source,
}: StoreNavigationButtonProps) {
  return (
    <button
      type="button"
      className={className}
      onClick={() =>
        trackStoreNavigationIntent({
          source,
          sourceTab,
          storeId,
          storeCategory,
          storeFloor,
        })
      }
    >
      {children}
    </button>
  );
}
