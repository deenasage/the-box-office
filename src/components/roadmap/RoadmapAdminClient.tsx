// SPEC: roadmap.md
"use client";

import { useCallback, useEffect, useState } from "react";
import { RoadmapAdminRow, type AdminItemRow } from "./RoadmapAdminRow";

type User = { id: string; name: string };

export function RoadmapAdminClient() {
  const [items, setItems] = useState<AdminItemRow[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [itemsRes, usersRes] = await Promise.all([
        fetch("/api/roadmap-items"),
        fetch("/api/users"),
      ]);
      if (!itemsRes.ok) throw new Error("Failed to load roadmap items");
      if (!usersRes.ok) throw new Error("Failed to load users");
      const itemsJson = await itemsRes.json() as { data: AdminItemRow[] };
      const usersJson = await usersRes.json() as User[];
      setItems(itemsJson.data ?? []);
      setUsers(usersJson);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  async function handlePatch(id: string, patch: Partial<AdminItemRow>) {
    await fetch(`/api/roadmap-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    // Optimistic local update — avoids a full refetch on every keystroke save
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        No roadmap items found. Add items via the Roadmap spreadsheet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-muted/50 border-b text-left">
            <th className="px-3 py-3 text-xs font-semibold text-foreground w-28">Category</th>
            <th className="px-3 py-3 text-xs font-semibold text-foreground w-32">Initiative</th>
            <th className="px-3 py-3 text-xs font-semibold text-foreground w-20">Region</th>
            <th className="px-3 py-3 text-xs font-semibold text-foreground">Title</th>
            <th className="px-3 py-3 text-xs font-semibold text-foreground w-36">Owner</th>
            <th className="px-3 py-3 text-xs font-semibold text-foreground w-36">Status</th>
            <th className="px-3 py-3 text-xs font-semibold text-foreground w-28">Period</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <RoadmapAdminRow
              key={item.id}
              item={item}
              users={users}
              onPatch={handlePatch}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
