// SPEC: project-document.md
'use client'

import { useCallback, useEffect, useState } from 'react'
import { EditableTable, ColumnDef } from '../EditableTable'
import { SaveIndicator } from '../SaveIndicator'
import { useDocumentTab } from '@/hooks/useDocumentTab'
import { DeliveryPlanRow } from '@/types/project-document'

const COLUMNS: ColumnDef<DeliveryPlanRow>[] = [
  { key: 'region', label: 'Region' },
  { key: 'pageExistsInMarket', label: 'Page Exists', type: 'checkbox' },
  { key: 'pageName', label: 'Page Name', width: '140px' },
  { key: 'currentUrl', label: 'Current URL', type: 'url' },
  { key: 'mappedUrl', label: 'Mapped URL', type: 'url' },
  { key: 'pageTemplate', label: 'Page Template' },
  { key: 'buildSpecGaps', label: 'Build Spec/Gaps', width: '160px' },
  { key: 'notes', label: 'Notes', width: '160px' },
  { key: 'localisationRequired', label: 'Localisation Req.', type: 'checkbox' },
  { key: 'localisationStatus', label: 'Localisation Status' },
  { key: 'seoStatus', label: 'SEO Status' },
  { key: 'seoRecommendationsLink', label: 'SEO Recs Link', type: 'url' },
  { key: 'contentStatus', label: 'Content Status' },
  { key: 'copywriterLink', label: 'Copywriter Link', type: 'url' },
  { key: 'xdStatus', label: 'XD Status' },
  { key: 'figmaLink', label: 'Figma Link', type: 'url' },
  { key: 'assets', label: 'Assets' },
  { key: 'metaTitle', label: 'Meta Title', width: '160px' },
  { key: 'metaDescription', label: 'Meta Description', width: '160px' },
  { key: 'blogTag', label: 'Blog Tag' },
  { key: 'taxonomyTag', label: 'Taxonomy Tag' },
  { key: 'stagingLink', label: 'Staging Link', type: 'url' },
  { key: 'proofHqLink', label: 'ProofHQ Link', type: 'url' },
  { key: 'wemQaAccessibilityCheck', label: 'WEM QA / A11y', type: 'checkbox' },
  { key: 'status', label: 'Status' },
  { key: 'live', label: 'Live', type: 'checkbox' },
  { key: 'goLiveDate', label: 'Go Live Date', type: 'date' },
  { key: 'goLiveWebChat', label: 'Go Live Web Chat' },
  { key: 'deliveryNotes', label: 'Delivery Notes', width: '160px' },
]

function emptyRow(): DeliveryPlanRow {
  return {
    id: crypto.randomUUID(),
    region: '', pageExistsInMarket: false, pageName: '', currentUrl: '', mappedUrl: '',
    pageTemplate: '', buildSpecGaps: '', notes: '', localisationRequired: false,
    localisationStatus: '', seoStatus: '', seoRecommendationsLink: '', contentStatus: '',
    copywriterLink: '', xdStatus: '', figmaLink: '', assets: '', metaTitle: '',
    metaDescription: '', blogTag: '', taxonomyTag: '', stagingLink: '', proofHqLink: '',
    wemQaAccessibilityCheck: false, status: '', live: false, goLiveDate: null,
    goLiveWebChat: '', deliveryNotes: '',
  }
}

interface Props { epicId: string; initial: DeliveryPlanRow[] | null }

export function DeliveryPlanTab({ epicId, initial }: Props) {
  const [rows, setRows] = useState<DeliveryPlanRow[]>(initial ?? [])
  const { saveState, save, retry } = useDocumentTab<DeliveryPlanRow[]>({
    epicId, tabKey: 'deliveryPlanData',
  })

  useEffect(() => { if (initial) setRows(initial) }, [initial])

  const update = useCallback((next: DeliveryPlanRow[]) => {
    setRows(next)
    save(next)
  }, [save])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Delivery Plan</span>
        <SaveIndicator state={saveState} onRetry={retry} />
      </div>
      <EditableTable<DeliveryPlanRow>
        rows={rows}
        columns={COLUMNS}
        onChange={update}
        onAddRow={() => update([...rows, emptyRow()])}
        onDeleteRow={(id) => update(rows.filter((r) => r.id !== id))}
      />
    </div>
  )
}
