import type { ReactNode } from "react";
import { BottomNav } from "@/components/bottom-nav";

export default function TabsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-md px-3 pb-24 pt-3">
      <div className="min-h-[calc(100vh-1.5rem)] rounded-[2rem] border border-white/80 bg-white/70 p-4 shadow-soft backdrop-blur-sm">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
