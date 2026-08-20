"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import {
  ROUTE_VIEW_TRANSITION_TIMEOUT_MS,
  canUseViewTransitions,
  startViewTransition,
} from "@/lib/view-transitions";

type RouterNavigateOptions = {
  scroll?: boolean;
};

interface ViewTransitionRouter {
  push: (href: string, options?: RouterNavigateOptions) => void;
  replace: (href: string, options?: RouterNavigateOptions) => void;
  back: () => void;
}

interface ViewTransitionContextValue {
  router: ViewTransitionRouter;
  transition: (update: () => void) => void;
}

interface PendingRouteTransition {
  resolve: () => void;
  timeoutId: number;
}

const ViewTransitionContext =
  createContext<ViewTransitionContextValue | null>(null);

function toLocalHref(href: string): string {
  const currentUrl = new URL(window.location.href);
  const nextUrl = new URL(href, currentUrl);

  return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
}

function shouldHandleLinkClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey
  ) {
    return false;
  }

  const anchor = event.currentTarget;

  if (anchor.target && anchor.target !== "_self") {
    return false;
  }

  if (anchor.hasAttribute("download")) {
    return false;
  }

  const currentUrl = new URL(window.location.href);
  const nextUrl = new URL(anchor.href, currentUrl);

  if (nextUrl.origin !== currentUrl.origin) {
    return false;
  }

  const sameDocument =
    nextUrl.pathname === currentUrl.pathname &&
    nextUrl.search === currentUrl.search;

  if (sameDocument && nextUrl.hash) {
    return false;
  }

  return nextUrl.href !== currentUrl.href;
}

export function ViewTransitionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const pendingRouteTransitionRef = useRef<PendingRouteTransition | null>(null);

  const resolvePendingRouteTransition = useCallback(() => {
    const pendingRouteTransition = pendingRouteTransitionRef.current;

    if (!pendingRouteTransition) {
      return;
    }

    pendingRouteTransitionRef.current = null;
    window.clearTimeout(pendingRouteTransition.timeoutId);
    pendingRouteTransition.resolve();
  }, []);

  useEffect(() => {
    resolvePendingRouteTransition();
  }, [pathname, resolvePendingRouteTransition]);

  useEffect(() => {
    return () => resolvePendingRouteTransition();
  }, [resolvePendingRouteTransition]);

  const navigate = useCallback(
    (updateRoute: () => void) => {
      if (!canUseViewTransitions()) {
        updateRoute();
        return;
      }

      resolvePendingRouteTransition();

      const viewTransition = startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            const timeoutId = window.setTimeout(
              resolvePendingRouteTransition,
              ROUTE_VIEW_TRANSITION_TIMEOUT_MS,
            );

            pendingRouteTransitionRef.current = {
              resolve,
              timeoutId,
            };

            try {
              updateRoute();
            } catch {
              resolvePendingRouteTransition();
              throw new Error("Route view transition navigation failed.");
            }
          }),
      );

      viewTransition?.finished.catch(() => undefined);
    },
    [resolvePendingRouteTransition],
  );

  const transition = useCallback((update: () => void) => {
    const viewTransition = startViewTransition(() => {
      flushSync(update);
    });

    viewTransition?.finished.catch(() => undefined);
  }, []);

  const value = useMemo<ViewTransitionContextValue>(
    () => ({
      router: {
        push: (href, options) => navigate(() => router.push(href, options)),
        replace: (href, options) =>
          navigate(() => router.replace(href, options)),
        back: () => navigate(() => router.back()),
      },
      transition,
    }),
    [navigate, router, transition],
  );

  return (
    <ViewTransitionContext.Provider value={value}>
      {children}
    </ViewTransitionContext.Provider>
  );
}

export function useViewTransitionRouter(): ViewTransitionRouter {
  const context = useContext(ViewTransitionContext);

  if (!context) {
    throw new Error(
      "useViewTransitionRouter must be used within ViewTransitionProvider.",
    );
  }

  return context.router;
}

export function useViewTransition(): (update: () => void) => void {
  const context = useContext(ViewTransitionContext);

  if (!context) {
    throw new Error("useViewTransition must be used within ViewTransitionProvider.");
  }

  return context.transition;
}

type TransitionLinkProps = ComponentProps<typeof Link> & {
  viewTransition?: boolean;
};

export function TransitionLink({
  href,
  onClick,
  replace,
  scroll,
  target,
  viewTransition = true,
  ...props
}: TransitionLinkProps) {
  const viewTransitionRouter = useViewTransitionRouter();

  return (
    <Link
      {...props}
      href={href}
      replace={replace}
      scroll={scroll}
      target={target}
      onClick={(event) => {
        onClick?.(event);

        if (!viewTransition || !shouldHandleLinkClick(event)) {
          return;
        }

        event.preventDefault();

        const nextHref = toLocalHref(event.currentTarget.href);

        if (replace) {
          viewTransitionRouter.replace(nextHref, { scroll: scroll ?? undefined });
          return;
        }

        viewTransitionRouter.push(nextHref, { scroll: scroll ?? undefined });
      }}
    />
  );
}
