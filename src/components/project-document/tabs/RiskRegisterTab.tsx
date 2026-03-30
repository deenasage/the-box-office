// SPEC: project-document.md
'use client'

import { useCallback, useEffect, useState } from 'react'
import { ColumnDef } from '../EditableTable'
import { SaveIndicator } from '../SaveIndicator'
import { useDocumentTab } from '@/hooks/useDocumentTab'
import { RiskRegisterRow, RiskProbability, RiskImpact } from '@/types/project-document'
import { Button } from '@/components/ui/button'
import { Trash2, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// Ordinal mapping for risk score computation
const ORDINAL: Record<RiskProbability | RiskImpact, number> = {
  VERY_LOW: 1, LOW: 2, MEDIUM: 3, HIGH: 4, VERY_HIGH: 5,
}

const PROB_OPTIONS: RiskProbability[] = ['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']
const IMPACT_OPTIONS: RiskImpact[] = ['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']
const STATUS_OPTIONS = ['OPEN', 'MITIGATED', 'ACCEPTED', 'CLOSED']

// We use a custom render here because the RiskScore column is computed and we need
// to keep it out of ColumnDef (EditableTable would try to render it as a field).
// This component renders its own table rather than delegating to EditableTable.

function emptyRow(nextId: number): RiskRegisterRow {
  return {
    id: nextId,
    riskDescription: '',
    riskCategory: '',
    probability: 'MEDIUM',
    impact: 'MEDIUM',
    riskOwner: '',
    mitigationPlan: '',
    contingencyPlan: '',
    status: 'OPEN',
  }
}

function reindex(rows: RiskRegisterRow[]): RiskRegisterRow[] {
  return rows.map((r, i) => ({ ...r, id: i + 1 }))
}

interface Props { epicId: string; initial: RiskRegisterRow[] | null }

export function RiskRegisterTab({ epicId, initial }: Props) {
  const [rows, setRows] = useState<RiskRegisterRow[]>(reindex(initial ?? []))
  const { saveState, save, retry } = useDocumentTab<RiskRegisterRow[]>({
    epicId, tabKey: 'riskRegisterData',
  })

  useEffect(() => { if (initial) setRows(reindex(initial)) }, [initial])

  const update = useCallback((next: RiskRegisterRow[]) => {
    const r = reindex(next)
    setRows(r)
    save(r)
  }, [save])

  function updateField<K extends keyof RiskRegisterRow>(
    id: number, key: K, value: RiskRegisterRow[K]
  ) {
    update(rows.map((r) => (r.id === id ? { ...r, [key]: value } : r)))
  }

  const headers = ['#', 'Risk Description', 'Category', 'Probability', 'Impact',
    'Risk Score', 'Owner', 'Mitigation Plan', 'Contingency Plan', 'Status', '']

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Risk Register</span>
        <SaveIndicator state={saveState} onRetry={retry} />
      </div>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50">
              {headers.map((h) => (
                <th key={h} className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap border-b border-border">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="py-8 text-center text-sm text-muted-foreground">
                  No rows yet. Click &apos;Add row&apos; to begin.
                </td>
              </tr>
            ) : rows.map((row) => {
              const score = ORDINAL[row.probability] * ORDINAL[row.impact]
              return (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/30 group">
                  <td className="px-2 py-1 text-xs text-muted-foreground w-8">{row.id}</td>
                  <td className="px-2 py-1"><Input value={row.riskDescription} onChange={(e) => updateField(row.id, 'riskDescription', e.target.value)} className="h-7 text-xs min-w-[160px]" aria-label="Risk description" /></td>
                  <td className="px-2 py-1"><Input value={row.riskCategory} onChange={(e) => updateField(row.id, 'riskCategory', e.target.value)} className="h-7 text-xs min-w-[100px]" aria-label="Risk category" /></td>
                  <td className="px-2 py-1">
                    <Select value={row.probability} onValueChange={(v) => updateField(row.id, 'probability', v as RiskProbability)}>
                      <SelectTrigger size="sm" className="min-w-[110px]" aria-label="Probability"><SelectValue /></SelectTrigger>
                      <SelectContent>{PROB_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="px-2 py-1">
                    <Select value={row.impact} onValueChange={(v) => updateField(row.id, 'impact', v as RiskImpact)}>
                      <SelectTrigger size="sm" className="min-w-[110px]" aria-label="Impact"><SelectValue /></SelectTrigger>
                      <SelectContent>{IMPACT_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="px-2 py-1 text-center">
                    <span className={`inline-flex items-center justify-center w-8 h-7 rounded text-xs font-semibold ${score >= 16 ? 'bg-red-100 text-red-700' : score >= 9 ? 'bg-orange-100 text-orange-700' : score >= 4 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`} aria-label={`Risk score: ${score}`}>
                      {score}
                    </span>
                  </td>
                  <td className="px-2 py-1"><Input value={row.riskOwner} onChange={(e) => updateField(row.id, 'riskOwner', e.target.value)} className="h-7 text-xs min-w-[100px]" aria-label="Risk owner" /></td>
                  <td className="px-2 py-1"><Input value={row.mitigationPlan} onChange={(e) => updateField(row.id, 'mitigationPlan', e.target.value)} className="h-7 text-xs min-w-[160px]" aria-label="Mitigation plan" /></td>
                  <td className="px-2 py-1"><Input value={row.contingencyPlan} onChange={(e) => updateField(row.id, 'contingencyPlan', e.target.value)} className="h-7 text-xs min-w-[160px]" aria-label="Contingency plan" /></td>
                  <td className="px-2 py-1">
                    <Select value={row.status} onValueChange={(v) => updateField(row.id, 'status', v as RiskRegisterRow['status'])}>
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
              )
            })}
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

// Dummy export to satisfy ColumnDef import if unused linting
export type { ColumnDef }
