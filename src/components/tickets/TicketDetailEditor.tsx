// SPEC: tickets.md
"use client";

import { InlineTitle } from "./InlineTitle";
import { InlineDescription } from "./InlineDescription";
import { TicketMetadataPanel } from "./TicketMetadataPanel";

interface TicketDetailEditorProps {
  ticketId: string;
  initialTitle: string;
  initialDescription: string | null;
  formData: Record<string, unknown>;
  templateFields?: { fieldKey: string; label: string }[];
}

export function TicketDetailEditor({
  ticketId,
  initialTitle,
  initialDescription,
  formData,
  templateFields,
}: TicketDetailEditorProps) {
  return (
    <div className="space-y-4">
      <InlineTitle ticketId={ticketId} initial={initialTitle} />
      <InlineDescription ticketId={ticketId} initial={initialDescription} />
      <TicketMetadataPanel formData={formData} templateFields={templateFields} />
    </div>
  );
}
