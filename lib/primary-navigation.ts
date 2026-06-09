import { products } from "@/lib/mock-data";

export const PRIMARY_NAV_HREFS = {
  stores: "/stores",
  deals: "/deals",
  newCollection: "/new-collection",
} as const;

export type PrimaryNavHref =
  (typeof PRIMARY_NAV_HREFS)[keyof typeof PRIMARY_NAV_HREFS];

export function getActivePrimaryNavHref(
  pathname: string | null,
): PrimaryNavHref | null {
  if (!pathname) {
    return null;
  }

  if (pathname === "/" || pathname.startsWith("/deals")) {
    return PRIMARY_NAV_HREFS.deals;
  }

  if (pathname.startsWith("/new-collection")) {
    return PRIMARY_NAV_HREFS.newCollection;
  }

  if (
    pathname.startsWith("/stores") ||
    pathname.startsWith("/store/") ||
    pathname.startsWith("/brand/")
  ) {
    return PRIMARY_NAV_HREFS.stores;
  }

  if (pathname.startsWith("/product/")) {
    const productId = decodeURIComponent(pathname.split("/")[2] ?? "");
    const product = products.find((item) => item.id === productId);

    if (product?.isNew && product.discount === null) {
      return PRIMARY_NAV_HREFS.newCollection;
    }

    if (typeof product?.discount === "number" && product.discount > 0) {
      return PRIMARY_NAV_HREFS.deals;
    }

    return PRIMARY_NAV_HREFS.stores;
  }

  return null;
}
