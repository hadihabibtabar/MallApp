"use client";

import posthog from "posthog-js";
import {
  SOURCE_TAB_QUERY_PARAM,
  normalizeAnalyticsSourceTab,
  type AnalyticsSourceTab,
  type AnalyticsTab,
} from "@/lib/analytics-context";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_API_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
const SEARCH_INTENT_DEBOUNCE_MS = 600;
const SEARCH_DEDUPLICATION_MS = 5_000;
const MIN_REALTIME_SEARCH_LENGTH = 3;
const APP_OPENED_SESSION_STORAGE_KEY = "mall_app:app_opened_tracked";

let hasInitialized = false;
let hasTrackedAppOpen = false;
let searchIntentTimer: number | null = null;
let lastTrackedQuery = "";
let lastTrackedTimestamp = 0;
let lastTrackedSearchType: AnalyticsSearchType | undefined;

export type AnalyticsQrSource =
  | "entrance"
  | "foodcourt"
  | "elevator"
  |"coldelevator"
  |"warmelevator"
  | "parking"
  | "unknown";

const QR_SOURCE_MAP: Record<string, AnalyticsQrSource> = {
  entrance: "entrance",
  foodcourt: "foodcourt",
  elevator: "elevator",
  coldelevator: "coldelevator",
  warmelevator: "warmelevator",
  parking: "parking",
};

type AnalyticsSource =
  | AnalyticsQrSource
  | "landing"
  | "deals_tab"
  | "new_collection_tab"
  | "stores_tab"
  | "deal_card"
  | "product_page"
  | "store_page";

export type { AnalyticsSourceTab, AnalyticsTab };
export type AnalyticsSearchType = "realtime" | "submit";

export interface AnalyticsEventProperties {
  source?: AnalyticsSource;
  source_tab?: AnalyticsSourceTab;
  tab?: AnalyticsTab;
  deal_count?: number;
  store_count?: number;
  collection_size?: number;
  deal_id?: string;
  deal_tag?: string;
  tag?: string;
  category?: string;
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

export interface AppOpenedEventProperties
  extends Omit<AnalyticsEventProperties, "source"> {
  source?: AnalyticsQrSource;
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

function hasTrackedAppOpenedThisSession() {
  if (hasTrackedAppOpen) {
    return true;
  }

  if (typeof window === "undefined") {
    return false;
  }

  try {
    return (
      window.sessionStorage.getItem(APP_OPENED_SESSION_STORAGE_KEY) === "true"
    );
  } catch {
    return false;
  }
}

function markAppOpenedTracked() {
  hasTrackedAppOpen = true;

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(APP_OPENED_SESSION_STORAGE_KEY, "true");
  } catch {
    // Some browsers can deny sessionStorage; the in-memory flag still dedupes.
  }
}

export function normalizeAppOpenSource(
  source: string | null | undefined,
): AnalyticsQrSource {
  const normalizedSource = source?.trim().toLowerCase();

  if (!normalizedSource) {
    return "unknown";
  }

  return QR_SOURCE_MAP[normalizedSource] ?? "unknown";
}

function captureEvent(event: string, properties: AnalyticsEventProperties = {}) {
  if (!ensureInitialized()) {
    return;
  }

  posthog.capture(event, {
    app_section: "mall_app",
    ...properties,
  });
}

function getCurrentSourceTab() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return normalizeAnalyticsSourceTab(
    new URLSearchParams(window.location.search).get(SOURCE_TAB_QUERY_PARAM),
  );
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

export function trackAppOpened(properties: AppOpenedEventProperties = {}) {
  if (hasTrackedAppOpenedThisSession()) {
    return;
  }

  markAppOpenedTracked();

  captureEvent("app_opened", {
    ...properties,
    source: normalizeAppOpenSource(properties.source),
  });
}

export function trackDealsViewed(properties: AnalyticsEventProperties = {}) {
  captureEvent("deals_viewed", properties);
}

export function trackTabOpened(tab: AnalyticsTab) {
  captureEvent("tab_opened", { tab });
}

export function trackDealClicked(properties: AnalyticsEventProperties = {}) {
  captureEvent("deal_clicked", properties);
}

export function trackProductOpened(properties: AnalyticsEventProperties = {}) {
  captureEvent("product_opened", {
    ...properties,
    source_tab: properties.source_tab ?? getCurrentSourceTab(),
  });
}

export function trackStoreOpened(properties: AnalyticsEventProperties = {}) {
  captureEvent("store_opened", {
    ...properties,
    source_tab: properties.source_tab ?? getCurrentSourceTab(),
  });
}

export function trackStoreNavigation(properties: AnalyticsEventProperties = {}) {
  captureEvent("store_navigation_clicked", {
    ...properties,
    source_tab: properties.source_tab ?? getCurrentSourceTab(),
  });
}

export function trackCollectionViewed(properties: AnalyticsEventProperties = {}) {
  captureEvent("collection_viewed", properties);
}

export function trackNewCollectionProductClicked(
  properties: AnalyticsEventProperties = {},
) {
  captureEvent("new_collection_product_clicked", properties);
}

export function trackSearchResultClicked(
  properties: AnalyticsEventProperties = {},
) {
  const searchQuery = properties.search_query?.trim();

  if (!searchQuery) {
    return;
  }

  captureEvent("search_result_clicked", {
    ...properties,
    search_query: searchQuery,
  });
}

export function trackCategoryChipClicked(
  properties: AnalyticsEventProperties = {},
) {
  const category = properties.category?.trim();

  if (!category) {
    return;
  }

  captureEvent("category_chip_clicked", {
    ...properties,
    category,
  });
}

export function trackVisitIntent(properties: AnalyticsEventProperties = {}) {
  captureEvent("visit_intent", {
    ...properties,
    source_tab: properties.source_tab ?? getCurrentSourceTab(),
  });
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
