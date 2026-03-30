// SPEC: project-document.md
'use client'

import { useCallback, useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import { SaveIndicator } from '../SaveIndicator'
import { useDocumentTab } from '@/hooks/useDocumentTab'
import { ProjectOverviewData, ProjectLink } from '@/types/project-document'

interface OverviewTabProps {
  epicId: string
  initial: ProjectOverviewData | null
}

const EMPTY: ProjectOverviewData = {
  projectName: '',
  workfrontId: '',
  startDate: null,
  deliveryDate: null,
  projectSummary: '',
  agreedUponScope: '',
  expectedBenefits: '',
  links: [],
}

export function OverviewTab({ epicId, initial }: OverviewTabProps) {
  const [data, setData] = useState<ProjectOverviewData>(initial ?? EMPTY)
  const { saveState, save, retry } = useDocumentTab<ProjectOverviewData>({
    epicId,
    tabKey: 'overviewData',
  })

  useEffect(() => {
    if (initial) setData(initial)
  }, [initial])

  const update = useCallback(
    (patch: Partial<ProjectOverviewData>) => {
      const next = { ...data, ...patch }
      setData(next)
      save(next)
    },
    [data, save]
  )

  function addLink() {
    if (data.links.length >= 10) return
    update({ links: [...data.links, { label: '', url: '' }] })
  }

  function removeLink(idx: number) {
    update({ links: data.links.filter((_, i) => i !== idx) })
  }

  function updateLink(idx: number, patch: Partial<ProjectLink>) {
    const links = data.links.map((l, i) => (i === idx ? { ...l, ...patch } : l))
    update({ links })
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Project Overview</span>
        <SaveIndicator state={saveState} onRetry={retry} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="projectName">Project Name</Label>
          <Input
            id="projectName"
            value={data.projectName}
            onChange={(e) => update({ projectName: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="workfrontId">Sage.com Workfront</Label>
          <Input
            id="workfrontId"
            value={data.workfrontId}
            onChange={(e) => update({ workfrontId: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={data.startDate ?? ''}
            onChange={(e) => update({ startDate: e.target.value || null })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deliveryDate">Delivery Date</Label>
          <Input
            id="deliveryDate"
            type="date"
            value={data.deliveryDate ?? ''}
            onChange={(e) => update({ deliveryDate: e.target.value || null })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="projectSummary">Project Summary</Label>
        <Textarea
          id="projectSummary"
          rows={3}
          value={data.projectSummary}
          onChange={(e) => update({ projectSummary: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="agreedUponScope">Agreed Upon Scope</Label>
        <Textarea
          id="agreedUponScope"
          rows={3}
          value={data.agreedUponScope}
          onChange={(e) => update({ agreedUponScope: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="expectedBenefits">Expected Benefits</Label>
        <Textarea
          id="expectedBenefits"
          rows={3}
          value={data.expectedBenefits}
          onChange={(e) => update({ expectedBenefits: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Documents / Useful Links</Label>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={addLink}
            disabled={data.links.length >= 10}
            aria-label="Add link"
          >
            <Plus className="h-3.5 w-3.5" /> Add link
          </Button>
        </div>
        {data.links.length === 0 && (
          <p className="text-sm text-muted-foreground">No links yet.</p>
        )}
        {data.links.map((link, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              placeholder="Label"
              value={link.label}
              onChange={(e) => updateLink(idx, { label: e.target.value })}
              className="w-40"
              aria-label={`Link ${idx + 1} label`}
            />
            <Input
              placeholder="https://..."
              type="url"
              value={link.url}
              onChange={(e) => updateLink(idx, { url: e.target.value })}
              className="flex-1"
              aria-label={`Link ${idx + 1} URL`}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeLink(idx)}
              aria-label={`Remove link ${idx + 1}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
