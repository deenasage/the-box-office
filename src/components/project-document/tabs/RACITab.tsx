// SPEC: project-document.md
'use client'

import { useCallback, useEffect, useState } from 'react'
import { EditableTable, ColumnDef } from '../EditableTable'
import { SaveIndicator } from '../SaveIndicator'
import { useDocumentTab } from '@/hooks/useDocumentTab'
import { RACIRow } from '@/types/project-document'

const COLUMNS: ColumnDef<RACIRow>[] = [
  { key: 'workstream', label: 'Workstream', width: '180px' },
  { key: 'responsible', label: 'Responsible', width: '160px' },
  { key: 'accountable', label: 'Accountable', width: '160px' },
  { key: 'consulted', label: 'Consulted', width: '160px' },
  { key: 'informed', label: 'Informed', width: '160px' },
]

function emptyRow(): RACIRow {
  return {
    id: crypto.randomUUID(),
    workstream: '',
    responsible: '',
    accountable: '',
    consulted: '',
    informed: '',
  }
}

interface Props { epicId: string; initial: RACIRow[] | null }

export function RACITab({ epicId, initial }: Props) {
  const [rows, setRows] = useState<RACIRow[]>(initial ?? [])
  const { saveState, save, retry } = useDocumentTab<RACIRow[]>({
    epicId, tabKey: 'raciData',
  })

  useEffect(() => { if (initial) setRows(initial) }, [initial])

  const update = useCallback((next: RACIRow[]) => {
    setRows(next)
    save(next)
  }, [save])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">RACI Matrix</span>
        <SaveIndicator state={saveState} onRetry={retry} />
      </div>
      <EditableTable<RACIRow>
        rows={rows}
        columns={COLUMNS}
        onChange={update}
        onAddRow={() => update([...rows, emptyRow()])}
        onDeleteRow={(id) => update(rows.filter((r) => r.id !== id))}
      />
    </div>
  )
}
