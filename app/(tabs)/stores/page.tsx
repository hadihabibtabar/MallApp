import { PageTitle } from "@/components/page-title";
import { StoresDirectory } from "@/components/stores-directory";
import { categoryOptions, stores } from "@/lib/mock-data";

export default function StoresPage() {
  return (
    <main className="space-y-5">
      <PageTitle
        title="فروشگاه‌ها"
        subtitle="فروشگاه موردنظر را سریع پیدا کنید و مسیر دسترسی را همان‌جا ببینید."
      />

      {/* <section className="rounded-2xl bg-gradient-to-l from-blue-600 to-cyan-500 p-4 text-white shadow-soft">
        <p className="text-xs font-semibold text-white/90">دسترسی سریع</p>
        <h2 className="mt-1 text-lg font-bold"> برترین برند های دنیا در همیلاسنتر</h2>
      </section> */}

      <StoresDirectory stores={stores} categories={categoryOptions} />
    </main>
  );
}
