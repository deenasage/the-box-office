// SPEC: dependencies.md
import { DependencyType } from "@prisma/client";

export interface SequencingWarning {
  blockerId: string;
  blockerTitle: string;
  blockerSprintId: string | null;
  blockerSprintName: string | null;
  dependentId: string;
  dependentTitle: string;
  dependentSprintId: string | null;
  dependentSprintName: string | null;
  message: string;
}

interface DepTicket {
  id: string;
  title: string;
  sprintId: string | null;
  sprintName: string | null;
  sprintStartDate: Date | null;
}

interface Dep {
  fromTicketId: string;
  toTicketId: string;
  type: DependencyType;
}

export function detectSequencingWarnings(
  dependencies: Dep[],
  tickets: Map<string, DepTicket>
): SequencingWarning[] {
  const warnings: SequencingWarning[] = [];
  for (const dep of dependencies) {
    if (dep.type !== DependencyType.BLOCKS) continue;
    const blocker = tickets.get(dep.fromTicketId);
    const dependent = tickets.get(dep.toTicketId);
    if (!blocker || !dependent) continue;
    if (!blocker.sprintStartDate || !dependent.sprintStartDate) continue;
    if (blocker.sprintStartDate >= dependent.sprintStartDate) {
      warnings.push({
        blockerId: blocker.id,
        blockerTitle: blocker.title,
        blockerSprintId: blocker.sprintId,
        blockerSprintName: blocker.sprintName,
        dependentId: dependent.id,
        dependentTitle: dependent.title,
        dependentSprintId: dependent.sprintId,
        dependentSprintName: dependent.sprintName,
        message: `"${blocker.title}" blocks "${dependent.title}" but is scheduled in ${blocker.sprintName ?? "the same or a later sprint"}.`,
      });
    }
  }
  return warnings;
}
