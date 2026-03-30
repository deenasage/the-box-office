// SPEC: project-document.md
'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Plus } from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { SaveIndicator } from '../SaveIndicator'
import { useDocumentTab } from '@/hooks/useDocumentTab'
import { IssueLogRow, IssueStatus } from '@/types/project-document'

const STATUS_OPTIONS: IssueStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

function emptyRow(nextId: number): IssueLogRow {
  return {
    id: nextId,
    issueDescription: '',
    issueCategory: '',
    issueOwner: '',
    actionsTaken: '',
    status: 'OPEN',
  }
}

function reindex(rows: IssueLogRow[]): IssueLogRow[] {
  return rows.map((r, i) => ({ ...r, id: i + 1 }))
}

interface Props { epicId: string; initial: IssueLogRow[] | null }

export function IssueLogTab({ epicId, initial }: Props) {
  const [rows, setRows] = useState<IssueLogRow[]>(reindex(initial ?? []))
  const { saveState, save, retry } = useDocumentTab<IssueLogRow[]>({
    epicId, tabKey: 'issueLogData',
  })

  useEffect(() => { if (initial) setRows(reindex(initial)) }, [initial])

  const update = useCallback((next: IssueLogRow[]) => {
    const r = reindex(next)
    setRows(r)
    save(r)
  }, [save])

  function updateField<K extends keyof IssueLogRow>(
    id: number, key: K, value: IssueLogRow[K]
  ) {
    update(rows.map((r) => (r.id === id ? { ...r, [key]: value } : r)))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Issue Log</span>
        <SaveIndicator state={saveState} onRetry={retry} />
      </div>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50">
              {['#', 'Issue Description', 'Category', 'Owner', 'Actions Taken', 'Status', ''].map((h) => (
                <th key={h} className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap border-b border-border">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  No rows yet. Click &apos;Add row&apos; to begin.
                </td>
              </tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/30 group">
                <td className="px-2 py-1 text-xs text-muted-foreground w-8">{row.id}</td>
                <td className="px-2 py-1"><Input value={row.issueDescription} onChange={(e) => updateField(row.id, 'issueDescription', e.target.value)} className="h-7 text-xs min-w-[200px]" aria-label="Issue description" /></td>
                <td className="px-2 py-1"><Input value={row.issueCategory} onChange={(e) => updateField(row.id, 'issueCategory', e.target.value)} className="h-7 text-xs min-w-[120px]" aria-label="Category" /></td>
                <td className="px-2 py-1"><Input value={row.issueOwner} onChange={(e) => updateField(row.id, 'issueOwner', e.target.value)} className="h-7 text-xs min-w-[120px]" aria-label="Owner" /></td>
                <td className="px-2 py-1"><Input value={row.actionsTaken} onChange={(e) => updateField(row.id, 'actionsTaken', e.target.value)} className="h-7 text-xs min-w-[200px]" aria-label="Actions taken" /></td>
                <td className="px-2 py-1">
                  <Select value={row.status} onValueChange={(v) => updateField(row.id, 'status', v as IssueStatus)}>
                    <SelectTrigger size="sm" className="min-w-[110px]" aria-label="Status"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
                <td className="px-1 py-1">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" onClick={() => update(rows.filter((r) => r.id !== row.id))} aria-label="Delete row">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-2 border-t border-border bg-muted/20">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={() => update([...rows, emptyRow(rows.length + 1)])}>
            <Plus className="h-3.5 w-3.5" /> Add row
          </Button>
        </div>
      </div>
    </div>
  )
}
