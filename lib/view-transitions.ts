export const ROUTE_VIEW_TRANSITION_TIMEOUT_MS = 900;

type ViewTransitionUpdateCallback = () => Promise<void> | void;

interface NativeViewTransition {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition: () => void;
}

interface ViewTransitionDocument extends Document {
  startViewTransition?: (
    updateCallback?: ViewTransitionUpdateCallback,
  ) => NativeViewTransition;
}

function getViewTransitionDocument(): ViewTransitionDocument | null {
  if (typeof document === "undefined") {
    return null;
  }

  return document as ViewTransitionDocument;
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function canUseViewTransitions(): boolean {
  const viewTransitionDocument = getViewTransitionDocument();

  return Boolean(
    viewTransitionDocument?.startViewTransition && !prefersReducedMotion(),
  );
}

export function startViewTransition(
  updateCallback: ViewTransitionUpdateCallback,
): NativeViewTransition | null {
  const viewTransitionDocument = getViewTransitionDocument();

  if (!viewTransitionDocument?.startViewTransition || prefersReducedMotion()) {
    void updateCallback();
    return null;
  }

  let didRunUpdate = false;

  try {
    return viewTransitionDocument.startViewTransition(() => {
      didRunUpdate = true;
      return updateCallback();
    });
  } catch {
    if (!didRunUpdate) {
      void updateCallback();
    }

    return null;
  }
}

function hashString(value: string): string {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash).toString(36);
}

function toViewTransitionIdent(value: string): string {
  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || `item-${hashString(value)}`;
}

export function getProductImageTransitionName(productId: string): string {
  return `product-image-${toViewTransitionIdent(productId)}`;
}

export function getProductTitleTransitionName(productId: string): string {
  return `product-title-${toViewTransitionIdent(productId)}`;
}

export function getStoreHeroTransitionName(storeId: string): string {
  return `store-hero-${toViewTransitionIdent(storeId)}`;
}

export function getStoreTitleTransitionName(storeId: string): string {
  return `store-title-${toViewTransitionIdent(storeId)}`;
}
