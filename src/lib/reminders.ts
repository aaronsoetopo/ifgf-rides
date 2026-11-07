import "server-only";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db, rideRequests, sentReminders, users } from "@/lib/db";
import { CAMPUSES, formatServiceDate, pacificDayAndHour, upcomingSundays } from "@/lib/campuses";
import { notify } from "@/lib/notify";

/** Friday, 2 PM Pacific. */
const REMINDER_DAY = "Fri";
const REMINDER_HOUR = 14;

export type ReminderResult = { sent: number; sunday: string } | { skipped: string };

/**
 * Invites everyone to church this Sunday and offers a ride. Safe to call any time: it only sends during
 * the reminder hour, and at most once per Sunday. `force` (local testing) skips the time check.
 */
export async function sendWeeklyReminder({ force = false, now = new Date() } = {}): Promise<ReminderResult> {
  const { weekday, hour } = pacificDayAndHour(now);
  if (!force && (weekday !== REMINDER_DAY || hour !== REMINDER_HOUR)) {
    return { skipped: `Not reminder time (it's ${weekday} ${hour}:00 Pacific)` };
  }

  const sunday = upcomingSundays(1, now)[0];
  const claimed = await db
    .insert(sentReminders)
    .values({ key: `weekly:${sunday}` })
    .onConflictDoNothing()
    .returning();
  if (!claimed.length) return { skipped: `Already sent for ${sunday}` };

  // Skip people whose Sunday is already arranged: passengers with a request and drivers with riders.
  const arranged = await db
    .select({ passengerId: rideRequests.passengerId, driverId: rideRequests.driverId })
    .from(rideRequests)
    .where(and(eq(rideRequests.serviceDate, sunday), inArray(rideRequests.status, ["open", "matched"])));
  const skip = new Set(arranged.flatMap((r) => [r.passengerId, r.driverId]));
  const recipients = (await db.select({ id: users.id }).from(users).where(isNotNull(users.phone)))
    .map((u) => u.id)
    .filter((id) => !skip.has(id));

  const day = formatServiceDate(sunday, { long: true });
  await notify(recipients, {
    title: "Are you coming to church this Sunday? 🙏",
    body: "Let's glorify God together in His house! Worried about transportation? Worry not — we'll arrange a ride for you.",
    href: "/ride",
    email:
      `Are you coming to church this ${day}?\n\n` +
      `Let's glorify God together in His house!\n\n` +
      `Worried about transportation? Worry not — we'll arrange it. Request a ride in the app and we'll ` +
      `match you with a church member driving from nearby.\n\n` +
      CAMPUSES.map((c) => `${c.name} · ${c.time} · ${c.venue}, ${c.address}`).join("\n"),
  });
  return { sent: recipients.length, sunday };
}
