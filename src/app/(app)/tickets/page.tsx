// SPEC: design-improvements.md
// Tickets board — main kanban view (moved from /kanban)
import { KanbanBoard } from "@/components/kanban/KanbanBoard";

export const metadata = { title: "Tickets" };

export default function TicketsPage() {
  return (
    <div className="px-4 py-4 flex flex-col h-screen max-h-screen">
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Drag tickets between columns to update their status. WIP limits shown in red when exceeded.
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <KanbanBoard />
      </div>
    </div>
  );
}
