// SPEC: labels.md
"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notify } from "@/lib/toast";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";

interface ListValue {
  id: string;
  listKey: string;
  value: string;
  sortOrder: number;
}

interface ApiResponse {
  data: ListValue[];
}

interface SingleResponse {
  data: ListValue;
  error?: string;
}

interface ErrorResponse {
  error?: string;
}

interface Props {
  title: string;
  listKey: string;
  singularLabel: string;
  description?: string;
}

export function ListValueSection({ title, listKey, singularLabel, description }: Props) {
  const [items, setItems] = useState<ListValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // Add-new state
  const [addingValue, setAddingValue] = useState("");
  const [addingActive, setAddingActive] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  // Confirm-delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLoading(true);
    setFetchError(false);
    fetch(`/api/list-values?key=${encodeURIComponent(listKey)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("fetch failed");
        const json = (await res.json()) as ApiResponse;
        setItems(json.data ?? []);
      })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [listKey]);

  // Focus add input when row opens
  useEffect(() => {
    if (addingActive) addInputRef.current?.focus();
  }, [addingActive]);

  async function handleAdd() {
    const trimmed = addingValue.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const res = await fetch("/api/list-values", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listKey, value: trimmed }),
      });
      const json = (await res.json()) as SingleResponse;
      if (!res.ok) {
        notify.error(typeof json.error === "string" ? json.error : "Failed to add value");
        return;
      }
      setItems((prev) => [...prev, json.data]);
      setAddingValue("");
      setAddingActive(false);
      notify.success(`"${trimmed}" added to ${title}`);
    } catch {
      notify.error("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function handleEditSave(id: string) {
    const trimmed = editingValue.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/list-values/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: trimmed }),
      });
      const json = (await res.json()) as SingleResponse;
      if (!res.ok) {
        notify.error(typeof json.error === "string" ? json.error : "Failed to update value");
        return;
      }
      setItems((prev) => prev.map((item) => (item.id === id ? json.data : item)));
      setEditingId(null);
      notify.success("Value updated");
    } catch {
      notify.error("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string, value: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setConfirmDeleteId(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/list-values/${id}`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        setItems((prev) => prev.filter((item) => item.id !== id));
        notify.success(`"${value}" deleted`);
      } else {
        const json = (await res.json()) as ErrorResponse;
        notify.error(json.error ?? "Failed to delete value");
      }
    } catch {
      notify.error("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => {
            setAddingActive(true);
            setEditingId(null);
            setConfirmDeleteId(null);
          }}
          disabled={addingActive}
          aria-label={`Add new ${singularLabel}`}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add {singularLabel}
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : fetchError ? (
          <div className="px-4 py-8 text-center text-sm text-destructive">
            Failed to load {title.toLowerCase()}. Please refresh.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                  Value
                </th>
                <th className="px-4 py-2.5 w-28" />
              </tr>
            </thead>
            <tbody>
              {/* Add-new inline row */}
              {addingActive && (
                <tr className="border-b bg-muted/20">
                  <td className="px-4 py-2.5">
                    <Input
                      ref={addInputRef}
                      value={addingValue}
                      onChange={(e) => setAddingValue(e.target.value)}
                      placeholder={`New ${title.toLowerCase()} value…`}
                      className="h-7 text-sm w-full max-w-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleAdd();
                        if (e.key === "Escape") {
                          setAddingActive(false);
                          setAddingValue("");
                        }
                      }}
                      aria-label={`New ${title} value`}
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-green-600 hover:text-green-700"
                        onClick={() => void handleAdd()}
                        disabled={busy || !addingValue.trim()}
                        aria-label="Confirm add"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          setAddingActive(false);
                          setAddingValue("");
                        }}
                        aria-label="Cancel add"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Empty state */}
              {items.length === 0 && !addingActive && (
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    No {title.toLowerCase()} values yet. Click &ldquo;Add&rdquo; to create one.
                  </td>
                </tr>
              )}

              {/* Item rows */}
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-2.5">
                    {editingId === item.id ? (
                      <Input
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="h-7 text-sm w-full max-w-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleEditSave(item.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        aria-label={`Edit value ${item.value}`}
                      />
                    ) : (
                      <span>{item.value}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1 justify-end">
                      {editingId === item.id ? (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-green-600 hover:text-green-700"
                            onClick={() => void handleEditSave(item.id)}
                            disabled={busy || !editingValue.trim()}
                            aria-label="Save edit"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setEditingId(null)}
                            aria-label="Cancel edit"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : confirmDeleteId === item.id ? (
                        <>
                          <span className="text-xs text-destructive mr-1">Delete?</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => void handleDelete(item.id, item.value)}
                            disabled={busy}
                            aria-label="Confirm delete"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setConfirmDeleteId(null)}
                            aria-label="Cancel delete"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingId(item.id);
                              setEditingValue(item.value);
                              setConfirmDeleteId(null);
                              setAddingActive(false);
                            }}
                            disabled={busy}
                            aria-label={`Edit ${item.value}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => void handleDelete(item.id, item.value)}
                            disabled={busy}
                            aria-label={`Delete ${item.value}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
