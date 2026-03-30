// SPEC: tickets.md
"use client";

import { Download } from "lucide-react";

interface ExportButtonProps {
  /** Current team filter value (e.g. "CONTENT") or undefined */
  team?: string;
  /** Current sprint filter value (e.g. a sprint cuid, "none") or undefined */
  sprintId?: string;
  /** Current status filter value (e.g. "IN_PROGRESS") or undefined */
  status?: string;
}

/**
 * Renders an anchor tag styled as a button that triggers a CSV download.
 * The download URL is built from the current filter params so the export
 * matches whatever subset of tickets the user is currently viewing.
 *
 * This is a client component so it can construct the URL on the client
 * without blocking the server-rendered tickets page.
 */
export function ExportButton({ team, sprintId, status }: ExportButtonProps) {
  const params = new URLSearchParams();
  if (team) params.set("team", team);
  if (sprintId) params.set("sprintId", sprintId);
  if (status) params.set("status", status);

  const query = params.toString();
  const href = `/api/export/tickets${query ? `?${query}` : ""}`;

  return (
    <a
      href={href}
      download
      className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      Export CSV
    </a>
  );
}
