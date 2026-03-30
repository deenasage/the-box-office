// SPEC: design-improvements.md
// SPEC: design-improvements.md (typography/a11y pass)
"use client";

import { Fragment, useState } from "react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { CommandPalette } from "@/components/search/CommandPalette";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const GENERAL_SHORTCUTS = [
  { keys: ["⌘", "K"], label: "Open search" },
  { keys: ["?"], label: "Show keyboard shortcuts" },
  { keys: ["N"], label: "New intake request" },
] as const;

const NAV_SHORTCUTS = [
  { keys: ["G", "D"], label: "Dashboard" },
  { keys: ["G", "T"], label: "Tickets" },
  { keys: ["G", "S"], label: "Sprints" },
  { keys: ["G", "R"], label: "Reports" },
  { keys: ["G", "P"], label: "Portfolio" },
  { keys: ["G", "B"], label: "Briefs" },
  { keys: ["G", "C"], label: "Capacity" },
  { keys: ["G", "O"], label: "Roadmap" },
  { keys: ["G", "W"], label: "My Work" },
] as const;

function ShortcutRow({ keys, label }: { keys: readonly string[]; label: string }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1">
        {keys.map((k, i) => (
          <Fragment key={k}>
            <kbd className="inline-flex h-5 items-center rounded border bg-muted px-1.5 font-mono text-[11px]">
              {k}
            </kbd>
            {i < keys.length - 1 && (
              <span className="text-muted-foreground text-[11px]">then</span>
            )}
          </Fragment>
        ))}
      </span>
    </li>
  );
}

export function KeyboardShortcuts() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useKeyboardShortcuts({
    onOpenSearch: () => setSearchOpen(true),
    onShowHelp: () => setHelpOpen((v) => !v),
  });

  return (
    <>
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <ul className="space-y-2">
              {GENERAL_SHORTCUTS.map((s) => (
                <ShortcutRow key={s.label} {...s} />
              ))}
            </ul>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Navigation</p>
              <ul className="space-y-2">
                {NAV_SHORTCUTS.map((s) => (
                  <ShortcutRow key={s.label} {...s} />
                ))}
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
