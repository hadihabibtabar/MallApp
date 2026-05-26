import { DealsViewedTracker } from "@/components/analytics-trackers";
import { DealsList } from "@/components/deals-list";
import { getDealsView } from "@/lib/mock-data";

export default function DealsPage() {
  const deals = getDealsView();
  const sortedDeals = [...deals].sort(
    (a, b) => new Date(a.deal.expiresAt).getTime() - new Date(b.deal.expiresAt).getTime()
  );

  return (
    <main className="space-y-3">
      <DealsViewedTracker dealCount={sortedDeals.length} />

      <header className="space-y-1">
        <h1 className="text-xl tracking-tight text-slate-900">تخفیف‌های داغ امروز</h1>
        {/* <p className="text-xs text-slate-600">نمایش فشرده برای دیدن تعداد بیشتر محصول قبل از اسکرول</p> */}
        <p className="text-xs text-slate-600">همیلاسنتر همراه شما در تجربه خرید بهتر🌱</p>
      </header>

      <DealsList deals={sortedDeals} />
    </main>
  );
}
