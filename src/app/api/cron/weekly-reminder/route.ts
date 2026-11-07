import type { NextRequest } from "next/server";
import { sendWeeklyReminder } from "@/lib/reminders";

/**
 * Called by Vercel Cron (see vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET` when that
 * variable is set. Even without it, the reminder only goes out during its hour and once per Sunday.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  // Local testing only: /api/cron/weekly-reminder?force=1 sends regardless of the day and time.
  const force = process.env.NODE_ENV !== "production" && request.nextUrl.searchParams.get("force") === "1";
  return Response.json(await sendWeeklyReminder({ force }));
}
