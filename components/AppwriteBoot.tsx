"use client";

import { useEffect } from "react";
import { APPWRITE_CONFIG } from "@/lib/appwrite/config";

/**
 * Browser-only connectivity probe. Hits the Appwrite project's
 * `/health` endpoint once on mount so we can confirm the SDK can
 * reach the configured endpoint + project. A failure here does not
 * break the app — it just logs a friendly warning.
 *
 * IMPORTANT: this is intentionally `useEffect`-driven (not a
 * module-level side-effect) so it never runs during SSR/RSC, which
 * would otherwise prevent Next.js from statically rendering pages.
 */
const PROJECT_NAME = "NCC ESCAPE CHALLENGE";

export function AppwriteBoot() {
  useEffect(() => {
    const endpoint = APPWRITE_CONFIG.endpoint.replace(/\/$/, "");
    const projectId = APPWRITE_CONFIG.projectId;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${endpoint}/health`, {
          method: "GET",
          headers: { "X-Appwrite-Project": projectId },
          cache: "no-store",
        });
        if (cancelled) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // eslint-disable-next-line no-console
        console.info(
          `[appwrite] connected to "${PROJECT_NAME}" (${APPWRITE_CONFIG.endpoint})`,
        );
      } catch (err) {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.warn(
          `[appwrite] ping failed for "${PROJECT_NAME}" at ${APPWRITE_CONFIG.endpoint}:`,
          err,
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}