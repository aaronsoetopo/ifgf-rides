import "server-only";
import { after } from "next/server";
import { inArray } from "drizzle-orm";
import { db, notifications, users } from "@/lib/db";
import { adminEmails } from "@/lib/session";
import { appUrl, sendEmail } from "@/lib/email";

type Message = {
  title: string;
  body: string;
  href?: string;
  /** Longer plain-text email. When omitted, no email is sent (in-app only). */
  email?: string;
};

/** Saves an in-app notification for each user and emails them after the response is sent. */
export async function notify(userIds: string[], msg: Message) {
  if (!userIds.length) return;
  await db
    .insert(notifications)
    .values(userIds.map((userId) => ({ userId, title: msg.title, body: msg.body, href: msg.href })));

  if (!msg.email) return;
  const recipients = await db
    .select({ email: users.email })
    .from(users)
    .where(inArray(users.id, userIds));
  const text = msg.href ? `${msg.email}\n\nOpen in the app: ${appUrl(msg.href)}` : msg.email;
  after(() =>
    Promise.all(recipients.map((r) => sendEmail({ to: r.email, subject: msg.title, text }))),
  );
}

export function notifyAdmins(subject: string, text: string) {
  const to = adminEmails();
  if (to.length) after(() => sendEmail({ to, subject, text }));
}
