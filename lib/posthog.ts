"use client";

import posthog from "posthog-js";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_API_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

let hasInitialized = false;

type AnalyticsSource =
  | "landing"
  | "deals_tab"
  | "deal_card"
  | "product_page"
  | "store_page"
  | "unknown";

interface AnalyticsEventProperties {
  source?: AnalyticsSource;
  deal_count?: number;
  store_count?: number;
  collection_size?: number;
  deal_id?: string;
  deal_tag?: string;
  store_id?: string;
  store_floor?: string;
  store_category?: string;
  product_id?: string;
  product_discount?: number;
  cta?: string;
}

function canUsePostHog() {
  return typeof window !== "undefined" && Boolean(POSTHOG_KEY);
}

function ensureInitialized() {
  if (!canUsePostHog()) {
    return false;
  }

  if (!hasInitialized) {
    posthog.init(POSTHOG_KEY!, {
      api_host: POSTHOG_API_HOST,
      defaults: "2026-01-30",
      capture_pageview: false
    });
    hasInitialized = true;
  }

  return true;
}

function captureEvent(event: string, properties: AnalyticsEventProperties = {}) {
  if (!ensureInitialized()) {
    return;
  }

  posthog.capture(event, {
    app_section: "mall_app",
    ...properties
  });
}

export function initPostHog() {
  ensureInitialized();
}

export function trackAppOpened(properties: AnalyticsEventProperties = {}) {
  captureEvent("app_opened", properties);
}

export function trackDealsViewed(properties: AnalyticsEventProperties = {}) {
  captureEvent("deals_viewed", properties);
}

export function trackDealClicked(properties: AnalyticsEventProperties = {}) {
  captureEvent("deal_clicked", properties);
}

export function trackProductOpened(properties: AnalyticsEventProperties = {}) {
  captureEvent("product_opened", properties);
}

export function trackStoreOpened(properties: AnalyticsEventProperties = {}) {
  captureEvent("store_opened", properties);
}

export function trackStoreNavigation(properties: AnalyticsEventProperties = {}) {
  captureEvent("store_navigation_clicked", properties);
}

export function trackCollectionViewed(properties: AnalyticsEventProperties = {}) {
  captureEvent("collection_viewed", properties);
}

export default posthog;
