// SPEC: tickets.md
"use client";

import { useCallback, useEffect, useState } from "react";
import { isTeamLead } from "@/lib/role-helpers";
import { useRouter, useSearchParams } from "next/navigation";
import { PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { Team, TicketStatus, UserRole } from "@prisma/client";
import type { TicketSummary } from "@/types";
import { notify } from "@/lib/toast";
import { STATUS_LABELS } from "@/lib/constants";

type Ticket = TicketSummary;

export interface KanbanConfig {
  id: string;
  team: Team;
  status: TicketStatus;
  wipLimit: number | null;
}

export interface UseTicketBoardOptions {
  initialTickets: Ticket[];
  currentUser?: { id: string; name: string; role?: UserRole; team?: Team | null } | null;
}

export interface UseTicketBoardReturn {
  tickets: Ticket[];
  visibleTickets: Ticket[];
  teamUsers: { id: string; name: string }[];
  selectedPersonId: string;
  setSelectedPersonId: (id: string) => void;
  selectedSprintGoal: string | null;
  wipConfigs: KanbanConfig[];
  wipSettingsOpen: boolean;
  setWipSettingsOpen: (open: boolean) => void;
  isAdminOrLead: boolean;
  currentTeam: string;
  currentSprint: string;
  sensors: ReturnType<typeof useSensors>;
  handleDragEnd: (event: DragEndEvent) => Promise<void>;
  handleTeamChange: (teamValue: string) => Promise<void>;
  applyFilter: (key: string, value: string) => void;
  getWipLimit: (status: TicketStatus) => number | null;
  reloadWipConfigs: () => void;
}

export function useTicketBoard({
  initialTickets,
  currentUser,
}: UseTicketBoardOptions): UseTicketBoardReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTeam = searchParams.get("team") ?? "";
  const currentSprint = searchParams.get("sprintId") ?? "";

  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [teamUsers, setTeamUsers] = useState<{ id: string; name: string }[]>([]);
  const [selectedSprintGoal, setSelectedSprintGoal] = useState<string | null>(null);
  const [wipConfigs, setWipConfigs] = useState<KanbanConfig[]>([]);
  const [wipSettingsOpen, setWipSettingsOpen] = useState(false);

  const isAdminOrLead =
    currentUser?.role === UserRole.ADMIN ||
    isTeamLead(currentUser?.role as UserRole);

  // Fetch WIP configs once on mount
  useEffect(() => {
    fetch("/api/kanban-config")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: KanbanConfig[]) => setWipConfigs(data))
      .catch(() => setWipConfigs([]));
  }, []);

  // Fetch sprint goal when sprint filter changes
  useEffect(() => {
    if (!currentSprint || currentSprint === "none") {
      setSelectedSprintGoal(null);
      return;
    }
    fetch(`/api/sprints/${currentSprint}`)
      .then((r) => r.json())
      .then((data: { notes?: string | null }) => {
        setSelectedSprintGoal(data.notes ?? null);
      })
      .catch(() => setSelectedSprintGoal(null));
  }, [currentSprint]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const applyFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      // Reset to page 1 whenever a filter changes so results are coherent.
      params.delete("page");
      router.push(`/tickets?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleTeamChange = useCallback(
    async (teamValue: string) => {
      setSelectedPersonId("");
      applyFilter("team", teamValue);
      if (teamValue) {
        try {
          const res = await fetch(`/api/users?team=${teamValue}`);
          if (res.ok) {
            const data = (await res.json()) as { id: string; name: string }[];
            setTeamUsers(data);
          }
        } catch {
          setTeamUsers([]);
        }
      } else {
        setTeamUsers([]);
      }
    },
    [applyFilter]
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const newStatus = over.id as TicketStatus;
    const currentStatus = active.data.current?.status as TicketStatus | undefined;
    if (!currentStatus || currentStatus === newStatus) return;

    // Optimistic update
    setTickets((prev) =>
      prev.map((t) => (t.id === active.id ? { ...t, status: newStatus } : t))
    );

    try {
      const res = await fetch(`/api/tickets/${active.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === active.id ? { ...t, status: currentStatus } : t
          )
        );
        let serverMsg = "";
        try { serverMsg = ((await res.json()) as { error?: string }).error ?? ""; } catch { /* ignore */ }
        notify.error(serverMsg || `Failed to move ticket to ${STATUS_LABELS[newStatus]}`);
      } else {
        notify.success(`Moved to ${STATUS_LABELS[newStatus]}`);
      }
    } catch {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === active.id ? { ...t, status: currentStatus } : t
        )
      );
      notify.error(`Failed to move ticket to ${STATUS_LABELS[newStatus]}`);
    }
  }

  const visibleTickets = selectedPersonId
    ? tickets.filter((t) => t.assignee?.id === selectedPersonId)
    : tickets;

  function getWipLimit(status: TicketStatus): number | null {
    if (!currentTeam) return null;
    const cfg = wipConfigs.find(
      (c) => c.team === (currentTeam as Team) && c.status === status
    );
    return cfg?.wipLimit ?? null;
  }

  function reloadWipConfigs() {
    fetch("/api/kanban-config")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: KanbanConfig[]) => setWipConfigs(data))
      .catch(() => {});
  }

  return {
    tickets,
    visibleTickets,
    teamUsers,
    selectedPersonId,
    setSelectedPersonId,
    selectedSprintGoal,
    wipConfigs,
    wipSettingsOpen,
    setWipSettingsOpen,
    isAdminOrLead,
    currentTeam,
    currentSprint,
    sensors,
    handleDragEnd,
    handleTeamChange,
    applyFilter,
    getWipLimit,
    reloadWipConfigs,
  };
}
