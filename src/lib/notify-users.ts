// SPEC: notifications
import { db } from "@/lib/db";
import { sendEmail, buildNotificationEmail } from "@/lib/mailer";

export async function createNotification(
  userId: string,
  message: string,
  link?: string
): Promise<void> {
  // Persist to DB and fetch user email in parallel
  const [, user] = await Promise.all([
    db.notification.create({ data: { userId, message, link } }),
    db.user.findUnique({ where: { id: userId }, select: { email: true } }),
  ]);

  if (user?.email) {
    // Fire-and-forget: email failures must not break app flow
    void sendEmail(buildNotificationEmail({ to: user.email, message, link }));
  }
}

export async function createNotifications(
  items: { userId: string; message: string; link?: string }[]
): Promise<void> {
  await Promise.all(items.map((n) => createNotification(n.userId, n.message, n.link)));
}
