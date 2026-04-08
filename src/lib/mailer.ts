// SPEC: notifications.md
//
// Thin email wrapper. Configure via environment variables:
//   EMAIL_HOST    — SMTP server hostname (e.g. smtp.sendgrid.net)
//   EMAIL_PORT    — SMTP port, defaults to 587
//   EMAIL_USER    — SMTP username
//   EMAIL_PASS    — SMTP password
//   EMAIL_FROM    — Sender address (e.g. "Ticket Intake <noreply@example.com>")
//
// If EMAIL_HOST is not set, emails are logged to console only (dev/no-op mode).
// Errors are caught and logged — email failures never propagate to callers.

import nodemailer from "nodemailer";

export interface MailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(payload: MailPayload): Promise<void> {
  if (process.env.DISABLE_EMAIL === "true") {
    console.log(`[mailer] suppressed: to=${payload.to} subject=${payload.subject}`);
    return;
  }

  const host = process.env.SMTP_HOST;

  if (!host) {
    console.log(
      `[mailer] would send email to: ${payload.to} | subject: ${payload.subject}`
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" }
      : undefined,
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? "Ticket Intake <noreply@ticket-intake.local>",
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
  } catch (err) {
    console.error("[mailer] Failed to send email:", err);
  }
}

export function ticketAssignedEmail(opts: {
  to: string;
  assigneeName: string;
  ticketTitle: string;
  ticketId: string;
  appUrl: string;
}): MailPayload {
  const link = `${opts.appUrl}/tickets/${opts.ticketId}`;
  return {
    to: opts.to,
    subject: `You've been assigned: ${opts.ticketTitle}`,
    html: `<p>Hi ${opts.assigneeName},</p><p>You have been assigned a new ticket: <strong>${opts.ticketTitle}</strong></p><p><a href="${link}">View ticket →</a></p>`,
    text: `Hi ${opts.assigneeName},\n\nYou have been assigned: ${opts.ticketTitle}\n\nView ticket: ${link}`,
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
}): MailPayload {
  const link = `${opts.appUrl}/tickets/${opts.ticketId}`;
  return {
    to: opts.to,
    subject: `New comment on: ${opts.ticketTitle}`,
    html: `<p>Hi ${opts.userName},</p><p><strong>${opts.commenterName}</strong> commented on <strong>${opts.ticketTitle}</strong>:</p><blockquote>${opts.commentBody}</blockquote><p><a href="${link}">View ticket →</a></p>`,
    text: `Hi ${opts.userName},\n\n${opts.commenterName} commented on ${opts.ticketTitle}:\n\n${opts.commentBody}\n\nView ticket: ${link}`,
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
}): MailPayload {
  const link = `${opts.appUrl}/tickets/${opts.ticketId}`;
  return {
    to: opts.to,
    subject: `Ticket status updated: ${opts.ticketTitle}`,
    html: `<p>Hi ${opts.userName},</p><p>The ticket <strong>${opts.ticketTitle}</strong> status changed from <strong>${opts.oldStatus}</strong> to <strong>${opts.newStatus}</strong>.</p><p><a href="${link}">View ticket →</a></p>`,
    text: `Hi ${opts.userName},\n\n${opts.ticketTitle} status changed: ${opts.oldStatus} → ${opts.newStatus}\n\nView ticket: ${link}`,
  };
}

export function buildNotificationEmail(opts: {
  to: string;
  message: string;
  link?: string;
}): MailPayload {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const fullLink = opts.link
    ? opts.link.startsWith("http") ? opts.link : `${appUrl}${opts.link}`
    : undefined;

  const linkHtml = fullLink
    ? `<p><a href="${fullLink}" style="display:inline-block;padding:8px 16px;background:#4f46e5;color:#fff;border-radius:4px;text-decoration:none;">View</a></p>`
    : "";

  return {
    to: opts.to,
    subject: opts.message,
    html: `<p>${opts.message}</p>${linkHtml}`,
    text: fullLink ? `${opts.message}\n\nView: ${fullLink}` : opts.message,
  };
}
