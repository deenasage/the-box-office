// SPEC: project-document.md
'use client'

import { useCallback, useEffect, useState } from 'react'
import { EditableTable, ColumnDef } from '../EditableTable'
import { SaveIndicator } from '../SaveIndicator'
import { useDocumentTab } from '@/hooks/useDocumentTab'
import { HypercareRow } from '@/types/project-document'

const COLUMNS: ColumnDef<HypercareRow>[] = [
  { key: 'pageLink', label: 'Page Link', type: 'url', width: '160px' },
  { key: 'gapAmend', label: 'Gap / Amend', width: '200px' },
  { key: 'raisedBy', label: 'Raised By', width: '120px' },
  { key: 'comOrCart', label: '.com or Cart', width: '110px' },
  { key: 'notes', label: 'Notes', width: '200px' },
  {
    key: 'priority', label: 'Priority', type: 'select', width: '110px',
    options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
  },
  { key: 'reqId', label: 'Req ID', width: '100px' },
  { key: 'complete', label: 'Complete', type: 'checkbox', width: '80px' },
]

function emptyRow(): HypercareRow {
  return {
    id: crypto.randomUUID(),
    pageLink: '',
    gapAmend: '',
    raisedBy: '',
    comOrCart: '',
    notes: '',
    priority: 'LOW',
    reqId: '',
    complete: false,
  }
}

interface Props { epicId: string; initial: HypercareRow[] | null }

export function HypercareTab({ epicId, initial }: Props) {
  const [rows, setRows] = useState<HypercareRow[]>(initial ?? [])
  const { saveState, save, retry } = useDocumentTab<HypercareRow[]>({
    epicId, tabKey: 'hypercareData',
  })

  useEffect(() => { if (initial) setRows(initial) }, [initial])

  const update = useCallback((next: HypercareRow[]) => {
    setRows(next)
    save(next)
  }, [save])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Hypercare</span>
        <SaveIndicator state={saveState} onRetry={retry} />
      </div>
      <EditableTable<HypercareRow>
        rows={rows}
        columns={COLUMNS}
        onChange={update}
        onAddRow={() => update([...rows, emptyRow()])}
        onDeleteRow={(id) => update(rows.filter((r) => r.id !== id))}
      />
    </div>
  )
}
