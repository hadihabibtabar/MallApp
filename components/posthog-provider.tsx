"use client";

import { useEffect } from "react";
import {
  initPostHog,
  normalizeAppOpenSource,
  trackAppOpened,
} from "@/lib/posthog";

export function PostHogProvider() {
  useEffect(() => {
    initPostHog();

    const source = new URLSearchParams(window.location.search).get("source");

    trackAppOpened({
      source: normalizeAppOpenSource(source),
    });
  }, []);

  return null;
}
