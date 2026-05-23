"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { trackStoreNavigation } from "@/lib/posthog";

interface StoreNavigationLinkProps {
  href: string;
  className: string;
  children: ReactNode;
  storeId: string;
  productId?: string;
  source: "product_page" | "store_page";
}

export function StoreNavigationLink({
  href,
  className,
  children,
  storeId,
  productId,
  source
}: StoreNavigationLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() =>
        trackStoreNavigation({
          source,
          store_id: storeId,
          product_id: productId,
          cta: "go_to_store"
        })
      }
    >
      {children}
    </Link>
  );
}

interface StoreNavigationButtonProps {
  className: string;
  children: ReactNode;
  storeId: string;
  source: "product_page" | "store_page";
}

export function StoreNavigationButton({ className, children, storeId, source }: StoreNavigationButtonProps) {
  return (
    <button
      type="button"
      className={className}
      onClick={() =>
        trackStoreNavigation({
          source,
          store_id: storeId,
          cta: "go_to_store"
        })
      }
    >
      {children}
    </button>
  );
}
