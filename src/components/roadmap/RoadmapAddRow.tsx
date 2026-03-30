// SPEC: roadmap.md
"use client";

import { useState } from "react";
import { RoadmapItemStatus } from "@prisma/client";

type Props = {
  period: string;
  onAdd: (data: { title: string; period: string; status: RoadmapItemStatus }) => Promise<void>;
};

export function RoadmapAddRow({ period, onAdd }: Props) {
  const [adding, setAdding] = useState(false);

  async function handleClick() {
    if (adding) return;
    setAdding(true);
    try {
      // Post an empty placeholder row (single space satisfies API min:1 requirement)
      // The row appears immediately and is editable inline via RoadmapSpreadsheetRow
      await onAdd({ title: " ", period, status: RoadmapItemStatus.NOT_STARTED });
    } finally {
      setAdding(false);
    }
  }

  return (
    <tr>
      <td colSpan={9} className="px-2 py-1">
        <button
          type="button"
          disabled={adding}
          onClick={handleClick}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {adding ? "Adding…" : "+ Add row"}
        </button>
      </td>
    </tr>
  );
}
