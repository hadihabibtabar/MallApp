import { NewCollectionList } from "@/components/new-collection-list";
import { products, stores } from "@/lib/mock-data";

export default function NewCollectionPage() {
  return (
    <main className="space-y-3">
      <header className="space-y-1 md:mx-auto md:max-w-2xl md:text-center">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
          کالکشن جدید
        </h1>

        <p className="text-xs text-slate-600 md:text-sm">
         انتخاب‌های تازه‌{" "} 
         <span className="font-bold bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600 bg-clip-text text-transparent">
             همیلا سنتر 
          </span>
         {" "} برای امروز
        </p>
      </header>

      <NewCollectionList products={products} stores={stores} />
    </main>
  );
}
