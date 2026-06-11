export const SOURCE_TAB_QUERY_PARAM = "source_tab";

export type AnalyticsTab = "deals" | "new_collection" | "stores";

export type AnalyticsSourceTab = AnalyticsTab | "search";

const SOURCE_TAB_VALUES = new Set<AnalyticsSourceTab>([
  "deals",
  "new_collection",
  "stores",
  "search",
]);

export function normalizeAnalyticsSourceTab(
  sourceTab: string | string[] | null | undefined,
): AnalyticsSourceTab | undefined {
  const value = Array.isArray(sourceTab) ? sourceTab[0] : sourceTab;
  const normalizedValue = value?.trim().toLowerCase();

  if (!normalizedValue) {
    return undefined;
  }

  return SOURCE_TAB_VALUES.has(normalizedValue as AnalyticsSourceTab)
    ? (normalizedValue as AnalyticsSourceTab)
    : undefined;
}

export function buildSourceTabHref(
  href: string,
  sourceTab: AnalyticsSourceTab | undefined,
) {
  const normalizedSourceTab = normalizeAnalyticsSourceTab(sourceTab);

  if (!normalizedSourceTab) {
    return href;
  }

  const url = new URL(href, "https://hamilia.local");
  url.searchParams.set(SOURCE_TAB_QUERY_PARAM, normalizedSourceTab);

  return `${url.pathname}${url.search}${url.hash}`;
}
