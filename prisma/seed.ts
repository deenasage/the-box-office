// SPEC: prisma/seed.ts -- Comprehensive seed for Ticket Intake
// Idempotent: deletes all data in FK-safe order, then recreates.

import "dotenv/config";
import { PrismaClient, TicketStatus } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

/// Resolve DB path from DATABASE_URL (strips "file:" prefix, resolves relative to CWD)
const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const dbPath = path.resolve(dbUrl.replace(/^file:/, ""));
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

/// Returns a new Date offset by the given number of days from the base date.
function daysAfter(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function main() {
  console.log("Seeding database...");

  // Delete all data in FK-safe order
  await prisma.sprintCarryoverSuggestion.deleteMany();
  await prisma.ticketStatusHistory.deleteMany();
  await prisma.ticketAuditLog.deleteMany();
  await prisma.ticketAttachment.deleteMany();
  await prisma.ticketDependency.deleteMany();
  await prisma.timeLog.deleteMany();
  await prisma.aIEstimate.deleteMany();
  await prisma.teamCapacity.deleteMany();
  await prisma.userSkillset.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.copilotMessage.deleteMany();
  await prisma.copilotSession.deleteMany();
  await prisma.comment.deleteMany();
  // TicketLabel must be cleared before Ticket and Label
  await prisma.ticketLabel.deleteMany();
  await prisma.briefComment.deleteMany();
  await prisma.briefAttachment.deleteMany();
  await prisma.briefShareToken.deleteMany();
  await prisma.ticketGenerationJob.deleteMany();
  await prisma.brief.deleteMany();
  await prisma.ganttItem.deleteMany();
  await prisma.roadmapItem.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.projectDocument.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.label.deleteMany();
  await prisma.skillset.deleteMany();
  await prisma.sprintSuggestion.deleteMany();
  await prisma.sprint.deleteMany();
  await prisma.epic.deleteMany();
  await prisma.formField.deleteMany();
  await prisma.formTemplate.deleteMany();
  await prisma.routingRule.deleteMany();
  await prisma.deletionLog.deleteMany();
  await prisma.listValue.deleteMany();
  await prisma.kanbanColumnConfig.deleteMany();
  await prisma.user.deleteMany();
  console.log("Cleared existing data.");

  // ---- Users ----------------------------------------------------------------
  const adminPassword = await hashPassword("admin123");
  const leadPassword = await hashPassword("lead123");
  const memberPassword = await hashPassword("member123");

  const admin = await prisma.user.create({
    data: {
      email: "admin@ticketintake.com",
      name: "Admin User",
      password: adminPassword,
      role: "ADMIN",
      team: null,
    },
  });

  const contentLead = await prisma.user.create({
    data: {
      email: "lead.content@ticketintake.com",
      name: "Casey Content",
      password: leadPassword,
      role: "TEAM_LEAD_CRAFT",
      team: "CONTENT",
    },
  });

  const designLead = await prisma.user.create({
    data: {
      email: "lead.design@ticketintake.com",
      name: "Dana Design",
      password: leadPassword,
      role: "TEAM_LEAD_CRAFT",
      team: "DESIGN",
    },
  });

  const seoLead = await prisma.user.create({
    data: {
      email: "lead.seo@ticketintake.com",
      name: "Sam SEO",
      password: leadPassword,
      role: "TEAM_LEAD_CRAFT",
      team: "SEO",
    },
  });

  const wemLead = await prisma.user.create({
    data: {
      email: "lead.wem@ticketintake.com",
      name: "Wren WEM",
      password: leadPassword,
      role: "TEAM_LEAD_CRAFT",
      team: "WEM",
    },
  });

  // 4 DESIGN members
  const designer1 = await prisma.user.create({
    data: {
      email: "alex.morgan@ticketintake.com",
      name: "Alex Morgan",
      password: memberPassword,
      role: "MEMBER_CRAFT",
      team: "DESIGN",
    },
  });

  const designer2 = await prisma.user.create({
    data: {
      email: "jamie.park@ticketintake.com",
      name: "Jamie Park",
      password: memberPassword,
      role: "MEMBER_CRAFT",
      team: "DESIGN",
    },
  });

  const designer3 = await prisma.user.create({
    data: {
      email: "taylor.brooks@ticketintake.com",
      name: "Taylor Brooks",
      password: memberPassword,
      role: "MEMBER_CRAFT",
      team: "DESIGN",
    },
  });

  const designer4 = await prisma.user.create({
    data: {
      email: "riley.chen@ticketintake.com",
      name: "Riley Chen",
      password: memberPassword,
      role: "MEMBER_CRAFT",
      team: "DESIGN",
    },
  });

  // 3 CONTENT members
  const content1 = await prisma.user.create({
    data: {
      email: "jordan.hayes@ticketintake.com",
      name: "Jordan Hayes",
      password: memberPassword,
      role: "MEMBER_CRAFT",
      team: "CONTENT",
    },
  });

  const content2 = await prisma.user.create({
    data: {
      email: "morgan.lee@ticketintake.com",
      name: "Morgan Lee",
      password: memberPassword,
      role: "MEMBER_CRAFT",
      team: "CONTENT",
    },
  });

  const content3 = await prisma.user.create({
    data: {
      email: "avery.silva@ticketintake.com",
      name: "Avery Silva",
      password: memberPassword,
      role: "MEMBER_CRAFT",
      team: "CONTENT",
    },
  });

  // Stakeholder users (requestors / business partners)
  const stakeholderPassword = await hashPassword("stakeholder123");

  const stakeholderLead = await prisma.user.create({
    data: {
      email: "lead.stakeholder@ticketintake.com",
      name: "Skylar Business",
      password: stakeholderPassword,
      role: "TEAM_LEAD_STAKEHOLDER",
      team: null,
    },
  });

  const stakeholder1 = await prisma.user.create({
    data: {
      email: "priya.marketing@ticketintake.com",
      name: "Priya Marketing",
      password: stakeholderPassword,
      role: "MEMBER_STAKEHOLDER",
      team: null,
    },
  });

  const stakeholder2 = await prisma.user.create({
    data: {
      email: "ethan.brand@ticketintake.com",
      name: "Ethan Brand",
      password: stakeholderPassword,
      role: "MEMBER_STAKEHOLDER",
      team: null,
    },
  });

  const stakeholder3 = await prisma.user.create({
    data: {
      email: "nadia.comms@ticketintake.com",
      name: "Nadia Comms",
      password: stakeholderPassword,
      role: "MEMBER_STAKEHOLDER",
      team: null,
    },
  });

  console.log("Created 16 users (1 admin, 4 craft leads, 7 craft members, 1 stakeholder lead, 3 stakeholder members).");

  // ---- Skillsets ------------------------------------------------------------
  /// DESIGN team skillsets
  const skillInteraction = await prisma.skillset.create({
    data: { name: "Interaction Design", team: "DESIGN", color: "#6366f1" },
  });
  const skillVisual = await prisma.skillset.create({
    data: { name: "Visual Design", team: "DESIGN", color: "#8b5cf6" },
  });
  const skillStoryboard = await prisma.skillset.create({
    data: { name: "Storyboarding", team: "DESIGN", color: "#a855f7" },
  });
  const skillDesignSystem = await prisma.skillset.create({
    data: { name: "Design System", team: "DESIGN", color: "#c026d3" },
  });
  // Keep legacy skillset names for backward compatibility
  await prisma.skillset.create({
    data: { name: "Visual Design — Page Builds", team: "DESIGN", color: "#7c3aed" },
  });
  await prisma.skillset.create({
    data: { name: "Visual Design — Product UI", team: "DESIGN", color: "#9333ea" },
  });

  /// CONTENT team skillsets — regional/audience based
  const skillNASmall = await prisma.skillset.create({
    data: { name: "NA - Small", team: "CONTENT", color: "#0ea5e9" },
  });
  const skillNAMedium = await prisma.skillset.create({
    data: { name: "NA - Medium", team: "CONTENT", color: "#0284c7" },
  });
  const skillUKIASmall = await prisma.skillset.create({
    data: { name: "UKIA - Small", team: "CONTENT", color: "#10b981" },
  });
  const skillUKIAMedium = await prisma.skillset.create({
    data: { name: "UKIA - Medium", team: "CONTENT", color: "#059669" },
  });
  const skillEuropeSmall = await prisma.skillset.create({
    data: { name: "Europe - Small", team: "CONTENT", color: "#f59e0b" },
  });
  const skillEuropeMedium = await prisma.skillset.create({
    data: { name: "Europe - Medium", team: "CONTENT", color: "#d97706" },
  });

  console.log("Created 12 skillsets (6 DESIGN, 6 CONTENT).");

  // ---- User Skillset Assignments --------------------------------------------
  await prisma.userSkillset.createMany({
    data: [
      // Designers
      // designer1: Interaction Design (primary) + Visual Design (secondary)
      { userId: designer1.id, skillsetId: skillInteraction.id },
      { userId: designer1.id, skillsetId: skillVisual.id },
      // designer2: Visual Design only
      { userId: designer2.id, skillsetId: skillVisual.id },
      // designer3: Storyboarding (primary) + Interaction Design (secondary)
      { userId: designer3.id, skillsetId: skillStoryboard.id },
      { userId: designer3.id, skillsetId: skillInteraction.id },
      // designer4: Design System only
      { userId: designer4.id, skillsetId: skillDesignSystem.id },
      // Content writers
      { userId: content1.id, skillsetId: skillNASmall.id },
      { userId: content1.id, skillsetId: skillNAMedium.id },
      { userId: content2.id, skillsetId: skillUKIASmall.id },
      { userId: content2.id, skillsetId: skillUKIAMedium.id },
      { userId: content3.id, skillsetId: skillEuropeSmall.id },
      { userId: content3.id, skillsetId: skillEuropeMedium.id },
    ],
  });

  console.log("Assigned skillsets to users.");

  // ---- Routing Rules --------------------------------------------------------
  await prisma.routingRule.createMany({
    data: [
      {
        name: "Content Team Routing",
        keywords: JSON.stringify(["blog", "article", "copy", "content", "writing", "editorial"]),
        team: "CONTENT",
        priority: 1,
        isActive: true,
      },
      {
        name: "Design Team Routing",
        keywords: JSON.stringify(["design", "logo", "banner", "visual", "mockup", "figma", "ui", "ux"]),
        team: "DESIGN",
        priority: 1,
        isActive: true,
      },
      {
        name: "SEO Team Routing",
        keywords: JSON.stringify(["seo", "search", "keyword", "ranking", "meta", "canonical", "sitemap"]),
        team: "SEO",
        priority: 1,
        isActive: true,
      },
      {
        name: "WEM Team Routing",
        keywords: JSON.stringify(["cms", "page", "web", "component", "template", "wem", "publish", "layout"]),
        team: "WEM",
        priority: 1,
        isActive: true,
      },
    ],
  });

  console.log("Created 4 routing rules.");

  // ---- Form Template --------------------------------------------------------
  /// priority_notes shown only when request_type has a value (is_not_empty)
  const priorityNotesCondition = JSON.stringify([
    {
      action: "show",
      when: {
        fieldKey: "request_type",
        operator: "is_not_empty",
      },
    },
  ]);

  const template = await prisma.formTemplate.create({
    data: {
      name: "General Intake",
      description: "Standard intake form for routing requests to the right team.",
      isActive: true,
      fields: {
        create: [
          {
            label: "Title",
            fieldKey: "title",
            type: "TEXT",
            required: true,
            order: 1,
            options: null,
            conditions: null,
          },
          {
            label: "Description",
            fieldKey: "description",
            type: "TEXTAREA",
            required: true,
            order: 2,
            options: null,
            conditions: null,
          },
          {
            label: "Request Type",
            fieldKey: "request_type",
            type: "SELECT",
            required: true,
            order: 3,
            options: JSON.stringify(["Content", "Design", "SEO", "WEM"]),
            conditions: null,
          },
          {
            label: "URL",
            fieldKey: "url",
            type: "URL",
            required: false,
            order: 4,
            options: null,
            conditions: null,
          },
          {
            label: "Due Date",
            fieldKey: "due_date",
            type: "DATE",
            required: false,
            order: 5,
            options: null,
            conditions: null,
          },
          {
            label: "Priority Notes",
            fieldKey: "priority_notes",
            type: "TEXTAREA",
            required: false,
            order: 6,
            options: null,
            conditions: priorityNotesCondition,
          },
        ],
      },
    },
  });

  console.log("Created form template with 6 fields.");

  // ---- Epics ----------------------------------------------------------------
  const epicContent = await prisma.epic.create({
    data: {
      name: "Q2 Content Push",
      description: "All content production and editorial work planned for Q2 2026.",
      team: "CONTENT",
      color: "#3b82f6",
      startDate: new Date("2026-04-01T00:00:00.000Z"),
      endDate: new Date("2026-06-30T23:59:59.000Z"),
    },
  });

  const epicDesign = await prisma.epic.create({
    data: {
      name: "Design System Refresh",
      description: "Audit and update the component library and visual identity tokens.",
      team: "DESIGN",
      color: "#a855f7",
      startDate: new Date("2026-03-15T00:00:00.000Z"),
      endDate: new Date("2026-05-31T23:59:59.000Z"),
    },
  });

  console.log("Created 2 epics.");

  // ---- Sprints --------------------------------------------------------------
  /// 5 sprints: 4 completed (isActive: false), 1 active (isActive: true)
  /// 2-week cadence starting Jan 6, 2026.
  const sprint1 = await prisma.sprint.create({
    data: {
      name: "Sprint 1",
      notes:"Establish baseline design system tokens and initial content strategy",
      startDate: new Date("2026-01-06T00:00:00.000Z"),
      endDate: new Date("2026-01-17T23:59:59.000Z"),
      isActive: false,
      committedPoints: 48,
    },
  });

  const sprint2 = await prisma.sprint.create({
    data: {
      name: "Sprint 2",
      notes:"NA content pieces and interaction design patterns",
      startDate: new Date("2026-01-20T00:00:00.000Z"),
      endDate: new Date("2026-01-31T23:59:59.000Z"),
      isActive: false,
      committedPoints: 52,
    },
  });

  const sprint3 = await prisma.sprint.create({
    data: {
      name: "Sprint 3",
      notes:"UKIA content rollout and visual design page builds",
      startDate: new Date("2026-02-03T00:00:00.000Z"),
      endDate: new Date("2026-02-14T23:59:59.000Z"),
      isActive: false,
      committedPoints: 44,
    },
  });

  const sprint4 = await prisma.sprint.create({
    data: {
      name: "Sprint 4",
      notes:"Europe content and storyboarding for Q2 campaign",
      startDate: new Date("2026-02-17T00:00:00.000Z"),
      endDate: new Date("2026-02-28T23:59:59.000Z"),
      isActive: false,
      committedPoints: 56,
    },
  });

  const sprint5 = await prisma.sprint.create({
    data: {
      name: "Sprint 5",
      notes:"Q2 prep: design system completion and cross-region content alignment",
      startDate: new Date("2026-03-03T00:00:00.000Z"),
      endDate: new Date("2026-03-21T23:59:59.000Z"),
      isActive: true,
      committedPoints: 50,
    },
  });

  console.log("Created 5 sprints (4 completed, 1 active).");

  // ---- Team Capacity --------------------------------------------------------
  /// Capacity per sprint for designers and content writers.
  /// Points reflect a 2-week sprint with typical PTO adjustments.
  await prisma.teamCapacity.createMany({
    data: [
      // Sprint 1
      { sprintId: sprint1.id, userId: designLead.id,  points: 10 },
      { sprintId: sprint1.id, userId: designer1.id,   points: 13 },
      { sprintId: sprint1.id, userId: designer2.id,   points: 13 },
      { sprintId: sprint1.id, userId: designer3.id,   points: 8  },
      { sprintId: sprint1.id, userId: designer4.id,   points: 10 },
      { sprintId: sprint1.id, userId: contentLead.id, points: 10 },
      { sprintId: sprint1.id, userId: content1.id,    points: 13 },
      { sprintId: sprint1.id, userId: content2.id,    points: 10 },
      { sprintId: sprint1.id, userId: content3.id,    points: 10 },
      // Sprint 2
      { sprintId: sprint2.id, userId: designLead.id,  points: 10 },
      { sprintId: sprint2.id, userId: designer1.id,   points: 13 },
      { sprintId: sprint2.id, userId: designer2.id,   points: 13 },
      { sprintId: sprint2.id, userId: designer3.id,   points: 13 },
      { sprintId: sprint2.id, userId: designer4.id,   points: 13 },
      { sprintId: sprint2.id, userId: contentLead.id, points: 10 },
      { sprintId: sprint2.id, userId: content1.id,    points: 13 },
      { sprintId: sprint2.id, userId: content2.id,    points: 8  },
      { sprintId: sprint2.id, userId: content3.id,    points: 8  },
      // Sprint 3
      { sprintId: sprint3.id, userId: designLead.id,  points: 10 },
      { sprintId: sprint3.id, userId: designer1.id,   points: 10 },
      { sprintId: sprint3.id, userId: designer2.id,   points: 13 },
      { sprintId: sprint3.id, userId: designer3.id,   points: 8  },
      { sprintId: sprint3.id, userId: designer4.id,   points: 10 },
      { sprintId: sprint3.id, userId: contentLead.id, points: 10 },
      { sprintId: sprint3.id, userId: content1.id,    points: 8  },
      { sprintId: sprint3.id, userId: content2.id,    points: 13 },
      { sprintId: sprint3.id, userId: content3.id,    points: 8  },
      // Sprint 4
      { sprintId: sprint4.id, userId: designLead.id,  points: 10 },
      { sprintId: sprint4.id, userId: designer1.id,   points: 13 },
      { sprintId: sprint4.id, userId: designer2.id,   points: 13 },
      { sprintId: sprint4.id, userId: designer3.id,   points: 13 },
      { sprintId: sprint4.id, userId: designer4.id,   points: 13 },
      { sprintId: sprint4.id, userId: contentLead.id, points: 10 },
      { sprintId: sprint4.id, userId: content1.id,    points: 10 },
      { sprintId: sprint4.id, userId: content2.id,    points: 10 },
      { sprintId: sprint4.id, userId: content3.id,    points: 13 },
      // Sprint 5 (active)
      { sprintId: sprint5.id, userId: designLead.id,  points: 10 },
      { sprintId: sprint5.id, userId: designer1.id,   points: 13 },
      { sprintId: sprint5.id, userId: designer2.id,   points: 13 },
      { sprintId: sprint5.id, userId: designer3.id,   points: 10 },
      { sprintId: sprint5.id, userId: designer4.id,   points: 13 },
      { sprintId: sprint5.id, userId: contentLead.id, points: 10 },
      { sprintId: sprint5.id, userId: content1.id,    points: 13 },
      { sprintId: sprint5.id, userId: content2.id,    points: 13 },
      { sprintId: sprint5.id, userId: content3.id,    points: 10 },
    ],
  });

  console.log("Created team capacity records for all 5 sprints.");

  // ---- Labels ---------------------------------------------------------------
  const labelUrgent = await prisma.label.create({ data: { name: "Urgent", color: "#ef4444" } });
  const labelA11y = await prisma.label.create({ data: { name: "Accessibility", color: "#f97316" } });
  const labelResearch = await prisma.label.create({ data: { name: "Research", color: "#10b981" } });
  const labelBug = await prisma.label.create({ data: { name: "Bug", color: "#dc2626" } });
  const labelEnhancement = await prisma.label.create({ data: { name: "Enhancement", color: "#3b82f6" } });

  console.log("Created 5 labels.");

  // ---- Tickets --------------------------------------------------------------
  /// Build a minimal valid formData JSON matching the General Intake template.
  function buildFormData(
    titleVal: string,
    descVal: string,
    requestType: "Content" | "Design" | "SEO" | "WEM",
    extras: Record<string, string> = {}
  ): string {
    return JSON.stringify({
      title: titleVal,
      description: descVal,
      request_type: requestType,
      ...extras,
    });
  }

  // ── SPRINT 1 TICKETS (all DONE — completed sprint) ────────────────────────

  const t1 = await prisma.ticket.create({
    data: {
      title: "Audit existing color tokens in Figma",
      description: "Document all current color variables across the Figma library. Flag inconsistencies.",
      team: "DESIGN",
      status: "DONE",
      size: "S",
      priority: 2,
      formData: buildFormData("Audit existing color tokens in Figma", "Document all current color variables.", "Design"),
      templateId: template.id,
      assigneeId: designer4.id,
      creatorId: admin.id,
      sprintId: sprint1.id,
      epicId: epicDesign.id,
      requiredSkillsetId: skillDesignSystem.id,
    },
  });

  const t2 = await prisma.ticket.create({
    data: {
      title: "Define semantic color token naming convention",
      description: "Establish naming schema (surface, border, text, interactive) and document in Confluence.",
      team: "DESIGN",
      status: "DONE",
      size: "XS",
      priority: 2,
      formData: buildFormData("Define semantic color token naming convention", "Establish naming schema.", "Design"),
      templateId: template.id,
      assigneeId: designer4.id,
      creatorId: admin.id,
      sprintId: sprint1.id,
      epicId: epicDesign.id,
      requiredSkillsetId: skillDesignSystem.id,
    },
  });

  const t3 = await prisma.ticket.create({
    data: {
      title: "Write NA content strategy brief for Q1",
      description: "Outline publishing cadence, topic clusters, and audience segments for North America.",
      team: "CONTENT",
      status: "DONE",
      size: "M",
      priority: 3,
      formData: buildFormData("Write NA content strategy brief for Q1", "Outline publishing cadence.", "Content"),
      templateId: template.id,
      assigneeId: content1.id,
      creatorId: contentLead.id,
      sprintId: sprint1.id,
      epicId: epicContent.id,
      requiredSkillsetId: skillNAMedium.id,
    },
  });

  const t4 = await prisma.ticket.create({
    data: {
      title: "Homepage hero copy — NA variant",
      description: "Write and review hero headline, subheadline, and CTA text for the NA homepage variant.",
      team: "CONTENT",
      status: "DONE",
      size: "XS",
      priority: 2,
      formData: buildFormData("Homepage hero copy — NA variant", "Write hero headline and CTA.", "Content"),
      templateId: template.id,
      assigneeId: content1.id,
      creatorId: contentLead.id,
      sprintId: sprint1.id,
      epicId: epicContent.id,
      requiredSkillsetId: skillNASmall.id,
    },
  });

  const t5 = await prisma.ticket.create({
    data: {
      title: "Typography scale audit — mobile breakpoints",
      description: "Review all text styles at 375px and 390px. Identify clipping and contrast failures.",
      team: "DESIGN",
      status: "DONE",
      size: "S",
      priority: 1,
      formData: buildFormData("Typography scale audit — mobile breakpoints", "Review text styles at mobile widths.", "Design"),
      templateId: template.id,
      assigneeId: designer1.id,
      creatorId: designLead.id,
      sprintId: sprint1.id,
      epicId: epicDesign.id,
      requiredSkillsetId: skillInteraction.id,
    },
  });

  const t6 = await prisma.ticket.create({
    data: {
      title: "Interactive prototype — intake form flow",
      description: "Build clickable Figma prototype showing the full intake form user journey.",
      team: "DESIGN",
      status: "DONE",
      size: "M",
      priority: 2,
      formData: buildFormData("Interactive prototype — intake form flow", "Build clickable Figma prototype.", "Design"),
      templateId: template.id,
      assigneeId: designer1.id,
      creatorId: admin.id,
      sprintId: sprint1.id,
      epicId: epicDesign.id,
      requiredSkillsetId: skillInteraction.id,
    },
  });

  const t7 = await prisma.ticket.create({
    data: {
      title: "Icon library first-pass — 24px grid",
      description: "Design 20 core navigation and action icons to 24px grid. Export as SVG.",
      team: "DESIGN",
      status: "DONE",
      size: "M",
      priority: 1,
      formData: buildFormData("Icon library first-pass — 24px grid", "Design 20 core icons.", "Design"),
      templateId: template.id,
      assigneeId: designer2.id,
      creatorId: designLead.id,
      sprintId: sprint1.id,
      epicId: epicDesign.id,
      requiredSkillsetId: skillVisual.id,
    },
  });

  console.log("Created sprint 1 tickets (7 tickets, all DONE).");

  // ── SPRINT 2 TICKETS (all DONE — completed sprint) ────────────────────────

  const t8 = await prisma.ticket.create({
    data: {
      title: "NA blog post — product update announcement",
      description: "Write 800-word blog post for the March product update targeting NA audience.",
      team: "CONTENT",
      status: "DONE",
      size: "S",
      priority: 3,
      formData: buildFormData("NA blog post — product update announcement", "Write 800-word blog post.", "Content"),
      templateId: template.id,
      assigneeId: content1.id,
      creatorId: contentLead.id,
      sprintId: sprint2.id,
      epicId: epicContent.id,
      requiredSkillsetId: skillNASmall.id,
    },
  });

  const t9 = await prisma.ticket.create({
    data: {
      title: "NA landing page copy — features section",
      description: "Write feature bullet points and section headers for NA-specific landing page.",
      team: "CONTENT",
      status: "DONE",
      size: "S",
      priority: 2,
      formData: buildFormData("NA landing page copy — features section", "Write feature bullet points.", "Content"),
      templateId: template.id,
      assigneeId: content1.id,
      creatorId: contentLead.id,
      sprintId: sprint2.id,
      epicId: epicContent.id,
      requiredSkillsetId: skillNAMedium.id,
    },
  });

  const t10 = await prisma.ticket.create({
    data: {
      title: "Interaction patterns — dropdown menu states",
      description: "Design hover, focus, active, and disabled states for all dropdown variants.",
      team: "DESIGN",
      status: "DONE",
      size: "M",
      priority: 2,
      formData: buildFormData("Interaction patterns — dropdown menu states", "Design all dropdown states.", "Design"),
      templateId: template.id,
      assigneeId: designer1.id,
      creatorId: designLead.id,
      sprintId: sprint2.id,
      epicId: epicDesign.id,
      requiredSkillsetId: skillInteraction.id,
    },
  });

  const t11 = await prisma.ticket.create({
    data: {
      title: "Sprint report page visual design",
      description: "Design the sprint velocity chart, burndown, and capacity breakdown UI.",
      team: "DESIGN",
      status: "DONE",
      size: "L",
      priority: 2,
      formData: buildFormData("Sprint report page visual design", "Design sprint report UI components.", "Design"),
      templateId: template.id,
      assigneeId: designer2.id,
      creatorId: admin.id,
      sprintId: sprint2.id,
      epicId: epicDesign.id,
      requiredSkillsetId: skillVisual.id,
    },
  });

  const t12 = await prisma.ticket.create({
    data: {
      title: "Storyboard — onboarding email sequence",
      description: "Create 6-frame storyboard for the new user onboarding email campaign.",
      team: "DESIGN",
      status: "DONE",
      size: "M",
      priority: 1,
      formData: buildFormData("Storyboard — onboarding email sequence", "Create 6-frame email storyboard.", "Design"),
      templateId: template.id,
      assigneeId: designer3.id,
      creatorId: contentLead.id,
      sprintId: sprint2.id,
      epicId: epicDesign.id,
      requiredSkillsetId: skillStoryboard.id,
    },
  });

  const t13 = await prisma.ticket.create({
    data: {
      title: "Button component variants — design tokens applied",
      description: "Update all button variants (primary, secondary, ghost, danger) to use new token system.",
      team: "DESIGN",
      status: "DONE",
      size: "S",
      priority: 2,
      formData: buildFormData("Button component variants — design tokens applied", "Update button variants with tokens.", "Design"),
      templateId: template.id,
      assigneeId: designer4.id,
      creatorId: designLead.id,
      sprintId: sprint2.id,
      epicId: epicDesign.id,
      requiredSkillsetId: skillDesignSystem.id,
    },
  });

  console.log("Created sprint 2 tickets (6 tickets, all DONE).");

  // ── SPRINT 3 TICKETS (all DONE — completed sprint) ────────────────────────

  const t14 = await prisma.ticket.create({
    data: {
      title: "UKIA homepage hero copy",
      description: "Write hero headline and supporting copy for the UK, Ireland, and Australia homepage variant.",
      team: "CONTENT",
      status: "DONE",
      size: "XS",
      priority: 2,
      formData: buildFormData("UKIA homepage hero copy", "Write UKIA hero headline and copy.", "Content"),
      templateId: template.id,
      assigneeId: content2.id,
      creatorId: contentLead.id,
      sprintId: sprint3.id,
      epicId: epicContent.id,
      requiredSkillsetId: skillUKIASmall.id,
    },
  });

  const t15 = await prisma.ticket.create({
    data: {
      title: "UKIA blog post — industry trends Q1",
      description: "Write 1000-word thought leadership piece for UKIA market.",
      team: "CONTENT",
      status: "DONE",
      size: "M",
      priority: 2,
      formData: buildFormData("UKIA blog post — industry trends Q1", "Write 1000-word UKIA blog post.", "Content"),
      templateId: template.id,
      assigneeId: content2.id,
      creatorId: contentLead.id,
      sprintId: sprint3.id,
      epicId: epicContent.id,
      requiredSkillsetId: skillUKIAMedium.id,
    },
  });

  const t16 = await prisma.ticket.create({
    data: {
      title: "Product page visual redesign — UKIA",
      description: "Apply new design system to product feature page. Deliver desktop + mobile comps.",
      team: "DESIGN",
      status: "DONE",
      size: "L",
      priority: 3,
      formData: buildFormData("Product page visual redesign — UKIA", "Apply design system to product page.", "Design"),
      templateId: template.id,
      assigneeId: designer2.id,
      creatorId: designLead.id,
      sprintId: sprint3.id,
      epicId: epicDesign.id,
      requiredSkillsetId: skillVisual.id,
    },
  });

  const t17 = await prisma.ticket.create({
    data: {
      title: "Storyboard — product demo video script",
      description: "Create visual storyboard for the 90-second product demo video.",
      team: "DESIGN",
      status: "DONE",
      size: "M",
      priority: 2,
      formData: buildFormData("Storyboard — product demo video script", "Storyboard for 90-second demo video.", "Design"),
      templateId: template.id,
      assigneeId: designer3.id,
      creatorId: admin.id,
      sprintId: sprint3.id,
      epicId: epicDesign.id,
      requiredSkillsetId: skillStoryboard.id,
    },
  });

  const t18 = await prisma.ticket.create({
    data: {
      title: "Form field components — accessibility review",
      description: "Audit all form field components against WCAG 2.1 AA. Fix contrast and focus indicators.",
      team: "DESIGN",
      status: "DONE",
      size: "M",
      priority: 3,
      formData: buildFormData("Form field components — accessibility review", "Audit form fields against WCAG 2.1 AA.", "Design"),
      templateId: template.id,
      assigneeId: designer1.id,
      creatorId: designLead.id,
      sprintId: sprint3.id,
      epicId: epicDesign.id,
      requiredSkillsetId: skillInteraction.id,
    },
  });

  console.log("Created sprint 3 tickets (5 tickets, all DONE).");

  // ── SPRINT 4 TICKETS (all DONE — completed sprint) ────────────────────────

  const t19 = await prisma.ticket.create({
    data: {
      title: "Europe homepage hero copy",
      description: "Write hero headline and supporting copy for the Europe homepage variant (EN-EU).",
      team: "CONTENT",
      status: "DONE",
      size: "XS",
      priority: 2,
      formData: buildFormData("Europe homepage hero copy", "Write Europe hero headline and copy.", "Content"),
      templateId: template.id,
      assigneeId: content3.id,
      creatorId: contentLead.id,
      sprintId: sprint4.id,
      epicId: epicContent.id,
      requiredSkillsetId: skillEuropeSmall.id,
    },
  });

  const t20 = await prisma.ticket.create({
    data: {
      title: "Europe blog post — GDPR compliance guide",
      description: "Write 1200-word compliance guide targeting European enterprise buyers.",
      team: "CONTENT",
      status: "DONE",
      size: "M",
      priority: 3,
      formData: buildFormData("Europe blog post — GDPR compliance guide", "Write 1200-word GDPR guide.", "Content"),
      templateId: template.id,
      assigneeId: content3.id,
      creatorId: contentLead.id,
      sprintId: sprint4.id,
      epicId: epicContent.id,
      requiredSkillsetId: skillEuropeMedium.id,
    },
  });

  const t21 = await prisma.ticket.create({
    data: {
      title: "Campaign storyboard — Q2 European launch",
      description: "6-panel storyboard for the European Q2 campaign. Includes digital + OOH formats.",
      team: "DESIGN",
      status: "DONE",
      size: "L",
      priority: 3,
      formData: buildFormData("Campaign storyboard — Q2 European launch", "6-panel campaign storyboard.", "Design"),
      templateId: template.id,
      assigneeId: designer3.id,
      creatorId: admin.id,
      sprintId: sprint4.id,
      epicId: epicDesign.id,
      requiredSkillsetId: skillStoryboard.id,
    },
  });

  const t22 = await prisma.ticket.create({
    data: {
      title: "Input component — error and validation states",
      description: "Add error, warning, and success states to all input components. Update design tokens.",
      team: "DESIGN",
      status: "DONE",
      size: "S",
      priority: 2,
      formData: buildFormData("Input component — error and validation states", "Add validation states to inputs.", "Design"),
      templateId: template.id,
      assigneeId: designer4.id,
      creatorId: designLead.id,
      sprintId: sprint4.id,
      epicId: epicDesign.id,
      requiredSkillsetId: skillDesignSystem.id,
    },
  });

  const t23 = await prisma.ticket.create({
    data: {
      title: "Navigation redesign — top bar and sidebar",
      description: "Redesign top navigation and left sidebar for the main application layout.",
      team: "DESIGN",
      status: "DONE",
      size: "L",
      priority: 3,
      formData: buildFormData("Navigation redesign — top bar and sidebar", "Redesign app navigation.", "Design"),
      templateId: template.id,
      assigneeId: designer2.id,
      creatorId: admin.id,
      sprintId: sprint4.id,
      epicId: epicDesign.id,
      requiredSkillsetId: skillVisual.id,
    },
  });

  const t24 = await prisma.ticket.create({
    data: {
      title: "Europe product page copy — features section",
      description: "Localise features section copy for European market. Adjust regulatory language.",
      team: "CONTENT",
      status: "DONE",
      size: "S",
      priority: 2,
      formData: buildFormData("Europe product page copy — features section", "Localise features copy for Europe.", "Content"),
      templateId: template.id,
      assigneeId: content3.id,
      creatorId: contentLead.id,
      sprintId: sprint4.id,
      epicId: epicContent.id,
      requiredSkillsetId: skillEuropeMedium.id,
    },
  });

  console.log("Created sprint 4 tickets (6 tickets, all DONE).");

  // ── SPRINT 5 TICKETS (active sprint — mixed statuses) ────────────────────

  const t25 = await prisma.ticket.create({
    data: {
      title: "Design system component audit — cards",
      description: "Audit all card variants across the system. Align spacing, radius, and shadow tokens.",
      team: "DESIGN",
      status: "DONE",
      size: "M",
      priority: 2,
      formData: buildFormData("Design system component audit — cards", "Audit all card variants.", "Design"),
      templateId: template.id,
      assigneeId: designer4.id,
      creatorId: designLead.id,
      sprintId: sprint5.id,
      epicId: epicDesign.id,
      requiredSkillsetId: skillDesignSystem.id,
    },
  });

  const t26 = await prisma.ticket.create({
    data: {
      title: "Q2 content calendar — NA planning doc",
      description: "Draft the Q2 editorial calendar for NA. Include topic clusters, publish dates, owners.",
      team: "CONTENT",
      status: "IN_REVIEW",
      size: "M",
      priority: 3,
      formData: buildFormData("Q2 content calendar — NA planning doc", "Draft Q2 NA editorial calendar.", "Content"),
      templateId: template.id,
      assigneeId: content1.id,
      creatorId: contentLead.id,
      sprintId: sprint5.id,
      epicId: epicContent.id,
      requiredSkillsetId: skillNAMedium.id,
    },
  });

  const t27 = await prisma.ticket.create({
    data: {
      title: "Roadmap view — visual design comps",
      description: "Design the timeline roadmap view. Show sprint bands, epics, and milestone markers.",
      team: "DESIGN",
      status: "IN_REVIEW",
      size: "L",
      priority: 2,
      formData: buildFormData("Roadmap view — visual design comps", "Design roadmap timeline view.", "Design"),
      templateId: template.id,
      assigneeId: designer2.id,
      creatorId: admin.id,
      sprintId: sprint5.id,
      epicId: epicDesign.id,
      requiredSkillsetId: skillVisual.id,
    },
  });

  const t28 = await prisma.ticket.create({
    data: {
      title: "Storyboard — UKIA campaign creative brief",
      description: "Storyboard the 4 hero creative concepts for the UKIA Q2 digital campaign.",
      team: "DESIGN",
      status: "IN_PROGRESS",
      size: "L",
      priority: 2,
      formData: buildFormData("Storyboard — UKIA campaign creative brief", "Storyboard 4 UKIA campaign concepts.", "Design"),
      templateId: template.id,
      assigneeId: designer3.id,
      creatorId: designLead.id,
      sprintId: sprint5.id,
      epicId: epicDesign.id,
      requiredSkillsetId: skillStoryboard.id,
    },
  });

  const t29 = await prisma.ticket.create({
    data: {
      title: "Interaction design — kanban drag-and-drop states",
      description: "Define drag, drop, hover, and invalid-drop states for the kanban board.",
      team: "DESIGN",
      status: "IN_PROGRESS",
      size: "M",
      priority: 2,
      formData: buildFormData("Interaction design — kanban drag-and-drop states", "Define kanban drag-and-drop states.", "Design"),
      templateId: template.id,
      assigneeId: designer1.id,
      creatorId: admin.id,
      sprintId: sprint5.id,
      epicId: epicDesign.id,
      requiredSkillsetId: skillInteraction.id,
    },
  });

  const t30 = await prisma.ticket.create({
    data: {
      title: "UKIA Q2 blog post — customer success story",
      description: "Write 900-word customer success story featuring a UKIA enterprise client.",
      team: "CONTENT",
      status: "IN_PROGRESS",
      size: "S",
      priority: 2,
      formData: buildFormData("UKIA Q2 blog post — customer success story", "Write UKIA customer success story.", "Content"),
      templateId: template.id,
      assigneeId: content2.id,
      creatorId: contentLead.id,
      sprintId: sprint5.id,
      epicId: epicContent.id,
      requiredSkillsetId: skillUKIASmall.id,
    },
  });

  const t31 = await prisma.ticket.create({
    data: {
      title: "Europe Q2 newsletter copy",
      description: "Write the Q2 newsletter for European subscribers. 600 words, product focus.",
      team: "CONTENT",
      status: "TODO",
      size: "S",
      priority: 1,
      formData: buildFormData("Europe Q2 newsletter copy", "Write Q2 newsletter for European subscribers.", "Content"),
      templateId: template.id,
      assigneeId: content3.id,
      creatorId: contentLead.id,
      sprintId: sprint5.id,
      epicId: epicContent.id,
      requiredSkillsetId: skillEuropeSmall.id,
    },
  });

  const t32 = await prisma.ticket.create({
    data: {
      title: "Modal and drawer components — design tokens",
      description: "Update modal backdrop, panel, and drawer components to use elevation and overlay tokens.",
      team: "DESIGN",
      status: "TODO",
      size: "S",
      priority: 1,
      formData: buildFormData("Modal and drawer components — design tokens", "Update modal and drawer with tokens.", "Design"),
      templateId: template.id,
      assigneeId: designer4.id,
      creatorId: designLead.id,
      sprintId: sprint5.id,
      epicId: epicDesign.id,
      requiredSkillsetId: skillDesignSystem.id,
    },
  });

  const t33 = await prisma.ticket.create({
    data: {
      title: "Empty state illustrations — 6 states",
      description: "Illustrate 6 empty state scenarios: no tickets, no results, loading, error, offline, onboarding.",
      team: "DESIGN",
      status: "BACKLOG",
      size: "XL",
      priority: 1,
      formData: buildFormData("Empty state illustrations — 6 states", "Illustrate 6 empty state scenarios.", "Design"),
      templateId: template.id,
      assigneeId: null,
      creatorId: admin.id,
      sprintId: sprint5.id,
      epicId: epicDesign.id,
      requiredSkillsetId: skillVisual.id,
    },
  });

  const t34 = await prisma.ticket.create({
    data: {
      title: "NA Q2 case study — financial services vertical",
      description: "Research and write 1500-word case study targeting NA financial services buyers.",
      team: "CONTENT",
      status: "BACKLOG",
      size: "L",
      priority: 2,
      formData: buildFormData("NA Q2 case study — financial services vertical", "Write NA financial services case study.", "Content"),
      templateId: template.id,
      assigneeId: null,
      creatorId: contentLead.id,
      sprintId: sprint5.id,
      epicId: epicContent.id,
      requiredSkillsetId: skillNAMedium.id,
    },
  });

  console.log("Created sprint 5 tickets (10 tickets, mixed statuses).");

  // ── BACKLOG TICKETS (no sprint) ───────────────────────────────────────────

  await prisma.ticket.create({
    data: {
      title: "Audit meta tags across all landing pages",
      description: "Review title, description, and canonical tags. Flag pages missing OG tags.",
      team: "SEO",
      status: "BACKLOG",
      size: null,
      priority: 2,
      formData: buildFormData("Audit meta tags across all landing pages", "Review title, description, and canonical tags.", "SEO"),
      templateId: template.id,
      assigneeId: seoLead.id,
      creatorId: admin.id,
      sprintId: null,
      epicId: null,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Build XML sitemap generation pipeline",
      description: "Automate sitemap.xml generation and submission to Google Search Console on deploy.",
      team: "SEO",
      status: "BACKLOG",
      size: null,
      priority: 1,
      formData: buildFormData("Build XML sitemap generation pipeline", "Automate sitemap.xml generation.", "SEO"),
      templateId: template.id,
      assigneeId: null,
      creatorId: admin.id,
      sprintId: null,
      epicId: null,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Create reusable CTA component template",
      description: "Build a configurable call-to-action component that content editors can drop into any page.",
      team: "WEM",
      status: "BACKLOG",
      size: null,
      priority: 0,
      formData: buildFormData("Create reusable CTA component template", "Build configurable CTA component.", "WEM"),
      templateId: template.id,
      assigneeId: null,
      creatorId: admin.id,
      sprintId: null,
      epicId: null,
    },
  });

  console.log("Created 3 backlog tickets (no sprint, non-design/content teams).");

  // ── DESIGN & CONTENT BACKLOG TICKETS (30 unassigned, no sprint) ──────────
  /// 18 DESIGN tickets, 12 CONTENT tickets.
  /// ~15 have a requiredSkillsetId from DESIGN skillsets; ~15 have null.
  /// All: status BACKLOG, assigneeId null, sprintId null.

  // DESIGN backlog — with requiredSkillsetId (9 tickets)
  await prisma.ticket.create({
    data: {
      title: "Redesign onboarding flow for mobile",
      description: "Rethink the first-run user experience on iOS and Android form factors. Focus on progressive disclosure.",
      team: "DESIGN",
      status: "BACKLOG",
      size: "XL",
      priority: 3,
      formData: buildFormData("Redesign onboarding flow for mobile", "Rethink first-run UX on mobile.", "Design"),
      templateId: template.id,
      assigneeId: null,
      creatorId: designLead.id,
      sprintId: null,
      epicId: epicDesign.id,
      requiredSkillsetId: skillInteraction.id,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Interaction design: tooltip component",
      description: "Design hover, focus-triggered, and persistent tooltip variants. Include accessibility keyboard patterns.",
      team: "DESIGN",
      status: "BACKLOG",
      size: "S",
      priority: 2,
      formData: buildFormData("Interaction design: tooltip component", "Design tooltip variants with a11y support.", "Design"),
      templateId: template.id,
      assigneeId: null,
      creatorId: designLead.id,
      sprintId: null,
      epicId: epicDesign.id,
      requiredSkillsetId: skillInteraction.id,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Audit navigation patterns for accessibility",
      description: "Review all primary and secondary nav flows against WCAG 2.1 AA. Flag keyboard trap and focus order issues.",
      team: "DESIGN",
      status: "BACKLOG",
      size: "M",
      priority: 4,
      formData: buildFormData("Audit navigation patterns for accessibility", "Review nav flows against WCAG 2.1 AA.", "Design"),
      templateId: template.id,
      assigneeId: null,
      creatorId: admin.id,
      sprintId: null,
      epicId: null,
      requiredSkillsetId: skillInteraction.id,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Visual design for empty states",
      description: "Design illustration and copy treatment for all zero-data states: no results, no notifications, empty inbox.",
      team: "DESIGN",
      status: "BACKLOG",
      size: "M",
      priority: 2,
      formData: buildFormData("Visual design for empty states", "Design zero-data state illustrations and copy.", "Design"),
      templateId: template.id,
      assigneeId: null,
      creatorId: designLead.id,
      sprintId: null,
      epicId: epicDesign.id,
      requiredSkillsetId: skillVisual.id,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Product UI: settings page redesign",
      description: "Redesign the user settings page. Consolidate account, notifications, and security into tabbed layout.",
      team: "DESIGN",
      status: "BACKLOG",
      size: "L",
      priority: 3,
      formData: buildFormData("Product UI: settings page redesign", "Redesign settings page with tabbed layout.", "Design"),
      templateId: template.id,
      assigneeId: null,
      creatorId: admin.id,
      sprintId: null,
      epicId: epicDesign.id,
      requiredSkillsetId: skillVisual.id,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Design system: update button variants",
      description: "Extend button component to include icon-only, loading, and split variants. Update Storybook docs.",
      team: "DESIGN",
      status: "BACKLOG",
      size: "S",
      priority: 2,
      formData: buildFormData("Design system: update button variants", "Add icon-only, loading, split button variants.", "Design"),
      templateId: template.id,
      assigneeId: null,
      creatorId: designLead.id,
      sprintId: null,
      epicId: epicDesign.id,
      requiredSkillsetId: skillDesignSystem.id,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Design system: data table component",
      description: "Create component library entry for data tables — sorting indicators, row selection, pagination controls.",
      team: "DESIGN",
      status: "BACKLOG",
      size: "L",
      priority: 3,
      formData: buildFormData("Design system: data table component", "Create data table component in design system.", "Design"),
      templateId: template.id,
      assigneeId: null,
      creatorId: designLead.id,
      sprintId: null,
      epicId: epicDesign.id,
      requiredSkillsetId: skillDesignSystem.id,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Storyboard user journey for checkout flow",
      description: "Create 8-panel storyboard mapping the end-to-end checkout journey. Highlight decision points and drop-off risks.",
      team: "DESIGN",
      status: "BACKLOG",
      size: "M",
      priority: 2,
      formData: buildFormData("Storyboard user journey for checkout flow", "Map checkout journey in 8-panel storyboard.", "Design"),
      templateId: template.id,
      assigneeId: null,
      creatorId: designLead.id,
      sprintId: null,
      epicId: null,
      requiredSkillsetId: skillStoryboard.id,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Storyboard — campaign hero animation concepts",
      description: "Visualise 3 motion concepts for the Q3 campaign hero banner. Include frame-by-frame timing notes.",
      team: "DESIGN",
      status: "BACKLOG",
      size: "M",
      priority: 1,
      formData: buildFormData("Storyboard — campaign hero animation concepts", "3 motion concepts for Q3 campaign hero.", "Design"),
      templateId: template.id,
      assigneeId: null,
      creatorId: designLead.id,
      sprintId: null,
      epicId: null,
      requiredSkillsetId: skillStoryboard.id,
    },
  });

  // DESIGN backlog — without requiredSkillsetId (9 tickets)
  await prisma.ticket.create({
    data: {
      title: "Create component library for data tables",
      description: "Define layout tokens, column alignment rules, and row-hover states for the shared data table system.",
      team: "DESIGN",
      status: "BACKLOG",
      size: "XL",
      priority: 2,
      formData: buildFormData("Create component library for data tables", "Define layout tokens and states for data tables.", "Design"),
      templateId: template.id,
      assigneeId: null,
      creatorId: admin.id,
      sprintId: null,
      epicId: epicDesign.id,
      requiredSkillsetId: null,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Design dark mode token set",
      description: "Map all semantic color tokens to dark-mode equivalents. Validate contrast ratios at WCAG AA.",
      team: "DESIGN",
      status: "BACKLOG",
      size: "L",
      priority: 3,
      formData: buildFormData("Design dark mode token set", "Map color tokens to dark-mode equivalents.", "Design"),
      templateId: template.id,
      assigneeId: null,
      creatorId: designLead.id,
      sprintId: null,
      epicId: epicDesign.id,
      requiredSkillsetId: null,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Mobile breakpoint audit — ticket detail view",
      description: "Review ticket detail layout at 375px, 390px, and 430px. Fix overflow and truncation issues.",
      team: "DESIGN",
      status: "BACKLOG",
      size: "S",
      priority: 2,
      formData: buildFormData("Mobile breakpoint audit — ticket detail view", "Review ticket detail at mobile widths.", "Design"),
      templateId: template.id,
      assigneeId: null,
      creatorId: admin.id,
      sprintId: null,
      epicId: null,
      requiredSkillsetId: null,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Badge and tag component variants",
      description: "Design all badge sizes (xs, sm, md) and semantic variants (status, team, priority). Export as Figma components.",
      team: "DESIGN",
      status: "BACKLOG",
      size: "XS",
      priority: 1,
      formData: buildFormData("Badge and tag component variants", "Design badge sizes and semantic variants.", "Design"),
      templateId: template.id,
      assigneeId: null,
      creatorId: designLead.id,
      sprintId: null,
      epicId: epicDesign.id,
      requiredSkillsetId: null,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Kanban board — swimlane layout exploration",
      description: "Explore adding team-based swimlanes to the kanban board. Produce 3 layout options for stakeholder review.",
      team: "DESIGN",
      status: "BACKLOG",
      size: "M",
      priority: 2,
      formData: buildFormData("Kanban board — swimlane layout exploration", "Explore swimlane layout for kanban.", "Design"),
      templateId: template.id,
      assigneeId: null,
      creatorId: admin.id,
      sprintId: null,
      epicId: null,
      requiredSkillsetId: null,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Print stylesheet for ticket detail page",
      description: "Create print-optimised CSS for the ticket detail view. Remove navigation, preserve content hierarchy.",
      team: "DESIGN",
      status: "BACKLOG",
      size: "XS",
      priority: 1,
      formData: buildFormData("Print stylesheet for ticket detail page", "Create print CSS for ticket detail.", "Design"),
      templateId: template.id,
      assigneeId: null,
      creatorId: designLead.id,
      sprintId: null,
      epicId: null,
      requiredSkillsetId: null,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Sprint planning UI — capacity visualisation",
      description: "Design a capacity bar UI for sprint planning showing committed vs available points per team member.",
      team: "DESIGN",
      status: "BACKLOG",
      size: "M",
      priority: 3,
      formData: buildFormData("Sprint planning UI — capacity visualisation", "Design capacity bar for sprint planning.", "Design"),
      templateId: template.id,
      assigneeId: null,
      creatorId: admin.id,
      sprintId: null,
      epicId: null,
      requiredSkillsetId: null,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Notification centre panel design",
      description: "Design the slide-out notification panel. Include unread indicators, grouping by type, and mark-all-read action.",
      team: "DESIGN",
      status: "BACKLOG",
      size: "S",
      priority: 2,
      formData: buildFormData("Notification centre panel design", "Design notification slide-out panel.", "Design"),
      templateId: template.id,
      assigneeId: null,
      creatorId: designLead.id,
      sprintId: null,
      epicId: null,
      requiredSkillsetId: null,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Loading skeleton components — card and table",
      description: "Design skeleton screen variants for card grid and table list loading states. Match exact live layout dimensions.",
      team: "DESIGN",
      status: "BACKLOG",
      size: "XS",
      priority: 1,
      formData: buildFormData("Loading skeleton components — card and table", "Design skeleton screens for card and table.", "Design"),
      templateId: template.id,
      assigneeId: null,
      creatorId: designLead.id,
      sprintId: null,
      epicId: epicDesign.id,
      requiredSkillsetId: null,
    },
  });

  // CONTENT backlog — with requiredSkillsetId (6 tickets)
  await prisma.ticket.create({
    data: {
      title: "Q2 blog content: NA small business audience",
      description: "Write 3 blog posts targeting NA small business segment. Topics: onboarding, integrations, ROI measurement.",
      team: "CONTENT",
      status: "BACKLOG",
      size: "L",
      priority: 3,
      formData: buildFormData("Q2 blog content: NA small business audience", "3 blog posts for NA small business segment.", "Content"),
      templateId: template.id,
      assigneeId: null,
      creatorId: contentLead.id,
      sprintId: null,
      epicId: epicContent.id,
      requiredSkillsetId: skillNASmall.id,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Product page copy update for UKIA market",
      description: "Refresh all product feature descriptions for the UKIA market. Align terminology with local usage.",
      team: "CONTENT",
      status: "BACKLOG",
      size: "M",
      priority: 4,
      formData: buildFormData("Product page copy update for UKIA market", "Refresh UKIA product feature copy.", "Content"),
      templateId: template.id,
      assigneeId: null,
      creatorId: contentLead.id,
      sprintId: null,
      epicId: epicContent.id,
      requiredSkillsetId: skillUKIAMedium.id,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Email campaign: Europe medium segment",
      description: "Write 3-email nurture sequence targeting European medium-business buyers. Focus on compliance and security.",
      team: "CONTENT",
      status: "BACKLOG",
      size: "M",
      priority: 3,
      formData: buildFormData("Email campaign: Europe medium segment", "3-email nurture for European medium-business.", "Content"),
      templateId: template.id,
      assigneeId: null,
      creatorId: contentLead.id,
      sprintId: null,
      epicId: epicContent.id,
      requiredSkillsetId: skillEuropeMedium.id,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Landing page refresh for NA medium audience",
      description: "Rewrite headline, subheadline, and benefits section copy for the NA medium-business landing page.",
      team: "CONTENT",
      status: "BACKLOG",
      size: "S",
      priority: 2,
      formData: buildFormData("Landing page refresh for NA medium audience", "Rewrite NA medium landing page copy.", "Content"),
      templateId: template.id,
      assigneeId: null,
      creatorId: contentLead.id,
      sprintId: null,
      epicId: epicContent.id,
      requiredSkillsetId: skillNAMedium.id,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "UKIA small business FAQ page",
      description: "Write 15 FAQ entries for the UKIA small business landing page. Cover pricing, support, and onboarding.",
      team: "CONTENT",
      status: "BACKLOG",
      size: "S",
      priority: 1,
      formData: buildFormData("UKIA small business FAQ page", "15 FAQ entries for UKIA small business.", "Content"),
      templateId: template.id,
      assigneeId: null,
      creatorId: contentLead.id,
      sprintId: null,
      epicId: epicContent.id,
      requiredSkillsetId: skillUKIASmall.id,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Europe small business case study",
      description: "Write 1000-word case study featuring a European small business customer. Submit for legal review.",
      team: "CONTENT",
      status: "BACKLOG",
      size: "M",
      priority: 2,
      formData: buildFormData("Europe small business case study", "1000-word European small business case study.", "Content"),
      templateId: template.id,
      assigneeId: null,
      creatorId: contentLead.id,
      sprintId: null,
      epicId: epicContent.id,
      requiredSkillsetId: skillEuropeSmall.id,
    },
  });

  // CONTENT backlog — without requiredSkillsetId (6 tickets)
  await prisma.ticket.create({
    data: {
      title: "Glossary page: industry terminology",
      description: "Write definitions for 40 industry terms used across the product and marketing site. SEO-optimised format.",
      team: "CONTENT",
      status: "BACKLOG",
      size: "L",
      priority: 1,
      formData: buildFormData("Glossary page: industry terminology", "Write 40 industry term definitions.", "Content"),
      templateId: template.id,
      assigneeId: null,
      creatorId: contentLead.id,
      sprintId: null,
      epicId: null,
      requiredSkillsetId: null,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Help centre article: sprint planning workflow",
      description: "Write step-by-step help article explaining how to run sprint planning in the tool. Include screenshots.",
      team: "CONTENT",
      status: "BACKLOG",
      size: "S",
      priority: 2,
      formData: buildFormData("Help centre article: sprint planning workflow", "Help article for sprint planning workflow.", "Content"),
      templateId: template.id,
      assigneeId: null,
      creatorId: admin.id,
      sprintId: null,
      epicId: null,
      requiredSkillsetId: null,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Social media copy: Q2 product launch",
      description: "Write LinkedIn, X, and Instagram post variants for the Q2 product launch. 5 posts per platform.",
      team: "CONTENT",
      status: "BACKLOG",
      size: "M",
      priority: 3,
      formData: buildFormData("Social media copy: Q2 product launch", "Social copy for Q2 product launch across platforms.", "Content"),
      templateId: template.id,
      assigneeId: null,
      creatorId: contentLead.id,
      sprintId: null,
      epicId: epicContent.id,
      requiredSkillsetId: null,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Onboarding email sequence — new user welcome",
      description: "Write 5-email welcome series for new users. Covers account setup, key features, and first-value moment.",
      team: "CONTENT",
      status: "BACKLOG",
      size: "M",
      priority: 3,
      formData: buildFormData("Onboarding email sequence — new user welcome", "5-email welcome series for new users.", "Content"),
      templateId: template.id,
      assigneeId: null,
      creatorId: contentLead.id,
      sprintId: null,
      epicId: null,
      requiredSkillsetId: null,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Pricing page copy refresh",
      description: "Rewrite all tier descriptions, feature list items, and CTA copy on the pricing page. A/B test variant included.",
      team: "CONTENT",
      status: "BACKLOG",
      size: "S",
      priority: 4,
      formData: buildFormData("Pricing page copy refresh", "Rewrite pricing page copy and A/B test variant.", "Content"),
      templateId: template.id,
      assigneeId: null,
      creatorId: contentLead.id,
      sprintId: null,
      epicId: null,
      requiredSkillsetId: null,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Release notes template and Q1 notes",
      description: "Define a reusable release notes format and write the Q1 release summary for all public-facing changes.",
      team: "CONTENT",
      status: "BACKLOG",
      size: "S",
      priority: 2,
      formData: buildFormData("Release notes template and Q1 notes", "Define release notes format and write Q1 notes.", "Content"),
      templateId: template.id,
      assigneeId: null,
      creatorId: admin.id,
      sprintId: null,
      epicId: null,
      requiredSkillsetId: null,
    },
  });

  console.log("Created 30 unassigned backlog tickets (18 DESIGN, 12 CONTENT, no sprint).");

  // ── ADMIN USER TICKETS (assigned to admin so My Work is non-empty) ────────

  const tAdmin1 = await prisma.ticket.create({
    data: {
      title: "Review and approve Q2 content strategy",
      description: "Review the Q2 content strategy brief prepared by the content team. Provide sign-off or feedback before handoff to leads.",
      team: "CONTENT",
      status: "IN_REVIEW",
      size: "S",
      priority: 3,
      formData: buildFormData("Review and approve Q2 content strategy", "Review Q2 content strategy brief.", "Content"),
      templateId: template.id,
      assigneeId: admin.id,
      creatorId: contentLead.id,
      sprintId: sprint5.id,
      epicId: epicContent.id,
    },
  });

  const tAdmin2 = await prisma.ticket.create({
    data: {
      title: "Audit routing rules and team assignments",
      description: "Verify all routing rules are correctly configured and tickets are being routed to the right teams. Update keywords as needed.",
      team: "WEM",
      status: "IN_PROGRESS",
      size: "M",
      priority: 2,
      formData: buildFormData("Audit routing rules and team assignments", "Verify routing rules are correctly configured.", "WEM"),
      templateId: template.id,
      assigneeId: admin.id,
      creatorId: admin.id,
      sprintId: sprint5.id,
      epicId: null,
    },
  });

  const tAdmin3 = await prisma.ticket.create({
    data: {
      title: "Onboard new design team member",
      description: "Set up accounts, assign skillsets, and schedule intro sessions for the new designer joining the team next week.",
      team: "DESIGN",
      status: "TODO",
      size: "S",
      priority: 2,
      formData: buildFormData("Onboard new design team member", "Set up accounts and schedule intro sessions.", "Design"),
      templateId: template.id,
      assigneeId: admin.id,
      creatorId: admin.id,
      sprintId: sprint5.id,
      epicId: null,
    },
  });

  const tAdmin4 = await prisma.ticket.create({
    data: {
      title: "Define Q3 roadmap milestones",
      description: "Draft the Q3 initiative list and key milestone dates. Align with leads before finalising the roadmap view.",
      team: "CONTENT",
      status: "TODO",
      size: "M",
      priority: 3,
      formData: buildFormData("Define Q3 roadmap milestones", "Draft Q3 initiative list and milestones.", "Content"),
      templateId: template.id,
      assigneeId: admin.id,
      creatorId: admin.id,
      sprintId: null,
      epicId: null,
    },
  });

  const tAdmin5 = await prisma.ticket.create({
    data: {
      title: "Stakeholder brief: Design System Refresh status",
      description: "Prepare a one-page stakeholder update on the Design System Refresh epic. Include completed work, blockers, and revised timeline.",
      team: "DESIGN",
      status: "BACKLOG",
      size: "S",
      priority: 1,
      formData: buildFormData("Stakeholder brief: Design System Refresh status", "One-page stakeholder update on Design System Refresh.", "Design"),
      templateId: template.id,
      assigneeId: admin.id,
      creatorId: admin.id,
      sprintId: null,
      epicId: epicDesign.id,
    },
  });

  console.log("Created 5 admin-assigned tickets.");

  // ── TICKET LABELS ─────────────────────────────────────────────────────────
  /// Assign labels to a representative set of tickets using the explicit join table.
  await prisma.ticketLabel.createMany({
    data: [
      // urgent on high-priority in-progress work
      { ticketId: t3.id,  labelId: labelUrgent.id },
      { ticketId: t26.id, labelId: labelUrgent.id },
      { ticketId: t28.id, labelId: labelUrgent.id },
      // accessibility label on relevant design tickets
      { ticketId: t18.id, labelId: labelA11y.id },
      { ticketId: t29.id, labelId: labelA11y.id },
      // research label on strategy and audit work
      { ticketId: t1.id,  labelId: labelResearch.id },
      { ticketId: t5.id,  labelId: labelResearch.id },
      { ticketId: t34.id, labelId: labelResearch.id },
      // enhancement label on design system improvements
      { ticketId: t2.id,  labelId: labelEnhancement.id },
      { ticketId: t13.id, labelId: labelEnhancement.id },
      { ticketId: t22.id, labelId: labelEnhancement.id },
      { ticketId: t25.id, labelId: labelEnhancement.id },
      { ticketId: t32.id, labelId: labelEnhancement.id },
    ],
  });

  console.log("Assigned labels to tickets.");

  // ---- Status History Backfill ----------------------------------------------
  /// Simulates realistic status progressions so lead time and cycle time
  /// reports are non-empty on first run.
  ///
  /// Convention for changedById: admin.id is used for all seed-generated history
  /// entries (these represent system/backfill entries, not real user actions).
  ///
  /// Entry schedule (each transition is 1 calendar day apart):
  ///   BACKLOG tickets  : BACKLOG at createdAt
  ///   TODO tickets     : BACKLOG at createdAt, TODO at +1d
  ///   IN_PROGRESS      : BACKLOG → TODO → IN_PROGRESS (+2d)
  ///   IN_REVIEW        : BACKLOG → TODO → IN_PROGRESS → IN_REVIEW (+3d)
  ///   DONE             : full progression, DONE at +4d

  type HistoryEntry = {
    ticketId: string;
    fromStatus: TicketStatus | null;
    toStatus: TicketStatus;
    changedAt: Date;
    changedById: string;
  };

  function buildHistory(
    ticketId: string,
    createdAt: Date,
    finalStatus: TicketStatus,
    changedById: string
  ): HistoryEntry[] {
    const allStatuses: TicketStatus[] = [
      TicketStatus.BACKLOG,
      TicketStatus.TODO,
      TicketStatus.IN_PROGRESS,
      TicketStatus.IN_REVIEW,
      TicketStatus.DONE,
    ];
    const finalIndex = allStatuses.indexOf(finalStatus);
    /// Slice from BACKLOG through finalStatus inclusive.
    const progression = allStatuses.slice(0, finalIndex + 1);

    return progression.map((toStatus, i) => ({
      ticketId,
      fromStatus: i === 0 ? null : progression[i - 1],
      toStatus,
      changedAt: daysAfter(createdAt, i),
      changedById,
    }));
  }

  const allTickets = [
    // Sprint 1 — all DONE
    { ticket: t1,  finalStatus: TicketStatus.DONE },
    { ticket: t2,  finalStatus: TicketStatus.DONE },
    { ticket: t3,  finalStatus: TicketStatus.DONE },
    { ticket: t4,  finalStatus: TicketStatus.DONE },
    { ticket: t5,  finalStatus: TicketStatus.DONE },
    { ticket: t6,  finalStatus: TicketStatus.DONE },
    { ticket: t7,  finalStatus: TicketStatus.DONE },
    // Sprint 2 — all DONE
    { ticket: t8,  finalStatus: TicketStatus.DONE },
    { ticket: t9,  finalStatus: TicketStatus.DONE },
    { ticket: t10, finalStatus: TicketStatus.DONE },
    { ticket: t11, finalStatus: TicketStatus.DONE },
    { ticket: t12, finalStatus: TicketStatus.DONE },
    { ticket: t13, finalStatus: TicketStatus.DONE },
    // Sprint 3 — all DONE
    { ticket: t14, finalStatus: TicketStatus.DONE },
    { ticket: t15, finalStatus: TicketStatus.DONE },
    { ticket: t16, finalStatus: TicketStatus.DONE },
    { ticket: t17, finalStatus: TicketStatus.DONE },
    { ticket: t18, finalStatus: TicketStatus.DONE },
    // Sprint 4 — all DONE
    { ticket: t19, finalStatus: TicketStatus.DONE },
    { ticket: t20, finalStatus: TicketStatus.DONE },
    { ticket: t21, finalStatus: TicketStatus.DONE },
    { ticket: t22, finalStatus: TicketStatus.DONE },
    { ticket: t23, finalStatus: TicketStatus.DONE },
    { ticket: t24, finalStatus: TicketStatus.DONE },
    // Sprint 5 — mixed
    { ticket: t25, finalStatus: TicketStatus.DONE },
    { ticket: t26, finalStatus: TicketStatus.IN_REVIEW },
    { ticket: t27, finalStatus: TicketStatus.IN_REVIEW },
    { ticket: t28, finalStatus: TicketStatus.IN_PROGRESS },
    { ticket: t29, finalStatus: TicketStatus.IN_PROGRESS },
    { ticket: t30, finalStatus: TicketStatus.IN_PROGRESS },
    { ticket: t31, finalStatus: TicketStatus.TODO },
    { ticket: t32, finalStatus: TicketStatus.TODO },
    { ticket: t33, finalStatus: TicketStatus.BACKLOG },
    { ticket: t34, finalStatus: TicketStatus.BACKLOG },
    // Admin tickets
    { ticket: tAdmin1, finalStatus: TicketStatus.IN_REVIEW },
    { ticket: tAdmin2, finalStatus: TicketStatus.IN_PROGRESS },
    { ticket: tAdmin3, finalStatus: TicketStatus.TODO },
    { ticket: tAdmin4, finalStatus: TicketStatus.TODO },
    { ticket: tAdmin5, finalStatus: TicketStatus.BACKLOG },
  ];

  const historyEntries: HistoryEntry[] = allTickets.flatMap(({ ticket, finalStatus }) =>
    buildHistory(ticket.id, ticket.createdAt, finalStatus, admin.id)
  );

  await prisma.ticketStatusHistory.createMany({ data: historyEntries });

  console.log(`Created ${historyEntries.length} status history entries.`);
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
