// SPEC: notifications.md
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "localhost",
  port: Number(process.env.SMTP_PORT ?? 1025),
  secure: process.env.SMTP_SECURE === "true",
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (process.env.DISABLE_EMAIL === "true") return;
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? "The Box Office <noreply@the-box-office.local>",
      ...payload,
    });
  } catch (err) {
    console.error("[email] Failed to send:", err);
  }
}

export function ticketAssignedEmail(opts: {
  to: string;
  assigneeName: string;
  ticketTitle: string;
  ticketId: string;
  appUrl: string;
}): EmailPayload {
  return {
    to: opts.to,
    subject: `You've been assigned: ${opts.ticketTitle}`,
    html: `<p>Hi ${opts.assigneeName},</p><p>You have been assigned a new ticket: <strong>${opts.ticketTitle}</strong></p><p><a href="${opts.appUrl}/tickets/${opts.ticketId}">View ticket →</a></p>`,
  };
}

export function ticketStatusChangedEmail(opts: {
  to: string;
  userName: string;
  ticketTitle: string;
  ticketId: string;
  oldStatus: string;
  newStatus: string;
  appUrl: string;
}): EmailPayload {
  return {
    to: opts.to,
    subject: `Ticket status updated: ${opts.ticketTitle}`,
    html: `<p>Hi ${opts.userName},</p><p>The ticket <strong>${opts.ticketTitle}</strong> status changed from <strong>${opts.oldStatus}</strong> to <strong>${opts.newStatus}</strong>.</p><p><a href="${opts.appUrl}/tickets/${opts.ticketId}">View ticket →</a></p>`,
  };
}

export function ticketCommentEmail(opts: {
  to: string;
  userName: string;
  commenterName: string;
  ticketTitle: string;
  ticketId: string;
  commentBody: string;
  appUrl: string;
}): EmailPayload {
  return {
    to: opts.to,
    subject: `New comment on: ${opts.ticketTitle}`,
    html: `<p>Hi ${opts.userName},</p><p><strong>${opts.commenterName}</strong> commented on <strong>${opts.ticketTitle}</strong>:</p><blockquote>${opts.commentBody}</blockquote><p><a href="${opts.appUrl}/tickets/${opts.ticketId}">View ticket →</a></p>`,
  };
}
