import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-soft">
        <h1 className="text-2xl font-black text-slate-900">صفحه پیدا نشد</h1>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          ممکن است آدرس تغییر کرده باشد. از مسیر زیر وارد داشبورد همیلا سنتر شوید.
        </p>
        <Link
          href="/deals"
          className="mt-5 inline-block rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
        >
          بازگشت به تخفیف‌ها
        </Link>
      </section>
    </main>
  );
}
