import { DealsViewedTracker } from "@/components/analytics-trackers";
import { DealsRankingDebugPanel } from "@/components/deals-ranking-debug-panel";
import { DealsList } from "@/components/deals-list";
import { getRankedDeals } from "@/lib/content-engine/deals";
import { products, stores } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export default function DealsPage() {
  const now = new Date();
  const rankedDeals = getRankedDeals(now);

  return (
    <main className="space-y-3">
      <DealsViewedTracker dealCount={rankedDeals.length} />
      <DealsRankingDebugPanel now={now} rankedDeals={rankedDeals} />

     <header className="space-y-1 md:text-center md:max-w-2xl md:mx-auto">
  <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
    تخفیف‌های داغ امروز
  </h1>

  <p className="text-xs text-slate-600 md:text-sm">
    <span className="font-bold bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600 bg-clip-text text-transparent">
      همیلا سنتر
    </span>
    {" "}همراه شما در تجربه خرید بهتر🌱
  </p>
</header>

      <DealsList deals={rankedDeals} products={products} stores={stores} />
    </main>
  );
}
