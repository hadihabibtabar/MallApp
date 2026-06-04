import dealsData from "@/data/deals.json";
import productsData from "@/data/products.json";
import storesData from "@/data/stores.json";
import {
  calculateDealScore,
  getDealRankingFactors,
  type DealRankingFactors,
} from "@/lib/content-engine/ranking";
import type { Deal, DealSeed, DealView, Product, ProductView, Store } from "@/types";

export interface RankedDealView extends DealView {
  rankingFactors: DealRankingFactors;
  score: number;
}

const hourMs = 60 * 60 * 1000;

const dealSeeds = dealsData as DealSeed[];
const products = productsData as Product[];
const stores = storesData as Store[];

function getDailyEndDate(seed: DealSeed, now: Date): Date | null {
  const parsedEndAt = new Date(seed.endAt);

  if (Number.isNaN(parsedEndAt.getTime())) {
    return null;
  }

  if (!seed.repeatDaily) {
    return parsedEndAt;
  }

  const repeatedEndAt = new Date(now);
  repeatedEndAt.setHours(
    parsedEndAt.getHours(),
    parsedEndAt.getMinutes(),
    parsedEndAt.getSeconds(),
    parsedEndAt.getMilliseconds(),
  );

  if (repeatedEndAt.getTime() <= now.getTime()) {
    repeatedEndAt.setDate(repeatedEndAt.getDate() + 1);
  }

  return repeatedEndAt;
}

function getDealExpiry(seed: DealSeed, now: Date): {
  expiresAt: string;
  expiresInHours: number;
} | null {
  const dailyEndDate = getDailyEndDate(seed, now);

  if (dailyEndDate && dailyEndDate.getTime() > now.getTime()) {
    return {
      expiresAt: dailyEndDate.toISOString(),
      expiresInHours: Math.max(1, Math.ceil((dailyEndDate.getTime() - now.getTime()) / hourMs)),
    };
  }

  return {
    expiresAt: new Date(now.getTime() + 24 * hourMs).toISOString(),
    expiresInHours: 24,
  };
}

function toDealWithExpiry(
  seed: DealSeed,
  store: Store,
  now: Date,
): Deal | null {
  const expiry = getDealExpiry(seed, now);

  if (!expiry) {
    return null;
  }

  return {
    ...seed,
    discount: seed.discountPercent,
    expiresAt: expiry.expiresAt,
    expiresInHours: expiry.expiresInHours,
    tag: store.category,
  };
}

function toProductView(product: Product, deal: Deal): ProductView {
  return {
    ...product,
    discount: deal.discountPercent,
    isNew:
      product.promotionType === "collection" ||
      product.promotionType === "deal_and_collection",
  };
}

function logRankedDeals(rankedDeals: RankedDealView[]): void {
  rankedDeals.forEach((item, index) => {
    console.log("[content-engine:deal-ranking]", {
      rank: index + 1,
      dealName: item.deal.title,
      productName: item.product.name,
      storeName: item.store.name,
      calculatedScore: item.score,
      rankingFactors: item.rankingFactors,
    });
  });
}

export function getRankedDeals(now: Date = new Date()): RankedDealView[] {
  const productById = new Map(products.map((product) => [product.id, product]));
  const storeById = new Map(stores.map((store) => [store.id, store]));

  const rankedDeals = dealSeeds
    .map((dealSeed): RankedDealView | null => {
      const product = productById.get(dealSeed.productId);
      const store = storeById.get(dealSeed.storeId);

      if (!product || !store) {
        return null;
      }

      const deal = toDealWithExpiry(dealSeed, store, now);

      if (!deal) {
        return null;
      }

      const rankingFactors = getDealRankingFactors(deal, product, store, now);
      const score = calculateDealScore(deal, product, store, now);
      const productView = toProductView(product, deal);

      return {
        deal,
        product: productView,
        rankingFactors,
        score,
        store,
      };
    })
    .filter((item): item is RankedDealView => Boolean(item))
    .sort((firstDeal, secondDeal) => {
      const scoreDifference = secondDeal.score - firstDeal.score;

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      return firstDeal.deal.id.localeCompare(secondDeal.deal.id);
    });

  logRankedDeals(rankedDeals);

  return rankedDeals;
}
