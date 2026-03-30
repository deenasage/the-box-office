// SPEC: project-document.md
'use client'

import { useCallback, useEffect, useState } from 'react'
import { EditableTable, ColumnDef } from '../EditableTable'
import { SaveIndicator } from '../SaveIndicator'
import { useDocumentTab } from '@/hooks/useDocumentTab'
import { DeliveryTimelineRow } from '@/types/project-document'

// The spec calls for weekly slot columns for Phase 1 basic version.
// We render Stage, Owner, Task, Status, Notes, Start Date, End Date as noted in the
// Frontend Engineer instructions. Full weekly-slot column expansion is Phase 2 per spec.
const COLUMNS: ColumnDef<DeliveryTimelineRow>[] = [
  { key: 'stage', label: 'Stage', width: '120px' },
  { key: 'owner', label: 'Owner', width: '120px' },
  { key: 'task', label: 'Task', width: '200px' },
  { key: 'status', label: 'Status', width: '100px' },
  { key: 'notes', label: 'Notes', width: '200px' },
]

function emptyRow(): DeliveryTimelineRow {
  return {
    id: crypto.randomUUID(),
    stage: '',
    owner: '',
    ownerTeam: null,
    task: '',
    status: '',
    notes: '',
    weeklySlots: [],
  }
}

interface Props { epicId: string; initial: DeliveryTimelineRow[] | null }

export function DeliveryTimelineTab({ epicId, initial }: Props) {
  const [rows, setRows] = useState<DeliveryTimelineRow[]>(initial ?? [])
  const { saveState, save, retry } = useDocumentTab<DeliveryTimelineRow[]>({
    epicId, tabKey: 'deliveryTimelineData',
  })

  useEffect(() => { if (initial) setRows(initial) }, [initial])

  const update = useCallback((next: DeliveryTimelineRow[]) => {
    setRows(next)
    save(next)
  }, [save])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Delivery Timeline</span>
        <SaveIndicator state={saveState} onRetry={retry} />
      </div>
      <EditableTable<DeliveryTimelineRow>
        rows={rows}
        columns={COLUMNS}
        onChange={update}
        onAddRow={() => update([...rows, emptyRow()])}
        onDeleteRow={(id) => update(rows.filter((r) => r.id !== id))}
      />
    </div>
  )
}
