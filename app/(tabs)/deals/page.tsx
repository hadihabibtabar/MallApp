import { DealsList } from "@/components/deals-list";
import { products, stores } from "@/lib/mock-data";

export default function DealsPage() {
  return (
    <main className="space-y-4">
      <DealsList products={products} stores={stores} />
    </main>
  );
}
