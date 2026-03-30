// SPEC: project-document.md
'use client'

import { useCallback, useEffect, useState } from 'react'
import { EditableTable, ColumnDef } from '../EditableTable'
import { SaveIndicator } from '../SaveIndicator'
import { useDocumentTab } from '@/hooks/useDocumentTab'
import { GoLiveCommsRow } from '@/types/project-document'

const COLUMNS: ColumnDef<GoLiveCommsRow>[] = [
  { key: 'emailGroupName', label: 'Email Group Name', width: '220px' },
  { key: 'distributionList', label: 'Distribution List', width: '260px' },
  { key: 'notes', label: 'Notes', width: '260px' },
]

function emptyRow(): GoLiveCommsRow {
  return {
    id: crypto.randomUUID(),
    emailGroupName: '',
    distributionList: '',
    notes: '',
  }
}

interface Props { epicId: string; initial: GoLiveCommsRow[] | null }

export function GoLiveCommsTab({ epicId, initial }: Props) {
  const [rows, setRows] = useState<GoLiveCommsRow[]>(initial ?? [])
  const { saveState, save, retry } = useDocumentTab<GoLiveCommsRow[]>({
    epicId, tabKey: 'goLiveCommsData',
  })

  useEffect(() => { if (initial) setRows(initial) }, [initial])

  const update = useCallback((next: GoLiveCommsRow[]) => {
    setRows(next)
    save(next)
  }, [save])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Go Live Comms</span>
        <SaveIndicator state={saveState} onRetry={retry} />
      </div>
      <EditableTable<GoLiveCommsRow>
        rows={rows}
        columns={COLUMNS}
        onChange={update}
        onAddRow={() => update([...rows, emptyRow()])}
        onDeleteRow={(id) => update(rows.filter((r) => r.id !== id))}
      />
    </div>
  )
}
