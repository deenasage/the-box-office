// SPEC: design-improvements.md
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface UseKeyboardShortcutsOptions {
  onOpenSearch?: () => void;
  onShowHelp?: () => void;
}

const G_NAV_MAP: Record<string, string> = {
  d: "/",
  t: "/tickets",
  s: "/sprints",
  r: "/reports",
  p: "/portfolio",
  b: "/briefs",
  c: "/capacity",
  o: "/roadmap",
  w: "/my-work",
};

/**
 * Global keyboard shortcuts:
 *   n / N     — New intake form (/intake)
 *   Cmd+K     — Open search palette
 *   ?         — Show keyboard shortcuts help
 *   G then D  — Go to Dashboard
 *   G then T  — Go to Tickets
 *   G then S  — Go to Sprints
 *   G then R  — Go to Reports
 *   G then P  — Go to Portfolio
 *   G then B  — Go to Briefs
 *   G then C  — Go to Capacity
 *   G then O  — Go to Roadmap
 *   G then W  — Go to My Work
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const router = useRouter();
  const { onOpenSearch, onShowHelp } = options;
  const gPressedRef = useRef(false);
  const gTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if typing in an input/textarea/select
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) return;

      // Cmd+K / Ctrl+K — open search palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenSearch?.();
        return;
      }

      // G+letter two-key navigation
      if (gPressedRef.current) {
        const destination = G_NAV_MAP[e.key.toLowerCase()];
        if (destination) {
          e.preventDefault();
          router.push(destination);
        }
        gPressedRef.current = false;
        if (gTimeoutRef.current) clearTimeout(gTimeoutRef.current);
        return;
      }

      switch (e.key) {
        case "g":
        case "G":
          gPressedRef.current = true;
          if (gTimeoutRef.current) clearTimeout(gTimeoutRef.current);
          gTimeoutRef.current = setTimeout(() => {
            gPressedRef.current = false;
          }, 1000);
          break;
        case "n":
        case "N":
          router.push("/intake");
          break;
        case "?":
          e.preventDefault();
          onShowHelp?.();
          break;
      }
    }

    // Also respond to the custom event fired by AppShell search buttons
    function handleOpenPalette() {
      onOpenSearch?.();
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-command-palette", handleOpenPalette);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-palette", handleOpenPalette);
      if (gTimeoutRef.current) clearTimeout(gTimeoutRef.current);
    };
  }, [router, onOpenSearch, onShowHelp]);
}
