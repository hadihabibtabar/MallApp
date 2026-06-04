import type { RankedDealView } from "@/lib/content-engine/deals";
import { getDailySeed } from "@/lib/content-engine/seeded-random";
import { getCurrentTimeContext } from "@/lib/content-engine/time-context";

interface DealsRankingDebugPanelProps {
  now: Date;
  rankedDeals: RankedDealView[];
}

export function DealsRankingDebugPanel({
  now,
  rankedDeals,
}: DealsRankingDebugPanelProps) {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const timeContext = getCurrentTimeContext(now);
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
  const seed = getDailySeed(now);

  return (
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-left text-xs text-slate-800 shadow-sm ring-1 ring-amber-200 md:p-4">
      <div className="flex flex-wrap items-center gap-2 border-b border-amber-200 pb-2 font-mono">
        <span className="rounded bg-white px-2 py-1">time: {timeContext}</span>
        <span className="rounded bg-white px-2 py-1">weekday: {weekday}</span>
        <span className="rounded bg-white px-2 py-1">seed: {seed}</span>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse font-mono">
          <thead>
            <tr className="border-b border-amber-200 text-slate-600">
              <th className="py-2 pr-3 text-left font-semibold">rank</th>
              <th className="py-2 pr-3 text-left font-semibold">deal</th>
              <th className="py-2 pr-3 text-left font-semibold">store</th>
              <th className="py-2 pr-3 text-right font-semibold">final</th>
              <th className="py-2 pr-3 text-right font-semibold">discount</th>
              <th className="py-2 pr-3 text-right font-semibold">category</th>
              <th className="py-2 pr-3 text-right font-semibold">collection</th>
              <th className="py-2 text-right font-semibold">seeded</th>
            </tr>
          </thead>
          <tbody>
            {rankedDeals.map((item, index) => (
              <tr key={item.deal.id} className="border-b border-amber-100 last:border-b-0">
                <td className="py-2 pr-3">{index + 1}</td>
                <td className="py-2 pr-3">{item.deal.title}</td>
                <td className="py-2 pr-3">{item.store.brand}</td>
                <td className="py-2 pr-3 text-right">{item.score}</td>
                <td className="py-2 pr-3 text-right">
                  {item.rankingFactors.discountPercent}
                </td>
                <td className="py-2 pr-3 text-right">
                  {item.rankingFactors.categoryBoost}
                </td>
                <td className="py-2 pr-3 text-right">
                  {item.rankingFactors.collectionBoost}
                </td>
                <td className="py-2 text-right">
                  {item.rankingFactors.seededRotationBoost}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
