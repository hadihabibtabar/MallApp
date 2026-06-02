import type { ReactNode } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { TopNav } from "@/components/top-nav";

export default function TabsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full bg-white">
      <TopNav />

      {/* Mobile Layout */}
      <div className="md:hidden mx-auto w-full max-w-md px-3 pb-24 pt-3">
        <div className="min-h-[calc(100vh-1.5rem)] rounded-[2rem] border border-white/80 bg-white/70 p-4 shadow-soft backdrop-blur-sm">
          {children}
        </div>
        <BottomNav />
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block w-full">
        <div className="mx-auto min-h-screen w-full max-w-[1400px] px-6 lg:px-8 xl:px-10 py-6 lg:py-8">
          <div className="rounded-2xl border border-slate-200/50 bg-white/80 p-6 lg:p-8 xl:p-10 shadow-sm lg:rounded-3xl">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}