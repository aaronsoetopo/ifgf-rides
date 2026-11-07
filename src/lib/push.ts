import "server-only";
import { inArray } from "drizzle-orm";
import { sendNotification, WebPushError } from "web-push";
import { db, pushSubscriptions } from "@/lib/db";
import { adminEmails } from "@/lib/session";

function vapidDetails() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  // Push services want a contact: an https site or a mailto address (localhost isn't accepted).
  const site = process.env.APP_URL;
  const subject =
    process.env.VAPID_SUBJECT ??
    (site?.startsWith("https://") ? site : `mailto:${adminEmails()[0] ?? "admin@example.com"}`);
  return { subject, publicKey, privateKey };
}

/** Sends a push notification to every device the users turned notifications on for. */
export async function sendPush(userIds: string[], msg: { title: string; body: string; href?: string }) {
  const vapid = vapidDetails();
  if (!vapid || !userIds.length) return;

  const subs = await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.userId, userIds));
  const payload = JSON.stringify(msg);
  const gone: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          vapidDetails: vapid,
          TTL: 60 * 60 * 24, // keep trying for a day if the phone is offline
        });
      } catch (err) {
        // 404/410: the person turned notifications off or uninstalled; forget that device.
        if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) gone.push(s.endpoint);
        else console.error("[push] failed to send", err);
      }
    }),
  );

  if (gone.length) await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.endpoint, gone));
}
