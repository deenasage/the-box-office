// SPEC: auto-assign-v2.md
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { UserRole, Team, TicketSize, TicketStatus, DependencyType } from "@prisma/client";
import { SIZE_HOURS } from "@/lib/utils";

const previewSchema = z.object({
  targetSprintId: z.string().min(1),
  // Accept either a single Team value or an array of Team values.
  // AutoAssignButton sends an array; single-value callers remain compatible.
  teamFilter: z.union([z.nativeEnum(Team), z.array(z.nativeEnum(Team))]).optional(),
  ignoreCapacity: z.boolean().default(false),
  includeStatuses: z.array(z.nativeEnum(TicketStatus)).optional(),
  prioritizeCarryover: z.boolean().optional(),
});

// POST /api/tickets/auto-assign/preview
// Auth: ADMIN or TEAM_LEAD
// Body: { targetSprintId: string, teamFilter?: Team, ignoreCapacity?: boolean }
// Returns assignment proposals without making any DB writes.
// TEAM_LEAD role is scoped to their own team unless teamFilter overrides (and even then
// the scope is intersected with their team).
// Response 200: { proposals, skippedTickets, skillGapWarnings, teamStats, targetSprint, availableAssignees }
// Response 400: validation failure
// Response 403: insufficient role
// Response 404: sprint not found
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const role = session.user.role;
  if (role !== UserRole.ADMIN && role !== UserRole.TEAM_LEAD) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { targetSprintId, ignoreCapacity, includeStatuses, prioritizeCarryover } = parsed.data;

  // Default to both BACKLOG and TODO when not specified
  const candidateStatuses: TicketStatus[] =
    includeStatuses && includeStatuses.length > 0
      ? includeStatuses
      : [TicketStatus.BACKLOG, TicketStatus.TODO];

  // Normalise teamFilter to a Team[] | undefined.
  // AutoAssignButton sends an array (or undefined when all 6 teams selected).
  // TEAM_LEAD is locked to their own team (single-element array).
  const rawTeamFilter = parsed.data.teamFilter;

  // Normalise to array form: string → [string], array → array, undefined → undefined
  const normalisedTeamFilterArray: Team[] | undefined = rawTeamFilter === undefined
    ? undefined
    : Array.isArray(rawTeamFilter)
    ? (rawTeamFilter.length > 0 ? rawTeamFilter : undefined)
    : [rawTeamFilter];

  // BUG-24: TEAM_LEAD is always scoped to their own team. ADMIN can use any teamFilter.
  let teamFilterArray: Team[] | undefined;
  if (role === UserRole.TEAM_LEAD && session.user.team) {
    // Lock TEAM_LEAD to their own team regardless of what they sent
    teamFilterArray = [session.user.team as Team];
  } else {
    teamFilterArray = normalisedTeamFilterArray;
  }

  // Build Prisma "team" where clause — single value uses equality, array uses { in: [...] }
  const teamWhereClause: { team?: Team | { in: Team[] } } =
    teamFilterArray === undefined
      ? {}
      : teamFilterArray.length === 1
      ? { team: teamFilterArray[0] }
      : { team: { in: teamFilterArray } };

  // Step 0 — verify sprint exists (BUG-01: 404 not 400)
  const targetSprint = await db.sprint.findUnique({
    where: { id: targetSprintId },
    select: { id: true, name: true },
  });
  if (!targetSprint) {
    return NextResponse.json(
      { error: `Sprint "${targetSprintId}" not found` },
      { status: 404 }
    );
  }

  // Step 1 — load candidate assignee pool with skillsets
  const teamWhere = Object.keys(teamWhereClause).length > 0 ? teamWhereClause : undefined;

  const allUsers = await db.user.findMany({
    where: teamWhere,
    select: {
      id: true,
      name: true,
      team: true,
      skillsets: {
        select: {
          skillset: { select: { id: true, name: true, color: true } },
        },
      },
    },
  });

  // Step 2 — load existing committed hours in target sprint per user
  const existingSprintTickets = await db.ticket.findMany({
    where: { sprintId: targetSprintId, size: { not: null } },
    select: { assigneeId: true, size: true },
  });

  // Snapshot of committed hours BEFORE adding any proposals — used in availableAssignees
  const committedHoursSnapshot: Map<string, number> = new Map();
  for (const t of existingSprintTickets) {
    if (!t.assigneeId || !t.size) continue;
    const current = committedHoursSnapshot.get(t.assigneeId) ?? 0;
    committedHoursSnapshot.set(t.assigneeId, current + SIZE_HOURS[t.size as TicketSize]);
  }

  // Mutable map used during proposal generation — seeded from snapshot
  const committedHours: Map<string, number> = new Map(committedHoursSnapshot);

  // Step 3 — load team capacity records for the target sprint
  const capacityRecords = await db.teamCapacity.findMany({
    where: { sprintId: targetSprintId },
    select: { userId: true, hours: true },
  });
  const capacityMap: Map<string, number | null> = new Map(
    capacityRecords.map((c) => [c.userId, c.hours ?? null])
  );

  // Step 4 — load candidate tickets (sized, unscheduled, matching requested statuses)
  const candidateTickets = await db.ticket.findMany({
    where: {
      status: { in: candidateStatuses },
      sprintId: null,
      size: { not: null },
      ...teamWhereClause,
    },
    select: {
      id: true,
      title: true,
      team: true,
      size: true,
      priority: true,
      createdAt: true,
      isCarryover: true,
      requiredSkillsetId: true,
      requiredSkillset: { select: { id: true, name: true, color: true } },
      status: true,
      // BUG-03 (part 1): rows where THIS ticket is toTicketId and type=BLOCKS
      // meaning "something BLOCKS me"
      dependenciesTo: {
        where: { type: DependencyType.BLOCKS },
        select: {
          fromTicket: { select: { id: true, title: true, status: true } },
        },
      },
      // BUG-03 (part 2): rows where THIS ticket is fromTicketId and type=BLOCKED_BY
      // meaning "I am BLOCKED_BY something" — toTicket is the blocker
      dependenciesFrom: {
        where: { type: DependencyType.BLOCKED_BY },
        select: {
          toTicket: { select: { id: true, title: true, status: true } },
        },
      },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  // Also load unsized + BLOCKED-status tickets for the skippedTickets array
  const skippedStatuses = [...new Set([...candidateStatuses, TicketStatus.BLOCKED])];
  const unsizedAndBlockedTickets = await db.ticket.findMany({
    where: {
      status: { in: skippedStatuses },
      sprintId: null,
      OR: [
        { size: null },
        { status: TicketStatus.BLOCKED },
      ],
      ...teamWhereClause,
    },
    select: {
      id: true,
      title: true,
      team: true,
      size: true,
      status: true,
    },
  });

  // Step 5 — split candidate tickets into eligible and blocked
  type CandidateTicket = (typeof candidateTickets)[number];

  const eligibleTickets: CandidateTicket[] = [];
  const blockedSkipped: Array<{
    id: string;
    title: string;
    team: Team;
    size: TicketSize | null;
    blockedByTicketId: string;
    blockedByTicketTitle: string;
  }> = [];

  for (const ticket of candidateTickets) {
    // Check BLOCKS-type dependencies (dependenciesTo): fromTicket blocks this ticket
    const blockerViaBlocks = ticket.dependenciesTo.find(
      (dep) => dep.fromTicket.status !== TicketStatus.DONE
    );
    if (blockerViaBlocks) {
      blockedSkipped.push({
        id: ticket.id,
        title: ticket.title,
        team: ticket.team,
        size: ticket.size as TicketSize | null,
        blockedByTicketId: blockerViaBlocks.fromTicket.id,
        blockedByTicketTitle: blockerViaBlocks.fromTicket.title,
      });
      continue;
    }

    // BUG-03: Check BLOCKED_BY-type dependencies (dependenciesFrom): toTicket is the blocker
    const blockerViaBlockedBy = ticket.dependenciesFrom.find(
      (dep) => dep.toTicket.status !== TicketStatus.DONE
    );
    if (blockerViaBlockedBy) {
      blockedSkipped.push({
        id: ticket.id,
        title: ticket.title,
        team: ticket.team,
        size: ticket.size as TicketSize | null,
        blockedByTicketId: blockerViaBlockedBy.toTicket.id,
        blockedByTicketTitle: blockerViaBlockedBy.toTicket.title,
      });
      continue;
    }

    eligibleTickets.push(ticket);
  }

  // Step 6 — build skippedTickets array (replaces skippedCount — BUG per spec change 5)
  // Deduplicate by ticket id: unsized/BLOCKED-status tickets + dependency-blocked tickets
  // Field names match the SkippedTicket frontend type: { id, title, reason }
  const skippedTicketsMap = new Map<
    string,
    {
      id: string;
      title: string;
      team: Team;
      size: TicketSize | null;
      reason: "NO_SIZE" | "BLOCKED" | "NO_ASSIGNEE_AVAILABLE";
      blockedByTicketId?: string;
      blockedByTicketTitle?: string;
    }
  >();

  for (const t of unsizedAndBlockedTickets) {
    if (!skippedTicketsMap.has(t.id)) {
      skippedTicketsMap.set(t.id, {
        id: t.id,
        title: t.title,
        team: t.team,
        size: t.size as TicketSize | null,
        reason: t.status === TicketStatus.BLOCKED ? "BLOCKED" : "NO_SIZE",
      });
    }
  }

  for (const t of blockedSkipped) {
    // A dependency-blocked ticket might already appear in unsizedAndBlockedTickets if its
    // status is BLOCKED. Only add if not already recorded.
    if (!skippedTicketsMap.has(t.id)) {
      skippedTicketsMap.set(t.id, {
        id: t.id,
        title: t.title,
        team: t.team,
        size: t.size,
        reason: "BLOCKED",
        blockedByTicketId: t.blockedByTicketId,
        blockedByTicketTitle: t.blockedByTicketTitle,
      });
    }
  }

  const skippedTickets = Array.from(skippedTicketsMap.values());

  // Step 6b — when prioritizeCarryover is true, sort carryover tickets to the front
  // of eligibleTickets before topological ordering and proposal generation.
  if (prioritizeCarryover) {
    eligibleTickets.sort((a, b) => {
      const aCarry = a.isCarryover ? 0 : 1;
      const bCarry = b.isCarryover ? 0 : 1;
      return aCarry - bCarry;
    });
  }

  // Step 7 — run matching algorithm
  // Helper: build matchReason string
  function buildMatchReason(params: {
    team: Team;
    skillsetName: string | null;
    candidateCount: number;
    bestHours: number;
    capacityHours: number | null;
    flag: "OK" | "OVER_CAPACITY" | "UNASSIGNABLE";
    ignoreCapacity: boolean;
  }): string {
    const { team, skillsetName, candidateCount, bestHours, capacityHours, flag, ignoreCapacity } = params;

    if (flag === "UNASSIGNABLE") {
      if (skillsetName) {
        return `No ${team} member holds ${skillsetName}`;
      }
      return `No members assigned to ${team} team`;
    }

    const capacitySuffix = ignoreCapacity ? " (capacity ignored)" : "";

    if (flag === "OVER_CAPACITY" && capacityHours !== null) {
      const label = skillsetName ? `Has ${skillsetName}, but` : "But";
      return `${label} at capacity (${bestHours}h / ${capacityHours}h)${capacitySuffix}`;
    }

    if (skillsetName) {
      if (candidateCount === 1) {
        return `Only ${team} member with ${skillsetName} (${bestHours}h committed)${capacitySuffix}`;
      }
      return `Has ${skillsetName}, lowest load (${bestHours}h committed)${capacitySuffix}`;
    }

    return `Lowest load on ${team} team (${bestHours}h committed)${capacitySuffix}`;
  }

  type Proposal = {
    ticketId: string;
    ticketTitle: string;
    team: Team;
    size: TicketSize;
    priority: number;
    // Flat fields matching the AutoAssignProposalV2 frontend type
    requiredSkillsetId: string | null;
    requiredSkillsetName: string | null;
    // Keep nested for internal use (skill gap warnings step uses it)
    requiredSkillset: { id: string; name: string; color: string } | null;
    proposedAssigneeId: string | null;
    proposedAssigneeName: string | null;
    // Field name matches AutoAssignProposalV2: targetSprintId (not proposedSprintId)
    targetSprintId: string;
    committedHoursBefore: number;
    committedHoursAfter: number;
    capacityHours: number | null;
    flag: "OK" | "OVER_CAPACITY" | "UNASSIGNABLE";
    matchReason: string;
    dependencyOrder: number; // assigned after topological sort
  };

  const proposals: Proposal[] = eligibleTickets.map((ticket) => {
    const ticketSize = ticket.size as TicketSize;
    const ticketHours = SIZE_HOURS[ticketSize];

    let candidateUsers = allUsers.filter((u) => u.team === ticket.team);

    if (ticket.requiredSkillsetId) {
      const requiredId = ticket.requiredSkillsetId;
      candidateUsers = candidateUsers.filter((u) =>
        u.skillsets.some((us) => us.skillset.id === requiredId)
      );
    }

    const skillsetName = ticket.requiredSkillset?.name ?? null;

    if (candidateUsers.length === 0) {
      return {
        ticketId: ticket.id,
        ticketTitle: ticket.title,
        team: ticket.team,
        size: ticketSize,
        priority: ticket.priority,
        requiredSkillsetId: ticket.requiredSkillset?.id ?? null,
        requiredSkillsetName: ticket.requiredSkillset?.name ?? null,
        requiredSkillset: ticket.requiredSkillset ?? null,
        proposedAssigneeId: null,
        proposedAssigneeName: null,
        targetSprintId: targetSprintId,
        committedHoursBefore: 0,
        committedHoursAfter: 0,
        capacityHours: null,
        flag: "UNASSIGNABLE" as const,
        matchReason: buildMatchReason({
          team: ticket.team,
          skillsetName,
          candidateCount: 0,
          bestHours: 0,
          capacityHours: null,
          flag: "UNASSIGNABLE",
          ignoreCapacity,
        }),
        dependencyOrder: 0,
      };
    }

    // Pick least-loaded candidate
    let bestUser = candidateUsers[0];
    let bestHours = committedHours.get(bestUser.id) ?? 0;

    for (const u of candidateUsers.slice(1)) {
      const h = committedHours.get(u.id) ?? 0;
      if (h < bestHours) {
        bestHours = h;
        bestUser = u;
      }
    }

    const committedHoursBefore = bestHours;
    const hoursAfter = bestHours + ticketHours;
    const capacityHours = capacityMap.get(bestUser.id) ?? null;

    // Determine flag — when ignoreCapacity=true, never set OVER_CAPACITY
    let flag: "OK" | "OVER_CAPACITY" | "UNASSIGNABLE" = "OK";
    if (!ignoreCapacity && capacityHours !== null && hoursAfter > capacityHours) {
      flag = "OVER_CAPACITY";
    }

    // Update mutable map so subsequent proposals account for this allocation
    committedHours.set(bestUser.id, hoursAfter);

    return {
      ticketId: ticket.id,
      ticketTitle: ticket.title,
      team: ticket.team,
      size: ticketSize,
      priority: ticket.priority,
      requiredSkillsetId: ticket.requiredSkillset?.id ?? null,
      requiredSkillsetName: ticket.requiredSkillset?.name ?? null,
      requiredSkillset: ticket.requiredSkillset ?? null,
      proposedAssigneeId: bestUser.id,
      proposedAssigneeName: bestUser.name,
      targetSprintId: targetSprintId,
      committedHoursBefore,
      committedHoursAfter: hoursAfter,
      capacityHours,
      flag,
      matchReason: buildMatchReason({
        team: ticket.team,
        skillsetName,
        candidateCount: candidateUsers.length,
        bestHours: committedHoursBefore,
        capacityHours,
        flag,
        ignoreCapacity,
      }),
      dependencyOrder: 0, // placeholder — overwritten by topological sort below
    };
  });

  // Step 8 — topological sort for dependencyOrder
  // Build a map from ticketId -> proposal index for fast lookup
  const proposalIndexByTicketId = new Map<string, number>();
  for (let i = 0; i < proposals.length; i++) {
    proposalIndexByTicketId.set(proposals[i].ticketId, i);
  }

  // Build adjacency list: ticketId -> set of ticketIds that must come BEFORE it
  // A BLOCKS edge (fromTicket BLOCKS toTicket) means toTicket depends on fromTicket
  // A BLOCKED_BY edge (fromTicket BLOCKED_BY toTicket) means fromTicket depends on toTicket
  // We only care about edges where BOTH endpoints are in the proposal set
  const predecessors = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();

  for (const p of proposals) {
    predecessors.set(p.ticketId, new Set());
    inDegree.set(p.ticketId, 0);
  }

  for (const ticket of eligibleTickets) {
    // BLOCKS deps: fromTicket blocks this ticket — so this ticket depends on fromTicket
    for (const dep of ticket.dependenciesTo) {
      const blockerId = dep.fromTicket.id;
      if (proposalIndexByTicketId.has(blockerId) && proposalIndexByTicketId.has(ticket.id)) {
        predecessors.get(ticket.id)!.add(blockerId);
      }
    }
    // BLOCKED_BY deps: toTicket is the blocker — so this ticket depends on toTicket
    for (const dep of ticket.dependenciesFrom) {
      const blockerId = dep.toTicket.id;
      if (proposalIndexByTicketId.has(blockerId) && proposalIndexByTicketId.has(ticket.id)) {
        predecessors.get(ticket.id)!.add(blockerId);
      }
    }
  }

  // Compute in-degree from predecessors
  for (const [ticketId, preds] of predecessors) {
    inDegree.set(ticketId, preds.size);
  }

  // Kahn's BFS topological sort
  const orderMap = new Map<string, number>();
  const queue: string[] = [];

  for (const [ticketId, deg] of inDegree) {
    if (deg === 0) queue.push(ticketId);
  }

  let currentOrder = 0;
  let processedCount = 0;

  // Build successors map for Kahn's algorithm
  const successors = new Map<string, string[]>();
  for (const p of proposals) {
    successors.set(p.ticketId, []);
  }
  for (const [ticketId, preds] of predecessors) {
    for (const predId of preds) {
      successors.get(predId)?.push(ticketId);
    }
  }

  while (queue.length > 0) {
    // Process all current zero-degree nodes at the same order level
    const currentBatch = [...queue];
    queue.length = 0;

    for (const ticketId of currentBatch) {
      orderMap.set(ticketId, currentOrder);
      processedCount++;

      for (const successor of successors.get(ticketId) ?? []) {
        const newDeg = (inDegree.get(successor) ?? 0) - 1;
        inDegree.set(successor, newDeg);
        if (newDeg === 0) queue.push(successor);
      }
    }
    currentOrder++;
  }

  // Cycle detection: any proposal not in orderMap was in a cycle
  if (processedCount < proposals.length) {
    console.warn(
      "[auto-assign/preview] Dependency cycle detected among proposals. Cycle members get dependencyOrder=0."
    );
  }

  // Write dependencyOrder back into proposals
  for (const proposal of proposals) {
    proposal.dependencyOrder = orderMap.get(proposal.ticketId) ?? 0;
  }

  // Step 9 — skill gap warnings
  // warning field matches the SkillGapWarning frontend type: "BOTTLENECK" | "NO_HOLDER"
  type SkillGapWarning = {
    skillsetId: string;
    skillsetName: string;
    team: Team;
    ticketCount: number;
    holderCount: number;
    totalHoursRequired: number;
    totalCapacityHours: number;
    warning: "BOTTLENECK" | "NO_HOLDER";
  };

  const skillGapMap = new Map<
    string,
    {
      skillsetId: string;
      skillsetName: string;
      team: Team;
      tickets: Proposal[];
    }
  >();

  for (const proposal of proposals) {
    if (!proposal.requiredSkillset) continue;
    const key = `${proposal.requiredSkillset.id}:${proposal.team}`;
    if (!skillGapMap.has(key)) {
      skillGapMap.set(key, {
        skillsetId: proposal.requiredSkillset.id,
        skillsetName: proposal.requiredSkillset.name,
        team: proposal.team,
        tickets: [],
      });
    }
    skillGapMap.get(key)!.tickets.push(proposal);
  }

  const skillGapWarnings: SkillGapWarning[] = [];

  for (const [, entry] of skillGapMap) {
    const { skillsetId, skillsetName, team, tickets } = entry;

    // Count team members who hold this skillset
    const holders = allUsers.filter(
      (u) =>
        u.team === team &&
        u.skillsets.some((us) => us.skillset.id === skillsetId)
    );
    const holderCount = holders.length;
    const ticketCount = tickets.length;
    const totalHoursRequired = tickets.reduce(
      (sum, p) => sum + SIZE_HOURS[p.size],
      0
    );

    // Sum capacity for holders (exclude null capacity — treat as unlimited, skip from sum)
    const holderCapacities = holders
      .map((h) => capacityMap.get(h.id) ?? null)
      .filter((c): c is number => c !== null);
    const totalCapacityHours = holderCapacities.reduce((sum, c) => sum + c, 0);

    const isNoHolder = holderCount === 0;
    const isBottleneck = holderCount === 1 && ticketCount > 1;
    const isOverCapacity = totalCapacityHours > 0 && totalHoursRequired > totalCapacityHours;

    const shouldWarn = isNoHolder || isBottleneck || isOverCapacity;

    if (shouldWarn) {
      skillGapWarnings.push({
        skillsetId,
        skillsetName,
        team,
        ticketCount,
        holderCount,
        totalHoursRequired,
        totalCapacityHours,
        warning: isNoHolder ? "NO_HOLDER" : "BOTTLENECK",
      });
    }
  }

  // Step 10 — teamStats
  type TeamStat = {
    team: Team;
    totalTickets: number;
    assignedTickets: number;
    unassignableTickets: number;
    totalCommittedHours: number;
  };

  const teamStatsMap = new Map<Team, TeamStat>();

  for (const proposal of proposals) {
    if (!teamStatsMap.has(proposal.team)) {
      teamStatsMap.set(proposal.team, {
        team: proposal.team,
        totalTickets: 0,
        assignedTickets: 0,
        unassignableTickets: 0,
        totalCommittedHours: 0,
      });
    }
    const stat = teamStatsMap.get(proposal.team)!;
    stat.totalTickets++;
    if (proposal.flag === "UNASSIGNABLE") {
      stat.unassignableTickets++;
    } else {
      stat.assignedTickets++;
      stat.totalCommittedHours += proposal.committedHoursAfter - proposal.committedHoursBefore;
    }
  }

  const teamStats = Array.from(teamStatsMap.values());

  // Step 11 — build availableAssignees with committedHours snapshot and capacityHours
  const availableAssignees = allUsers
    .filter((u): u is typeof u & { team: Team } => u.team !== null)
    .map((u) => ({
      id: u.id,
      name: u.name,
      team: u.team,
      skillsets: u.skillsets.map((us) => ({
        id: us.skillset.id,
        name: us.skillset.name,
      })),
      committedHours: committedHoursSnapshot.get(u.id) ?? 0,
      capacityHours: capacityMap.get(u.id) ?? null,
    }));

  return NextResponse.json({
    proposals,
    skippedTickets,
    skillGapWarnings,
    teamStats,
    targetSprint,
    availableAssignees,
  });
}
