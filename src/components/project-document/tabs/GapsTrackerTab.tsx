// SPEC: project-document.md
'use client'

import { useCallback, useEffect, useState } from 'react'
import { EditableTable, ColumnDef } from '../EditableTable'
import { SaveIndicator } from '../SaveIndicator'
import { useDocumentTab } from '@/hooks/useDocumentTab'
import { GapsTrackerRow } from '@/types/project-document'

const COLUMNS: ColumnDef<GapsTrackerRow>[] = [
  { key: 'page', label: 'Page', width: '160px' },
  { key: 'gapAmend', label: 'Gap / Amend', width: '200px' },
  { key: 'owner', label: 'Owner', width: '120px' },
  {
    key: 'gapStatus', label: 'Status', type: 'select', width: '130px',
    options: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'WONT_FIX'],
  },
  { key: 'resolution', label: 'Resolution', width: '200px' },
  { key: 'notes', label: 'Notes', width: '200px' },
]

function emptyRow(): GapsTrackerRow {
  return {
    id: crypto.randomUUID(),
    page: '',
    gapAmend: '',
    owner: '',
    gapStatus: 'OPEN',
    resolution: '',
    notes: '',
  }
}

interface Props { epicId: string; initial: GapsTrackerRow[] | null }

export function GapsTrackerTab({ epicId, initial }: Props) {
  const [rows, setRows] = useState<GapsTrackerRow[]>(initial ?? [])
  const { saveState, save, retry } = useDocumentTab<GapsTrackerRow[]>({
    epicId, tabKey: 'gapsTrackerData',
  })

  useEffect(() => { if (initial) setRows(initial) }, [initial])

  const update = useCallback((next: GapsTrackerRow[]) => {
    setRows(next)
    save(next)
  }, [save])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Gaps Tracker</span>
        <SaveIndicator state={saveState} onRetry={retry} />
      </div>
      <EditableTable<GapsTrackerRow>
        rows={rows}
        columns={COLUMNS}
        onChange={update}
        onAddRow={() => update([...rows, emptyRow()])}
        onDeleteRow={(id) => update(rows.filter((r) => r.id !== id))}
      />
    </div>
  )
}
