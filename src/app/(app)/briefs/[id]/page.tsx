// SPEC: ai-brief.md
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { BriefDetail } from "@/components/briefs/BriefDetail";
import { UserRole } from "@prisma/client";

export default async function BriefDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const brief = await db.brief.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true } },
      epic: { select: { id: true, name: true } },
      attachments: {
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          sizeBytes: true,
          createdAt: true,
        },
      },
      tickets: {
        select: { id: true, title: true, team: true, status: true, size: true },
      },
    },
  });

  if (!brief) notFound();

  const isAdmin =
    session?.user.role === UserRole.ADMIN ||
    session?.user.role === UserRole.TEAM_LEAD;

  if (!isAdmin && brief.creatorId !== session?.user.id) notFound();

  const canEdit =
    session?.user.id === brief.creatorId || isAdmin;

  return <BriefDetail brief={brief} canEdit={canEdit} userRole={session?.user.role} />;
}
