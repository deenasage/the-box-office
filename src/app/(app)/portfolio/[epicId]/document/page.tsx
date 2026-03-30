// SPEC: project-document.md
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { ProjectDocumentClient } from '@/components/project-document/ProjectDocumentClient'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function ProjectDocumentPage({
  params,
}: {
  params: Promise<{ epicId: string }>
}) {
  const { epicId } = await params
  await auth() // ensures session; redirects to login if not authenticated

  const epic = await db.epic.findUnique({
    where: { id: epicId },
    select: { id: true, name: true },
  })
  if (!epic) notFound()

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href={`/portfolio/${epicId}`}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {epic.name}
        </Link>
      </div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Project Document</h1>
        <p className="text-sm text-muted-foreground">{epic.name}</p>
      </div>
      <ProjectDocumentClient epicId={epicId} />
    </div>
  )
}
