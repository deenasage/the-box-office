// SPEC: labels.md
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";

// DELETE /api/tickets/[id]/labels/[labelId]
// Auth: any authenticated user
// Removes a single label from a ticket by deleting the TicketLabel join row.
// Response 200: { success: true }
// Response 404: ticket not found, or label not attached to this ticket
// Response 500: unexpected database error
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; labelId: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id, labelId } = await params;

  // Verify the ticket exists before attempting the delete.
  let ticketExists: boolean;
  try {
    const ticket = await db.ticket.findUnique({
      where: { id },
      select: { id: true },
    });
    ticketExists = ticket !== null;
  } catch (err) {
    console.error("[DELETE /api/tickets/[id]/labels/[labelId]] ticket lookup", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  if (!ticketExists) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  // Verify the label is currently attached to this ticket.
  let rowExists: boolean;
  try {
    const row = await db.ticketLabel.findUnique({
      where: { ticketId_labelId: { ticketId: id, labelId } },
      select: { ticketId: true },
    });
    rowExists = row !== null;
  } catch (err) {
    console.error("[DELETE /api/tickets/[id]/labels/[labelId]] label lookup", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  if (!rowExists) {
    return NextResponse.json(
      { error: "Label not found on this ticket" },
      { status: 404 }
    );
  }

  try {
    await db.ticketLabel.delete({
      where: { ticketId_labelId: { ticketId: id, labelId } },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/tickets/[id]/labels/[labelId]] delete", err);
    return NextResponse.json({ error: "Failed to remove label" }, { status: 500 });
  }
}
