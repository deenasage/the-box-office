// SPEC: gtm-brief-generator.md
// Section and field order matches the Encodian GTM Brief template exactly.

import type { GtmFieldDef } from "@/components/briefs/GtmBriefSection";

export interface GtmSectionDef {
  title: string;
  fields: GtmFieldDef[];
}

export const GTM_SECTIONS: GtmSectionDef[] = [
  {
    title: "Discovery",
    fields: [
      { label: "Description of Request", key: "Description" },
    ],
  },
  {
    title: "Who",
    fields: [
      { label: "Who are we targeting, and what are their primary needs or pain points?", key: "WhoAreWeTargeting" },
      { label: "What competitors or other solutions might this audience be considering?", key: "Competitors" },
      { label: "Who is the PMM and RTR contact for this initiative?", key: "Contacts" },
    ],
  },
  {
    title: "What",
    fields: [
      { label: "Which product is this for?", key: "WhichProduct" },
      { label: "What are the expected strategic or commercial outcomes?", key: "ExpectedOutcomes" },
      { label: "Link to the Go-To-Market (GTM) deck", key: "GTMDeck" },
      { label: "Has the commercial model been finalised and approved? If not, when will it be?", key: "FinalizedModel" },
      { label: "What do we need to say to users? What are the core themes or stories we want to communicate?", key: "CoreThemes" },
      { label: "What actions do we want users to take (e.g. purchase, sign up, engage)?", key: "UserActions" },
      { label: "Relevant messaging: value propositions, USPs, key features, existing content, SEO requirements, next steps for users, etc.", key: "Messaging" },
    ],
  },
  {
    title: "Why",
    fields: [
      { label: "Why are these changes being made?", key: "WhyChangesMade" },
      { label: "Is there anything you're concerned about or need validated? (written as problem statements)", key: "ProblemStatement" },
    ],
  },
  {
    title: "Where",
    fields: [
      { label: "Which market(s) will this go live in?", key: "Markets" },
    ],
  },
  {
    title: "When",
    fields: [
      { label: "When is the target date for the product to be ready and released?", key: "ProductReadyDate" },
      { label: "What date does this request need to be live by?", key: "LiveDate" },
      { label: "What's the reason behind the above go-live date?", key: "LiveDateReason" },
    ],
  },
  {
    title: "How",
    fields: [
      { label: "Has budget already been discussed?", key: "Budget" },
    ],
  },
  {
    title: "Other",
    fields: [
      { label: "Are there any existing resources or assets we should use, or any other information we should know?", key: "OtherResources" },
    ],
  },
];
