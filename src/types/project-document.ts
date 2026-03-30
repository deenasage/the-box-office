// SPEC: project-document.md
// TypeScript interfaces for every tab in the ProjectDocument model.
// These mirror the JSON stored in each nullable String column on ProjectDocument.
// Updated by Frontend Engineer to match spec field names and add missing types.

export type TeamValue = 'CONTENT' | 'DESIGN' | 'SEO' | 'WEM' | 'PAID_MEDIA' | 'ANALYTICS'

// --- Tab 1 ---
export interface ProjectLink {
  label: string
  url: string
}

export interface ProjectOverviewData {
  projectName: string
  workfrontId: string
  startDate: string | null
  deliveryDate: string | null
  projectSummary: string
  agreedUponScope: string
  expectedBenefits: string
  links: ProjectLink[]
}

// --- Tab 2 ---
export interface DeliveryPlanRow {
  id: string
  region: string
  pageExistsInMarket: boolean
  pageName: string
  currentUrl: string
  mappedUrl: string
  pageTemplate: string
  buildSpecGaps: string
  notes: string
  localisationRequired: boolean
  localisationStatus: string
  seoStatus: string
  seoRecommendationsLink: string
  contentStatus: string
  copywriterLink: string
  xdStatus: string
  figmaLink: string
  assets: string
  metaTitle: string
  metaDescription: string
  blogTag: string
  taxonomyTag: string
  stagingLink: string
  proofHqLink: string
  wemQaAccessibilityCheck: boolean
  status: string
  live: boolean
  goLiveDate: string | null
  goLiveWebChat: string
  deliveryNotes: string
}

// --- Tab 3 ---
export interface WeeklySlot {
  weekStart: string
  monday: boolean
  tuesday: boolean
  wednesday: boolean
  thursday: boolean
  friday: boolean
}

export interface DeliveryTimelineRow {
  id: string
  stage: string
  owner: string
  ownerTeam: TeamValue | null
  task: string
  status: string
  notes: string
  weeklySlots: WeeklySlot[]
}

// --- Tab 4 ---
export interface RACIRow {
  id: string
  workstream: string
  responsible: string
  accountable: string
  consulted: string
  informed: string
}

// --- Tab 5 ---
export type RAIDType = 'RISK' | 'ASSUMPTION' | 'ISSUE' | 'DEPENDENCY'
export type RAIDStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'RESOLVED'

export interface RAIDRow {
  id: number
  type: RAIDType
  description: string
  notes: string
  nextSteps: string
  owner: string
  updateDue: string | null
  dateLastUpdated: string | null
  status: RAIDStatus
}

// --- Tab 6 ---
export type GapStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'WONT_FIX'

export interface GapsTrackerRow {
  id: string
  page: string
  gapAmend: string
  owner: string
  gapStatus: GapStatus
  resolution: string
  notes: string
}

// --- Tab 7 ---
export type HypercarePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface HypercareRow {
  id: string
  pageLink: string
  gapAmend: string
  raisedBy: string
  comOrCart: string
  notes: string
  priority: HypercarePriority
  reqId: string
  complete: boolean
}

// --- Tab 8 ---
export type RiskProbability = 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'
export type RiskImpact = 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'
export type RiskStatus = 'OPEN' | 'MITIGATED' | 'ACCEPTED' | 'CLOSED'

export interface RiskRegisterRow {
  id: number
  riskDescription: string
  riskCategory: string
  probability: RiskProbability
  impact: RiskImpact
  riskOwner: string
  mitigationPlan: string
  contingencyPlan: string
  status: RiskStatus
}

// --- Tab 9 ---
export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'

export interface IssueLogRow {
  id: number
  issueDescription: string
  issueCategory: string
  issueOwner: string
  actionsTaken: string
  status: IssueStatus
}

// --- Tab 10 (Validation — derived, not stored) ---
export interface ValidationSheet {
  raidTypes: RAIDType[]
  raidStatuses: RAIDStatus[]
  gapStatuses: GapStatus[]
  riskProbabilities: RiskProbability[]
  riskImpacts: RiskImpact[]
  riskStatuses: RiskStatus[]
  issueStatuses: IssueStatus[]
  hypercarePriorities: HypercarePriority[]
  teams: TeamValue[]
}

// --- Tab 11 ---
export interface GoLiveCommsRow {
  id: string
  emailGroupName: string
  distributionList: string
  notes: string
}

// --- API shapes ---
export interface ProjectDocumentUpdatePayload {
  overviewData?: ProjectOverviewData
  deliveryPlanData?: DeliveryPlanRow[]
  deliveryTimelineData?: DeliveryTimelineRow[]
  raciData?: RACIRow[]
  raidData?: RAIDRow[]
  gapsTrackerData?: GapsTrackerRow[]
  hypercareData?: HypercareRow[]
  riskRegisterData?: RiskRegisterRow[]
  issueLogData?: IssueLogRow[]
  goLiveCommsData?: GoLiveCommsRow[]
}

export interface ProjectDocumentResponse {
  id: string
  epicId: string
  overviewData: ProjectOverviewData | null
  deliveryPlanData: DeliveryPlanRow[] | null
  deliveryTimelineData: DeliveryTimelineRow[] | null
  raciData: RACIRow[] | null
  raidData: RAIDRow[] | null
  gapsTrackerData: GapsTrackerRow[] | null
  hypercareData: HypercareRow[] | null
  riskRegisterData: RiskRegisterRow[] | null
  issueLogData: IssueLogRow[] | null
  goLiveCommsData: GoLiveCommsRow[] | null
  validation: ValidationSheet
  aiGeneratedAt: string | null
  createdAt: string
  updatedAt: string
}

// Legacy shape — kept for backwards compat with any code using ProjectDocumentData
/** @deprecated Use ProjectDocumentResponse instead */
export interface ProjectDocumentData {
  id: string
  epicId: string
  overview: ProjectOverviewData | null
  deliveryPlan: DeliveryPlanRow[]
  deliveryTimeline: DeliveryTimelineRow[]
  raci: RACIRow[]
  raid: RAIDRow[]
  gapsTracker: GapsTrackerRow[]
  hypercare: HypercareRow[]
  riskRegister: RiskRegisterRow[]
  issueLog: IssueLogRow[]
  goLiveComms: GoLiveCommsRow[]
  aiPrefilled: boolean
  aiPrefilledAt: string | null
  updatedAt: string
}
