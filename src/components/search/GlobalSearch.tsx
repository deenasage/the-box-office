// SPEC: search.md
"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { SearchIcon, TicketIcon, LayersIcon, FileTextIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCommandSearch, type FlatResult } from "@/hooks/useCommandSearch";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/constants";

const KIND_ICONS: Record<FlatResult["kind"], React.ReactNode> = {
  ticket: <TicketIcon className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />,
  epic: <LayersIcon className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />,
  brief: <FileTextIcon className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />,
};

export function GlobalSearch() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const { results, flat, loading } = useCommandSearch(query);

  const isOpen =
    focused && (query.trim().length >= 2 || loading);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [flat]);

  // Close on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      setFocused(false);
      setQuery("");
      router.push(href);
    },
    [router]
  );

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setFocused(false);
      inputRef.current?.blur();
      return;
    }
    if (!isOpen || flat.length === 0) return;
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

  const showNoResults =
    !loading &&
    query.trim().length >= 2 &&
    results !== null &&
    !hasResults;

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div
        className={cn(
          "flex items-center gap-1.5 h-8 rounded-lg border border-input bg-background px-2.5 transition-all duration-150",
          "w-32 sm:w-44",
          focused && "w-52 sm:w-64",
          "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
        )}
      >
        <SearchIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search…"
          aria-label="Search tickets, epics, briefs"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={isOpen ? "global-search-results" : undefined}
          aria-activedescendant={
            isOpen && flat[activeIndex]
              ? `gs-result-${flat[activeIndex].kind}-${flat[activeIndex].id}`
              : undefined
          }
          className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {!focused && (
          <kbd className="hidden sm:inline-flex h-4 items-center rounded border bg-muted px-1 font-mono text-[11px] text-muted-foreground pointer-events-none shrink-0">
            ⌘K
          </kbd>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          id="global-search-results"
          role="listbox"
          aria-label="Search results"
          className="absolute left-0 top-full mt-1 w-72 sm:w-80 rounded-lg border border-border bg-popover shadow-md z-50 overflow-hidden"
        >
          {loading && (
            <div className="px-3 py-3 space-y-2" aria-busy="true" aria-label="Loading results">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-7 rounded bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {showNoResults && (
            <p className="px-3 py-4 text-sm text-muted-foreground text-center">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}

          {!loading && hasResults && (
            <div className="max-h-72 overflow-y-auto py-1">
              {flat.map((item, index) => (
                <button
                  key={`${item.kind}-${item.id}`}
                  id={`gs-result-${item.kind}-${item.id}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  onClick={() => navigate(item.href)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                    index === activeIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  )}
                >
                  {KIND_ICONS[item.kind]}
                  <span className="flex-1 truncate">{item.label}</span>
                  <Badge
                    variant="outline"
                    className="shrink-0 text-[11px] font-normal"
                  >
                    {STATUS_LABELS[item.status] ?? item.status}
                  </Badge>
                </button>
              ))}
            </div>
          )}

          {/* Footer hint */}
          <div className="flex items-center gap-3 border-t px-3 py-1.5 text-[11px] text-muted-foreground bg-muted/30">
            <span><kbd className="font-mono">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono">↵</kbd> open</span>
            <span><kbd className="font-mono">Esc</kbd> close</span>
          </div>
        </div>
      )}
    </div>
  );
}
