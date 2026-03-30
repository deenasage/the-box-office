// SPEC: project-document.md
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Download, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { OverviewTab } from './tabs/OverviewTab'
import { DeliveryPlanTab } from './tabs/DeliveryPlanTab'
import { DeliveryTimelineTab } from './tabs/DeliveryTimelineTab'
import { RACITab } from './tabs/RACITab'
import { RAIDTab } from './tabs/RAIDTab'
import { GapsTrackerTab } from './tabs/GapsTrackerTab'
import { HypercareTab } from './tabs/HypercareTab'
import { RiskRegisterTab } from './tabs/RiskRegisterTab'
import { IssueLogTab } from './tabs/IssueLogTab'
import { GoLiveCommsTab } from './tabs/GoLiveCommsTab'
import { ValidationTab } from './tabs/ValidationTab'
import type { ProjectDocumentData } from '@/types/project-document'

interface Props { epicId: string }

export function ProjectDocumentClient({ epicId }: Props) {
  const [doc, setDoc] = useState<ProjectDocumentData | null>(null)
  const [prefilling, setPrefilling] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/portfolio/${epicId}/document`)
    if (res.ok) {
      const json = await res.json() as { data: ProjectDocumentData }
      setDoc(json.data)
    }
  }, [epicId])

  useEffect(() => { void load() }, [load])

  async function prefill() {
    setPrefilling(true)
    const res = await fetch(`/api/portfolio/${epicId}/document/prefill`, { method: 'POST' })
    setPrefilling(false)
    if (res.ok) {
      await load()
      toast.success('Pre-filled from epic data')
    } else {
      toast.error('Pre-fill failed')
    }
  }

  function download() {
    window.location.href = `/api/portfolio/${epicId}/document/download`
  }

  if (!doc) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Loading document…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={prefill} disabled={prefilling}>
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          {prefilling ? 'Pre-filling…' : 'AI Pre-fill'}
        </Button>
        <Button variant="outline" size="sm" onClick={download}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Download .xlsx
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="delivery-plan">Delivery Plan</TabsTrigger>
          <TabsTrigger value="delivery-timeline">Delivery Timeline</TabsTrigger>
          <TabsTrigger value="raci">RACI</TabsTrigger>
          <TabsTrigger value="raid">RAID</TabsTrigger>
          <TabsTrigger value="gaps">Gaps Tracker</TabsTrigger>
          <TabsTrigger value="hypercare">Hypercare</TabsTrigger>
          <TabsTrigger value="risk">Risk Register</TabsTrigger>
          <TabsTrigger value="issues">Issue Log</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
          <TabsTrigger value="go-live">Go Live Comms</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab epicId={epicId} initial={doc.overview} />
        </TabsContent>
        <TabsContent value="delivery-plan">
          <DeliveryPlanTab epicId={epicId} initial={doc.deliveryPlan} />
        </TabsContent>
        <TabsContent value="delivery-timeline">
          <DeliveryTimelineTab epicId={epicId} initial={doc.deliveryTimeline} />
        </TabsContent>
        <TabsContent value="raci">
          <RACITab epicId={epicId} initial={doc.raci} />
        </TabsContent>
        <TabsContent value="raid">
          <RAIDTab epicId={epicId} initial={doc.raid} />
        </TabsContent>
        <TabsContent value="gaps">
          <GapsTrackerTab epicId={epicId} initial={doc.gapsTracker} />
        </TabsContent>
        <TabsContent value="hypercare">
          <HypercareTab epicId={epicId} initial={doc.hypercare} />
        </TabsContent>
        <TabsContent value="risk">
          <RiskRegisterTab epicId={epicId} initial={doc.riskRegister} />
        </TabsContent>
        <TabsContent value="issues">
          <IssueLogTab epicId={epicId} initial={doc.issueLog} />
        </TabsContent>
        <TabsContent value="validation">
          <ValidationTab />
        </TabsContent>
        <TabsContent value="go-live">
          <GoLiveCommsTab epicId={epicId} initial={doc.goLiveComms} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
