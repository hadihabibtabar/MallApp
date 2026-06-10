import type { ReactNode } from "react";

export default function TabsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full bg-white">
      {/* Mobile and tablet layout */}
      <div className="mx-auto w-full max-w-md px-3 py-3 md:max-w-2xl lg:hidden">
        <div className="min-h-[calc(100vh-6.5rem)] rounded-[2rem] border border-white/80 bg-white/70 p-4 shadow-soft backdrop-blur-sm">
          {children}
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden w-full lg:block">
        <div className="mx-auto min-h-screen w-full max-w-[1400px] px-6 py-6 lg:px-8 lg:py-8 xl:px-10">
          <div className="rounded-2xl border border-slate-200/50 bg-white/80 p-6 shadow-sm lg:rounded-3xl lg:p-8 xl:p-10">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
