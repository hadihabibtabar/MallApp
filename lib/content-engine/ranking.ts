import type { Deal, Product, Store } from "@/types";
import { getSeededBoost } from "@/lib/content-engine/seeded-random";
import { getCurrentTimeContext, type TimeContext } from "@/lib/content-engine/time-context";

type CategoryGroup = "fashion" | "food" | "gold" | "sports" | "watch";

export interface DealRankingFactors {
  categoryBoost: number;
  collectionBoost: number;
  discountPercent: number;
  seededRotationBoost: number;
  weekendBoost: number;
  timeContext: TimeContext;
}

const categoryGroups: Record<CategoryGroup, readonly string[]> = {
  fashion: ["fashion", "پوشاک"],
  food: ["food", "غذا"],
  gold: ["gold", "طلا"],
  sports: ["sports", "ورزشی"],
  watch: ["watch", "ساعت"],
};

function isCategory(store: Store, category: CategoryGroup): boolean {
  const normalizedCategory = store.category.trim().toLowerCase();

  return categoryGroups[category].some(
    (categoryName) => normalizedCategory === categoryName.toLowerCase(),
  );
}

function getCategoryBoost(store: Store, timeContext: TimeContext): number {
  if (timeContext === "morning" && isCategory(store, "food")) {
    return 50;
  }

  if (timeContext === "lunch" && isCategory(store, "food")) {
    return 70;
  }

  if (timeContext === "evening") {
    if (
      isCategory(store, "fashion") ||
      isCategory(store, "watch") ||
      isCategory(store, "gold")
    ) {
      return 50;
    }

    if (isCategory(store, "sports")) {
      return 30;
    }
  }

  return 0;
}

function isThursdayOrFriday(date: Date): boolean {
  const day = date.getDay();

  return day === 4 || day === 5;
}

function getWeekendBoost(store: Store, date: Date): number {
  if (!isThursdayOrFriday(date)) {
    return 0;
  }

  if (isCategory(store, "fashion") || isCategory(store, "food")) {
    return 30;
  }

  return 0;
}

function getCollectionBoost(product: Product): number {
  if (product.promotionType === "deal_and_collection") {
    return 20;
  }

  if (product.promotionType === "collection") {
    return 15;
  }

  return 0;
}

export function getDealRankingFactors(
  deal: Deal,
  product: Product,
  store: Store,
  now: Date = new Date(),
): DealRankingFactors {
  const timeContext = getCurrentTimeContext(now);

  return {
    categoryBoost: getCategoryBoost(store, timeContext),
    collectionBoost: getCollectionBoost(product),
    discountPercent: deal.discountPercent,
    seededRotationBoost: getSeededBoost(deal.id, now),
    weekendBoost: getWeekendBoost(store, now),
    timeContext,
  };
}

export function calculateDealScore(
  deal: Deal,
  product: Product,
  store: Store,
  now: Date = new Date(),
): number {
  const factors = getDealRankingFactors(deal, product, store, now);

  return (
    factors.discountPercent +
    factors.categoryBoost +
    factors.weekendBoost +
    factors.collectionBoost +
    factors.seededRotationBoost
  );
}
