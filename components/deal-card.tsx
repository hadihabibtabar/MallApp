"use client";

import { useEffect, useState } from "react";
import type { DealView } from "@/types";
import { toPersianDigits } from "@/lib/format";
import { trackDealClicked, trackVisitIntent } from "@/lib/posthog";
import { CatalogResultCard } from "@/components/catalog-result-card";

interface DealCardProps {
  item: DealView;
}
interface TimeBadgeState {
  label: string;
  isExpired: boolean;
}

function getTimeBadgeState(expiresAt: string): TimeBadgeState {
  const diffMs = new Date(expiresAt).getTime() - Date.now();

  if (diffMs <= 0) {
    return {
      label: "تمام شده",
      isExpired: true,
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  return {
    label: toPersianDigits(`${hh}:${mm}:${ss}`),
    isExpired: false,
  };
}

export function DealCard({ item }: DealCardProps) {
  const [timeBadge, setTimeBadge] = useState(() =>
    getTimeBadgeState(item.deal.expiresAt),
  );
  const dealClickProperties = {
    source: "deal_card" as const,
    source_tab: "deals" as const,
    deal_id: item.deal.id,
    deal_tag: item.deal.tag,
    store_id: item.store.id,
    store_category: item.store.category,
    store_floor: item.store.floor,
    product_id: item.product.id,
    product_discount: item.deal.discount,
  };

  useEffect(() => {
    const tick = () => setTimeBadge(getTimeBadgeState(item.deal.expiresAt));
    const intervalId = setInterval(tick, 1_000);
    tick();
    return () => clearInterval(intervalId);
  }, [item.deal.expiresAt]);

  const handleStoreClick = () => {
    trackDealClicked(dealClickProperties);
    trackVisitIntent({
      ...dealClickProperties,
      cta: "go_to_store",
    });
  };

  return (
    <CatalogResultCard
      product={item.product}
      store={item.store}
      discountPercent={item.deal.discount}
      statusLabel={timeBadge.label}
      statusTone={timeBadge.isExpired ? "muted" : "active"}
      sourceTab="deals"
      onProductClick={() => trackDealClicked(dealClickProperties)}
      onStoreClick={handleStoreClick}
    />
  );
}
