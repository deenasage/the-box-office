// SPEC: search.md
// SPEC: design-improvements.md (typography/a11y pass)
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchIcon, TicketIcon, LayersIcon, FileTextIcon } from "lucide-react";
import { useCommandSearch } from "@/hooks/useCommandSearch";
import { CommandResultGroup } from "./CommandResult";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const { results, flat, loading } = useCommandSearch(query);

  // Focus input when palette opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

  const navigate = useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [onOpenChange, router]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (flat.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flat[activeIndex];
      if (item) navigate(item.href);
    }
  }

  const hasResults =
    results &&
    (results.tickets.length > 0 ||
      results.epics.length > 0 ||
      results.briefs.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 max-w-lg overflow-hidden"
        showCloseButton={false}
      >
        {/* Search input row */}
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tickets, epics, briefs…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Search"
            role="combobox"
            aria-expanded={!!results}
            aria-autocomplete="list"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
            Esc
          </kbd>
        </div>

        {/* Results area */}
        <div
          className="max-h-80 overflow-y-auto"
          role="listbox"
          aria-label="Search results"
        >
          {loading && (
            <div className="space-y-2 p-3" aria-busy="true" aria-label="Loading results">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          )}

          {!loading && query.trim().length >= 2 && !hasResults && results && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}

          {!loading && query.trim().length < 2 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Type to search tickets, epics, and briefs
            </p>
          )}

          {!loading && hasResults && (
            <div className="py-1">
              <CommandResultGroup
                title="Tickets"
                icon={<TicketIcon className="h-3 w-3" />}
                items={results!.tickets.map((t) => ({
                  kind: "ticket" as const,
                  id: t.id,
                  label: t.title,
                  status: t.status,
                  href: `/tickets/${t.id}`,
                }))}
                flatItems={flat}
                activeIndex={activeIndex}
                onSelect={navigate}
              />
              <CommandResultGroup
                title="Epics"
                icon={<LayersIcon className="h-3 w-3" />}
                items={results!.epics.map((e) => ({
                  kind: "epic" as const,
                  id: e.id,
                  label: e.name,
                  status: e.status,
                  href: `/portfolio/${e.id}`,
                }))}
                flatItems={flat}
                activeIndex={activeIndex}
                onSelect={navigate}
              />
              <CommandResultGroup
                title="Briefs"
                icon={<FileTextIcon className="h-3 w-3" />}
                items={results!.briefs.map((b) => ({
                  kind: "brief" as const,
                  id: b.id,
                  label: b.title,
                  status: b.status,
                  href: `/briefs/${b.id}`,
                }))}
                flatItems={flat}
                activeIndex={activeIndex}
                onSelect={navigate}
              />
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 border-t px-3 py-1.5 text-[11px] text-muted-foreground">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
