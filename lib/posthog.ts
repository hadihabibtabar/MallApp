"use client";

import posthog from "posthog-js";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_API_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
const SEARCH_INTENT_DEBOUNCE_MS = 600;
const SEARCH_DEDUPLICATION_MS = 5_000;
const MIN_REALTIME_SEARCH_LENGTH = 3;

let hasInitialized = false;
let searchIntentTimer: number | null = null;
let lastTrackedQuery = "";
let lastTrackedTimestamp = 0;
let lastTrackedSearchType: AnalyticsSearchType | undefined;

type AnalyticsSource =
  | "landing"
  | "deals_tab"
  | "deal_card"
  | "product_page"
  | "store_page"
  | "unknown";

export type AnalyticsSearchType = "realtime" | "submit";

export interface AnalyticsEventProperties {
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
  search_query?: string;
  results_count?: number;
  search_type?: AnalyticsSearchType;
  has_results?: boolean;
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

function shouldTrackSearch(
  searchQuery: string,
  searchType: AnalyticsSearchType | undefined,
) {
  const normalizedQuery = searchQuery.toLowerCase();
  const now = Date.now();
  const isDuplicate =
    lastTrackedQuery === normalizedQuery &&
    lastTrackedSearchType === searchType &&
    now - lastTrackedTimestamp < SEARCH_DEDUPLICATION_MS;

  if (isDuplicate) {
    return false;
  }

  lastTrackedQuery = normalizedQuery;
  lastTrackedTimestamp = now;
  lastTrackedSearchType = searchType;

  return true;
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

// Search is a core KPI for understanding user intent discovery behavior,
// product demand signals, zero-search-button UX performance, and the
// conversion funnel from intent to click to visit.
export function trackSearchPerformed(properties: AnalyticsEventProperties = {}) {
  const searchQuery = properties.search_query?.trim();

  if (!searchQuery) {
    return;
  }

  if (!shouldTrackSearch(searchQuery, properties.search_type)) {
    return;
  }

  captureEvent("search_performed", {
    ...properties,
    search_query: searchQuery,
  });
}

export function trackSearchIntent(properties: AnalyticsEventProperties = {}) {
  if (typeof window === "undefined") {
    return;
  }

  if (searchIntentTimer) {
    window.clearTimeout(searchIntentTimer);
  }

  const searchQuery = properties.search_query?.trim();

  if (!searchQuery || searchQuery.length < MIN_REALTIME_SEARCH_LENGTH) {
    searchIntentTimer = null;
    return;
  }

  searchIntentTimer = window.setTimeout(() => {
    trackSearchPerformed({
      ...properties,
      search_query: searchQuery,
      search_type: "realtime",
    });
    searchIntentTimer = null;
  }, SEARCH_INTENT_DEBOUNCE_MS);
}

export default posthog;
