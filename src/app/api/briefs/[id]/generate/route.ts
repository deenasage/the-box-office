// SPEC: ai-brief.md, gtm-brief-generator.md
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { BriefStatus, UserRole } from "@prisma/client";
import { generateBrief } from "@/lib/ai/brief-generator";
import { generateGtmBrief } from "@/lib/ai/gtm-brief-generator";
import { extractText } from "@/lib/ai/text-extractor";
import fs from "fs/promises";

function canMutate(
  session: { user: { id: string; role: UserRole } },
  creatorId: string
) {
  return (
    session.user.id === creatorId ||
    session.user.role === UserRole.ADMIN ||
    session.user.role === UserRole.TEAM_LEAD
  );
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const brief = await db.brief.findUnique({
    where: { id },
    include: { attachments: true },
  });

  if (!brief) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canMutate(session, brief.creatorId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (brief.status === BriefStatus.GENERATING) {
    return NextResponse.json(
      { error: "Brief generation is already in progress." },
      { status: 409 }
    );
  }
  if (
    brief.status !== BriefStatus.DRAFT &&
    brief.status !== BriefStatus.REVIEW
  ) {
    return NextResponse.json(
      { error: "Cannot generate brief in current state." },
      { status: 400 }
    );
  }

  // Mark as GENERATING before the async call
  await db.brief.update({ where: { id }, data: { status: BriefStatus.GENERATING } });

  try {
    const isGtm =
      brief.briefType === "GTM" ||
      (brief.briefType === null && brief.attachments.length > 0);

    if (isGtm) {
      // GTM path — extract structured fields via dedicated generator
      // Re-extract from stored files if extractedText is missing (e.g. uploaded before pdf-parse fix)
      let extractedText = brief.extractedText ?? "";
      if (!extractedText && brief.attachments.length > 0) {
        console.log("[generate] extractedText empty, re-extracting from", brief.attachments.length, "attachment(s)");
        const chunks: string[] = [];
        for (const att of brief.attachments) {
          try {
            console.log("[generate] reading file:", att.storedPath);
            const buf = await fs.readFile(att.storedPath);
            console.log("[generate] file read OK, size:", buf.length);
            const { text } = await extractText(Buffer.from(buf), att.mimeType);
            console.log("[generate] extracted text length:", text.length);
            if (text) chunks.push(text);
          } catch (e) {
            console.error("[generate] re-extraction failed for", att.storedPath, e);
          }
        }
        extractedText = chunks.join("\n\n---\n\n");
        console.log("[generate] total extractedText length:", extractedText.length);
        if (extractedText) {
          await db.brief.update({ where: { id }, data: { extractedText } });
        }
      }
      const result = await generateGtmBrief(extractedText);

      // Use Claude's Title if the current brief title is empty or looks like a placeholder
      const currentTitle = brief.title.trim();
      const titleIsPlaceholder =
        currentTitle === "" ||
        currentTitle.toLowerCase() === "untitled" ||
        currentTitle.toLowerCase() === "new brief" ||
        currentTitle.toLowerCase() === "untitled gtm brief";
      const titleToSave =
        titleIsPlaceholder && result.data.Title
          ? result.data.Title
          : currentTitle;

      await db.brief.update({
        where: { id },
        data: {
          status: BriefStatus.REVIEW,
          briefType: "GTM",
          briefData: JSON.stringify(result.data),
          aiPromptTokens: result.promptTokens,
          aiOutputTokens: result.outputTokens,
          title: titleToSave,
        },
      });
    } else {
      // Generic / legacy path
      const rawInput = JSON.parse(brief.rawInput) as {
        textFields?: Record<string, string>;
      };
      const rawTextFields = Object.entries(rawInput.textFields ?? {})
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n\n");

      const result = await generateBrief({
        rawTextFields,
        extractedText: brief.extractedText ?? "",
      });

      await db.brief.update({
        where: { id },
        data: {
          status: BriefStatus.REVIEW,
          objective: result.objective,
          targetAudience: result.targetAudience,
          deliverables: JSON.stringify(result.deliverables),
          dependencies: JSON.stringify(result.dependencies),
          requiredTeams: JSON.stringify(result.requiredTeams),
          timeline: result.timeline,
          successMetrics: JSON.stringify(result.successMetrics),
          clarifications: JSON.stringify(result.clarifications),
          aiPromptTokens: result.promptTokens,
          aiOutputTokens: result.outputTokens,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    await db.brief.update({ where: { id }, data: { status: BriefStatus.DRAFT } });
    console.error("Brief generation failed:", err);
    return NextResponse.json(
      { error: "Brief generation failed — please try again." },
      { status: 500 }
    );
  }
}
