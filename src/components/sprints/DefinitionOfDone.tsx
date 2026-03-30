// SPEC: sprints.md
// Scrum Master requirement: Definition of Done checklist per sprint.
// Items and per-sprint checks are persisted in localStorage.
"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Plus, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface DoDItem {
  id: string;
  text: string;
}

interface DoDState {
  items: DoDItem[];
  checked: Record<string, boolean>; // keyed by `${sprintId}:${itemId}`
}

const STORAGE_KEY = "ticket-intake:definition-of-done";
const DEFAULT_ITEMS: DoDItem[] = [
  { id: "code-reviewed",     text: "Code reviewed by at least one peer" },
  { id: "tests-passing",     text: "All acceptance criteria met" },
  { id: "no-blockers",       text: "No open blockers on related tickets" },
  { id: "stakeholder-demo",  text: "Demoed to stakeholder or product owner" },
  { id: "docs-updated",      text: "Documentation or handoff notes updated" },
  { id: "ticket-closed",     text: "Ticket marked Done and sprint updated" },
];

function load(): DoDState {
  if (typeof window === "undefined") return { items: DEFAULT_ITEMS, checked: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: DEFAULT_ITEMS, checked: {} };
    return JSON.parse(raw) as DoDState;
  } catch {
    return { items: DEFAULT_ITEMS, checked: {} };
  }
}

function save(state: DoDState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function DefinitionOfDone({ sprintId }: { sprintId: string }) {
  const [state, setState] = useState<DoDState>({ items: DEFAULT_ITEMS, checked: {} });
  const [newItemText, setNewItemText] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setState(load());
  }, []);

  function update(next: DoDState) {
    setState(next);
    save(next);
  }

  function toggleCheck(itemId: string) {
    const key = `${sprintId}:${itemId}`;
    update({ ...state, checked: { ...state.checked, [key]: !state.checked[key] } });
  }

  function addItem() {
    const text = newItemText.trim();
    if (!text) return;
    const item: DoDItem = { id: `custom-${Date.now()}`, text };
    update({ ...state, items: [...state.items, item] });
    setNewItemText("");
  }

  function removeItem(id: string) {
    update({ ...state, items: state.items.filter((i) => i.id !== id) });
  }

  const checkedCount = state.items.filter((i) => state.checked[`${sprintId}:${i.id}`]).length;
  const total = state.items.length;
  const pct = total > 0 ? Math.round((checkedCount / total) * 100) : 0;
  const allDone = checkedCount === total && total > 0;

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", allDone ? "bg-green-500" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={cn("text-xs font-medium tabular-nums", allDone ? "text-green-500" : "text-muted-foreground")}>
          {checkedCount}/{total} {allDone && "✓ All done"}
        </span>
      </div>

      {/* Checklist */}
      <ul className="space-y-1" role="list" aria-label="Definition of Done checklist">
        {state.items.map((item) => {
          const key = `${sprintId}:${item.id}`;
          const checked = !!state.checked[key];
          return (
            <li key={item.id} className="flex items-center gap-2 group">
              <button
                onClick={() => toggleCheck(item.id)}
                className={cn(
                  "shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded",
                  checked ? "text-green-500" : "text-muted-foreground hover:text-foreground"
                )}
                aria-label={checked ? `Uncheck: ${item.text}` : `Check: ${item.text}`}
                aria-pressed={checked}
              >
                {checked ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
              </button>
              <span className={cn("text-sm flex-1", checked && "line-through text-muted-foreground")}>
                {item.text}
              </span>
              {editing && (
                <button
                  onClick={() => removeItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-destructive/60 hover:text-destructive transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive rounded"
                  aria-label={`Remove: ${item.text}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {/* Add item / edit toggle */}
      {editing ? (
        <div className="flex gap-2">
          <input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addItem(); }}
            placeholder="Add a DoD criterion…"
            className="flex-1 h-7 text-sm rounded-md border border-border bg-background px-2 focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label="New Definition of Done item"
          />
          <button
            onClick={addItem}
            disabled={!newItemText.trim()}
            className="h-7 px-2 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setEditing(false)}
            className="h-7 px-2 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground"
          >
            Done
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          Edit criteria
        </button>
      )}
    </div>
  );
}
