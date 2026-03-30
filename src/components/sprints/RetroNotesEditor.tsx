// SPEC: sprints.md
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, X, Check, Plus, Trash2 } from "lucide-react";

interface RetroActionItem {
  id: string;
  text: string;
  owner: string;
  dueDate: string;
  done: boolean;
}

interface RetroNotesEditorProps {
  sprintId: string;
  initialNotes: string | null;
  initialActionItems: string | null;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function parseActionItems(raw: string | null): RetroActionItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as RetroActionItem[];
    return [];
  } catch {
    return [];
  }
}

export function RetroNotesEditor({
  sprintId,
  initialNotes,
  initialActionItems,
}: RetroNotesEditorProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialNotes ?? "");
  const [actionItems, setActionItems] = useState<RetroActionItem[]>(
    parseActionItems(initialActionItems)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/sprints/${sprintId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          retrospectiveNotes: draft || null,
          retroActionItems: actionItems.length > 0 ? JSON.stringify(actionItems) : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save notes");
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDraft(initialNotes ?? "");
    setActionItems(parseActionItems(initialActionItems));
    setEditing(false);
    setError(null);
  }

  function addActionItem() {
    setActionItems((prev) => [
      ...prev,
      { id: generateId(), text: "", owner: "", dueDate: "", done: false },
    ]);
  }

  function updateActionItem(id: string, field: keyof RetroActionItem, value: string | boolean) {
    setActionItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  function removeActionItem(id: string) {
    setActionItems((prev) => prev.filter((item) => item.id !== id));
  }

  // Non-editing view: toggle done directly without opening the full editor
  function toggleDoneDirect(id: string) {
    const updated = actionItems.map((item) =>
      item.id === id ? { ...item, done: !item.done } : item
    );
    setActionItems(updated);
    void fetch(`/api/sprints/${sprintId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        retroActionItems: updated.length > 0 ? JSON.stringify(updated) : null,
      }),
    }).then((res) => {
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Free-text retro notes */}
      <div className="space-y-2">
        {editing ? (
          <>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="What went well? What could be improved? What will the team commit to next sprint?"
              className="min-h-[120px] resize-y text-sm"
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </>
        ) : (
          <div className="group relative">
            {draft ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed border rounded-md px-3 py-2 bg-muted/20">
                {draft}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic border rounded-md px-3 py-2 bg-muted/20">
                No retrospective notes yet.
              </p>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
          </div>
        )}
      </div>

      {/* Action items section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Action Items
          </p>
          {editing && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={addActionItem}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add action item
            </Button>
          )}
        </div>

        {actionItems.length === 0 && !editing && (
          <p className="text-sm text-muted-foreground italic">No action items yet.</p>
        )}

        {(actionItems.length > 0 || editing) && (
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="w-8 px-2 py-1.5 text-left text-xs font-medium text-muted-foreground">Done</th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground">Action</th>
                  <th className="w-28 px-2 py-1.5 text-left text-xs font-medium text-muted-foreground">Owner</th>
                  <th className="w-28 px-2 py-1.5 text-left text-xs font-medium text-muted-foreground">Due Date</th>
                  {editing && <th className="w-8 px-2 py-1.5" />}
                </tr>
              </thead>
              <tbody>
                {actionItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}
                  >
                    <td className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={(e) =>
                          editing
                            ? updateActionItem(item.id, "done", e.target.checked)
                            : toggleDoneDirect(item.id)
                        }
                        className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                        aria-label={`Mark "${item.text || "action item"}" as done`}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      {editing ? (
                        <Input
                          value={item.text}
                          onChange={(e) => updateActionItem(item.id, "text", e.target.value)}
                          placeholder="Describe the action…"
                          className="h-7 text-xs border-0 shadow-none focus-visible:ring-0 px-0"
                        />
                      ) : (
                        <span className={item.done ? "line-through text-muted-foreground" : ""}>
                          {item.text || <span className="italic text-muted-foreground">—</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {editing ? (
                        <Input
                          value={item.owner}
                          onChange={(e) => updateActionItem(item.id, "owner", e.target.value)}
                          placeholder="Owner"
                          className="h-7 text-xs border-0 shadow-none focus-visible:ring-0 px-0"
                        />
                      ) : (
                        <span className="text-muted-foreground">
                          {item.owner || <span className="italic">—</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {editing ? (
                        <Input
                          type="date"
                          value={item.dueDate}
                          onChange={(e) => updateActionItem(item.id, "dueDate", e.target.value)}
                          className="h-7 text-xs border-0 shadow-none focus-visible:ring-0 px-0"
                        />
                      ) : (
                        <span className="text-muted-foreground">
                          {item.dueDate || <span className="italic">—</span>}
                        </span>
                      )}
                    </td>
                    {editing && (
                      <td className="px-2 py-1.5 text-center">
                        <button
                          onClick={() => removeActionItem(item.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="Delete action item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {editing && actionItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-3 text-center text-xs text-muted-foreground italic">
                      No action items yet — click "Add action item" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!editing && actionItems.length === 0 && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => setEditing(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add action items
          </Button>
        )}
      </div>

      {/* Save / Cancel — shown whenever editing */}
      {editing && (
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Check className="h-3.5 w-3.5 mr-1" />
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancel} disabled={saving}>
            <X className="h-3.5 w-3.5 mr-1" />
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
