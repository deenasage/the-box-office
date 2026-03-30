// SPEC: design-improvements.md
// SPEC: dependencies.md
import { TicketDependencyGraph } from "@/components/tickets/TicketDependencyGraph";

export const metadata = {
  title: "Dependency Map",
};

export default function DependenciesPage() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dependency Map</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visualise dependencies between tickets across sprints. Click a node to open the ticket.
        </p>
      </div>
      <TicketDependencyGraph />
    </div>
  );
}
