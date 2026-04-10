// SPEC: gtm-brief-generator.md
// GET /api/briefs/[id]/download — Auth required. Generates and streams a .docx for a GTM brief.
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import type { GtmBriefData } from "@/lib/ai/gtm-brief-generator";
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
} from "docx";
import { GTM_SECTIONS } from "@/components/briefs/gtm-sections";

export const dynamic = "force-dynamic";

function val(v: string | null | undefined): string {
  if (!v || v.trim() === "") return "N/A";
  return v.trim();
}

function heading1(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 120 },
  });
}

function heading2(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 80 },
  });
}

function body(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 24 })],
    spacing: { after: 160 },
  });
}

function field(label: string, content: string | null | undefined): Paragraph[] {
  return [heading2(label), body(val(content))];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const brief = await db.brief.findUnique({
    where: { id },
    include: { creator: true },
  });

  if (!brief) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!brief.briefData) {
    return NextResponse.json(
      { error: "This brief has no generated data to download." },
      { status: 400 }
    );
  }

  let data: GtmBriefData;
  try {
    data = JSON.parse(brief.briefData) as GtmBriefData;
  } catch {
    return NextResponse.json(
      { error: "Brief data is corrupted — cannot generate document." },
      { status: 500 }
    );
  }

  const titleText = val(data.Title ?? brief.title);
  const createdDate = brief.createdAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const creatorName = brief.creator.name;

  // Build doc children from GTM_SECTIONS so questions always match the UI template exactly
  const sectionChildren: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: `${titleText} (GTM Launch)`, bold: true, size: 36 })],
      spacing: { after: 160 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: creatorName, size: 22 }),
        new TextRun({ text: "  |  ", size: 22 }),
        new TextRun({ text: createdDate, size: 22 }),
      ],
      spacing: { after: 400 },
    }),
  ];

  for (const section of GTM_SECTIONS) {
    sectionChildren.push(heading1(section.title.toUpperCase()));
    for (const f of section.fields) {
      sectionChildren.push(...field(f.label, data[f.key as keyof GtmBriefData]));
    }
  }

  const doc = new Document({ sections: [{ children: sectionChildren }] });

  const buffer = await Packer.toBuffer(doc);

  // Sanitise filename: replace non-alphanumeric chars with hyphens, collapse repeats
  const safeTitle = titleText
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 80);

  const filename = `${safeTitle}-brief.docx`;

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
