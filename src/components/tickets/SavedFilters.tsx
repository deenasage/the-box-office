// SPEC: tickets.md
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bookmark, X, BookmarkPlus } from "lucide-react";

const STORAGE_KEY = "ticket-intake:saved-filters";

export interface SavedFilter {
  id: string;
  name: string;
  team?: string;
  sprintId?: string;
  status?: string;
  assigneeId?: string;
  createdAt: string;
}

interface SavedFiltersProps {
  currentTeam?: string;
  currentSprintId?: string;
  currentStatus?: string;
  currentAssigneeId?: string;
  onApply: (filter: SavedFilter) => void;
}

function loadFilters(): SavedFilter[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedFilter[];
  } catch {
    return [];
  }
}

function saveFilters(filters: SavedFilter[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
}

export function SavedFilters({
  currentTeam,
  currentSprintId,
  currentStatus,
  currentAssigneeId,
  onApply,
}: SavedFiltersProps) {
  const [filters, setFilters] = useState<SavedFilter[]>([]);
  const [showNameInput, setShowNameInput] = useState(false);
  const [name, setName] = useState("");

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    setFilters(loadFilters());
  }, []);

  const hasActiveFilter = !!(
    currentTeam ||
    currentSprintId ||
    currentStatus ||
    currentAssigneeId
  );

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: trimmed,
      team: currentTeam || undefined,
      sprintId: currentSprintId || undefined,
      status: currentStatus || undefined,
      assigneeId: currentAssigneeId || undefined,
      createdAt: new Date().toISOString(),
    };
    const updated = [...filters, newFilter];
    setFilters(updated);
    saveFilters(updated);
    setName("");
    setShowNameInput(false);
  }

  function handleDelete(id: string) {
    const updated = filters.filter((f) => f.id !== id);
    setFilters(updated);
    saveFilters(updated);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setShowNameInput(false);
      setName("");
    }
  }

  if (!hasActiveFilter && filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Save button — only shown when at least one filter is active */}
      {hasActiveFilter && !showNameInput && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowNameInput(true)}
          className="h-7 text-xs gap-1"
          aria-label="Save current filters"
        >
          <BookmarkPlus className="h-3.5 w-3.5" />
          Save filters
        </Button>
      )}

      {/* Inline name input */}
      {showNameInput && (
        <div className="flex items-center gap-1.5">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Filter name…"
            className="h-7 text-xs w-36"
            aria-label="Name for saved filter"
            maxLength={40}
          />
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!name.trim()}
            className="h-7 text-xs px-2"
            aria-label="Confirm save filter"
          >
            Save
          </Button>
          <button
            type="button"
            onClick={() => {
              setShowNameInput(false);
              setName("");
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Cancel saving filter"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Saved filter chips */}
      {filters.map((f) => (
        <div
          key={f.id}
          className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-medium"
        >
          <Bookmark className="h-3 w-3 shrink-0" aria-hidden="true" />
          <button
            type="button"
            onClick={() => onApply(f)}
            className="hover:underline focus-visible:underline outline-none max-w-[120px] truncate"
            title={`Apply filter: ${f.name}`}
            aria-label={`Apply saved filter: ${f.name}`}
          >
            {f.name}
          </button>
          <button
            type="button"
            onClick={() => handleDelete(f.id)}
            className="ml-0.5 rounded-full hover:bg-primary/20 p-0.5 transition-colors"
            aria-label={`Delete saved filter: ${f.name}`}
          >
            <X className="h-2.5 w-2.5" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
