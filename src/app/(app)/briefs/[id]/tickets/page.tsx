// SPEC: smart-tickets.md
import { db } from "@/lib/db";
import { isTeamLead } from "@/lib/role-helpers";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { UserRole } from "@prisma/client";
import { GenerateTicketsView } from "@/components/briefs/GenerateTicketsView";

export default async function BriefTicketsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const brief = await db.brief.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      status: true,
      requiredTeams: true,
      creatorId: true,
      epicId: true,
    },
  });
  if (!brief) notFound();

  const isAdmin =
    session?.user.role === UserRole.ADMIN ||
    isTeamLead(session?.user.role as UserRole);

  if (!isAdmin && brief.creatorId !== session?.user.id) notFound();

  const tickets = await db.ticket.findMany({
    where: { briefId: id },
    include: { assignee: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const jobs = await db.ticketGenerationJob.findMany({
    where: { briefId: id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const canGenerate =
    session?.user.id === brief.creatorId || isAdmin;

  return (
    <GenerateTicketsView
      brief={brief}
      tickets={tickets}
      jobs={jobs}
      canGenerate={canGenerate}
    />
  );
}
