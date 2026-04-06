// SPEC: my-work.md
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SIZE_HOURS } from "@/lib/utils";
import { TicketSize, Prisma } from "@prisma/client";
import { MyWorkClient } from "@/components/my-work/MyWorkClient";
import { isCraftView } from "@/lib/role-helpers";

export interface UserCapacityDefaults {
  defaultHoursPerDay: number;
  defaultWorkdaysPerWeek: number;
}

export interface ActiveSprintInfo {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  daysOff: number;
}

const ticketInclude = {
  sprint: { select: { id: true, name: true } },
  epic: { select: { id: true, name: true } },
} satisfies Prisma.TicketInclude;

type WorkTicketRow = Prisma.TicketGetPayload<{ include: typeof ticketInclude }>;

export interface SerializedWorkTicket {
  id: string;
  title: string;
  status: import("@prisma/client").TicketStatus;
  size: import("@prisma/client").TicketSize | null;
  priority: number;
  team: import("@prisma/client").Team;
  dueDate: string | null;
  sprint: { id: string; name: string } | null;
  epic: { id: string; name: string } | null;
}

function serializeWorkTicket(t: WorkTicketRow): SerializedWorkTicket {
  return {
    id: t.id,
    title: t.title,
    status: t.status,
    size: t.size,
    priority: t.priority,
    team: t.team,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    sprint: t.sprint,
    epic: t.epic,
  };
}

const deadlineSelect = {
  id: true,
  title: true,
  dueDate: true,
  status: true,
  team: true,
  size: true,
  sprint: { select: { id: true, name: true } },
} satisfies Prisma.TicketSelect;

type DeadlineRow = Prisma.TicketGetPayload<{ select: typeof deadlineSelect }>;

export type MyWorkTab = "tickets" | "capacity" | "deadlines";

export default async function MyWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tab } = await searchParams;
  const activeTab: MyWorkTab =
    tab === "capacity" ? "capacity" : tab === "deadlines" ? "deadlines" : "tickets";

  const userId = session.user.id;
  const last7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Determine view mode: craft = tickets assigned to me; stakeholder = tickets I submitted
  const cookieStore = await cookies();
  const adminViewMode = cookieStore.get("adminViewMode")?.value ?? null;
  const craftMode = isCraftView(session.user.role, adminViewMode);

  // Build the ticket ownership filter for this user based on their role/view mode
  const ownershipFilter = craftMode
    ? { assigneeId: userId }
    : { OR: [{ creatorId: userId }, { assigneeId: userId }] };

  let openTicketsRaw: WorkTicketRow[];
  let recentDoneRaw: WorkTicketRow[];
  let upcomingDeadlines: DeadlineRow[];

  try {
    [openTicketsRaw, recentDoneRaw, upcomingDeadlines] = await Promise.all([
      db.ticket.findMany({
        where: { ...ownershipFilter, status: { notIn: ["DONE"] } },
        include: ticketInclude,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      }),
      db.ticket.findMany({
        where: {
          ...ownershipFilter,
          status: "DONE",
          updatedAt: { gte: craftMode ? last7 : last30 },
        },
        include: ticketInclude,
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      db.ticket.findMany({
        where: {
          ...ownershipFilter,
          dueDate: { not: null },
          status: { notIn: ["DONE"] },
        },
        select: deadlineSelect,
        orderBy: { dueDate: "asc" },
      }),
    ]);
  } catch {
    return <div className="p-8 text-sm text-destructive">Failed to load your work. Please refresh.</div>;
  }

  const openTickets: SerializedWorkTicket[] = openTicketsRaw.map(serializeWorkTicket);
  const recentDone: SerializedWorkTicket[] = recentDoneRaw.map(serializeWorkTicket);

  const totalHours = openTickets.reduce(
    (sum, t) => sum + (t.size ? SIZE_HOURS[t.size as TicketSize] : 0),
    0
  );

  // Fetch capacity-related data in parallel
  const [userRecord, activeSprint] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { defaultHoursPerDay: true, defaultWorkdaysPerWeek: true },
    }),
    db.sprint.findFirst({
      where: { isActive: true },
      select: { id: true, name: true, startDate: true, endDate: true, isActive: true },
    }),
  ]);

  const capacityDefaults: UserCapacityDefaults = {
    defaultHoursPerDay: userRecord?.defaultHoursPerDay ?? 8,
    defaultWorkdaysPerWeek: userRecord?.defaultWorkdaysPerWeek ?? 5,
  };

  let activeSprintInfo: ActiveSprintInfo | null = null;
  if (activeSprint) {
    const capacityRow = await db.teamCapacity.findUnique({
      where: { sprintId_userId: { sprintId: activeSprint.id, userId } },
      select: { daysOff: true },
    });
    activeSprintInfo = {
      id: activeSprint.id,
      name: activeSprint.name,
      startDate: activeSprint.startDate.toISOString(),
      endDate: activeSprint.endDate.toISOString(),
      isActive: activeSprint.isActive,
      daysOff: capacityRow?.daysOff ?? 0,
    };
  }

  // Serialize dates before crossing the server/client boundary
  const serializedDeadlines = upcomingDeadlines.map((t) => ({
    id: t.id,
    title: t.title,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    status: t.status,
    team: t.team,
    size: t.size,
    sprint: t.sprint,
  }));

  return (
    <MyWorkClient
      activeTab={activeTab}
      openTickets={openTickets}
      recentDone={recentDone}
      totalHours={totalHours}
      upcomingDeadlines={serializedDeadlines}
      capacityDefaults={capacityDefaults}
      activeSprint={activeSprintInfo}
    />
  );
}
