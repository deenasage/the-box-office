// SPEC: project-document.md
'use client'

import { useCallback, useEffect, useState } from 'react'
import { EditableTable, ColumnDef } from '../EditableTable'
import { SaveIndicator } from '../SaveIndicator'
import { useDocumentTab } from '@/hooks/useDocumentTab'
import { RAIDRow } from '@/types/project-document'

// Row IDs for RAID are numbers (auto-index), but EditableTable requires string | number.
// We use number ids and re-compute them on each render.

const COLUMNS: ColumnDef<RAIDRow>[] = [
  { key: 'id', label: '#', type: 'readonly', width: '36px' },
  {
    key: 'type', label: 'Type', type: 'select', width: '120px',
    options: ['RISK', 'ASSUMPTION', 'ISSUE', 'DEPENDENCY'],
  },
  { key: 'description', label: 'Description', width: '220px' },
  { key: 'notes', label: 'Notes', width: '160px' },
  { key: 'nextSteps', label: 'Next Steps', width: '160px' },
  { key: 'owner', label: 'Owner', width: '120px' },
  { key: 'updateDue', label: 'Update Due', type: 'date', width: '130px' },
  { key: 'dateLastUpdated', label: 'Last Updated', type: 'date', width: '130px' },
  {
    key: 'status', label: 'Status', type: 'select', width: '120px',
    options: ['OPEN', 'IN_PROGRESS', 'CLOSED', 'RESOLVED'],
  },
]

function reindex(rows: RAIDRow[]): RAIDRow[] {
  return rows.map((r, i) => ({ ...r, id: i + 1 }))
}

function emptyRow(nextId: number): RAIDRow {
  return {
    id: nextId,
    type: 'RISK',
    description: '',
    notes: '',
    nextSteps: '',
    owner: '',
    updateDue: null,
    dateLastUpdated: null,
    status: 'OPEN',
  }
}

interface Props { epicId: string; initial: RAIDRow[] | null }

export function RAIDTab({ epicId, initial }: Props) {
  const [rows, setRows] = useState<RAIDRow[]>(reindex(initial ?? []))
  const { saveState, save, retry } = useDocumentTab<RAIDRow[]>({
    epicId, tabKey: 'raidData',
  })

  useEffect(() => { if (initial) setRows(reindex(initial)) }, [initial])

  const update = useCallback((next: RAIDRow[]) => {
    const reindexed = reindex(next)
    setRows(reindexed)
    save(reindexed)
  }, [save])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">RAID Log</span>
        <SaveIndicator state={saveState} onRetry={retry} />
      </div>
      <EditableTable<RAIDRow>
        rows={rows}
        columns={COLUMNS}
        onChange={update}
        onAddRow={() => update([...rows, emptyRow(rows.length + 1)])}
        onDeleteRow={(id) => update(rows.filter((r) => r.id !== id))}
      />
    </div>
  )
}
