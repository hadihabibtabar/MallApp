import { DealsViewedTracker } from "@/components/analytics-trackers";
import { DealsList } from "@/components/deals-list";
import { getDealsView } from "@/lib/mock-data";

export default function DealsPage() {
  const deals = getDealsView();
  const sortedDeals = [...deals].sort(
    (a, b) =>
      new Date(a.deal.expiresAt).getTime() -
      new Date(b.deal.expiresAt).getTime(),
  );

  return (
    <main className="space-y-3">
      <DealsViewedTracker dealCount={sortedDeals.length} />

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

      <DealsList deals={sortedDeals} />
    </main>
  );
}
