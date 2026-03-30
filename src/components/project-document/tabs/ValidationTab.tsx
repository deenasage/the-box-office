// SPEC: project-document.md
'use client'

import type { ValidationSheet } from '@/types/project-document'

const REFERENCE: ValidationSheet = {
  raidTypes: ['RISK', 'ASSUMPTION', 'ISSUE', 'DEPENDENCY'],
  raidStatuses: ['OPEN', 'IN_PROGRESS', 'CLOSED', 'RESOLVED'],
  gapStatuses: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'WONT_FIX'],
  riskProbabilities: ['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'],
  riskImpacts: ['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'],
  riskStatuses: ['OPEN', 'MITIGATED', 'ACCEPTED', 'CLOSED'],
  issueStatuses: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  hypercarePriorities: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
  teams: ['CONTENT', 'DESIGN', 'SEO', 'WEM', 'PAID_MEDIA', 'ANALYTICS'],
}

function Section({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span
            key={v}
            className="inline-block rounded bg-muted px-2 py-0.5 text-xs font-mono text-foreground"
          >
            {v}
          </span>
        ))}
      </div>
    </div>
  )
}

export function ValidationTab() {
  return (
    <div className="space-y-5 max-w-2xl pt-1">
      <p className="text-sm text-muted-foreground">
        Reference values used across all tabs. These are read-only.
      </p>
      <Section title="RAID Types" values={REFERENCE.raidTypes} />
      <Section title="RAID Statuses" values={REFERENCE.raidStatuses} />
      <Section title="Gap Statuses" values={REFERENCE.gapStatuses} />
      <Section title="Risk Probabilities" values={REFERENCE.riskProbabilities} />
      <Section title="Risk Impacts" values={REFERENCE.riskImpacts} />
      <Section title="Risk Statuses" values={REFERENCE.riskStatuses} />
      <Section title="Issue Statuses" values={REFERENCE.issueStatuses} />
      <Section title="Hypercare Priorities" values={REFERENCE.hypercarePriorities} />
      <Section title="Teams" values={REFERENCE.teams} />
    </div>
  )
}
