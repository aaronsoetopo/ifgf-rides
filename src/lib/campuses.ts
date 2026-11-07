export type Campus = {
  id: string;
  name: string;
  region: string;
  time: string;
  /** Service start, in minutes after midnight Pacific time (10:30 AM = 630). */
  startMinutes: number;
  venue: string;
  address: string;
};

export const CAMPUSES: Campus[] = [
  {
    id: "tri-valley",
    name: "Tri-Valley Campus",
    region: "San Ramon",
    time: "10:30 AM",
    startMinutes: 630,
    venue: "Bollinger Canyon Elementary",
    address: "2300 Talavera Dr, San Ramon, CA 94583",
  },
  {
    id: "pinole",
    name: "Pinole Campus",
    region: "East Bay",
    time: "2:15 PM",
    startMinutes: 855,
    venue: "Pinole Valley Community Church",
    address: "2885 Pinole Valley Road, Pinole, CA 94565",
  },
  {
    id: "south-bay",
    name: "South Bay Campus",
    region: "Sunnyvale",
    time: "2:30 PM",
    startMinutes: 870,
    venue: "Sunnyvale Senior Center",
    address: "550 E Remington Drive, Sunnyvale, CA 94087",
  },
];

export const CAMPUS_IDS = CAMPUSES.map((c) => c.id) as [string, ...string[]];

export function getCampus(id: string): Campus {
  return CAMPUSES.find((c) => c.id === id) ?? CAMPUSES[0];
}

export function directionsUrl(destination: string, waypoints: string[] = []) {
  const params = new URLSearchParams({ api: "1", destination, travelmode: "driving" });
  if (waypoints.length) params.set("waypoints", waypoints.join("|"));
  return `https://www.google.com/maps/dir/?${params}`;
}

const TIME_ZONE = "America/Los_Angeles";

/** Today's date in Pacific time as YYYY-MM-DD. */
export function todayPacific(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
}

/** Minutes since midnight, Pacific time. */
function minutesNowPacific(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

/** Day of week ("Fri") and hour (0–23) in Pacific time. */
export function pacificDayAndHour(now = new Date()): { weekday: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  return {
    weekday: parts.find((p) => p.type === "weekday")?.value ?? "",
    hour: Number(parts.find((p) => p.type === "hour")?.value ?? -1),
  };
}

/** True once a campus's service on `date` has started (or the date has passed). */
export function serviceStarted(campusId: string, date: string, now = new Date()): boolean {
  const today = todayPacific(now);
  if (date !== today) return date < today;
  return minutesNowPacific(now) >= getCampus(campusId).startMinutes;
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The next `count` Sundays, including today when today is Sunday. */
export function upcomingSundays(count = 4, now = new Date()): string[] {
  const today = todayPacific(now);
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay();
  const first = addDays(today, (7 - dow) % 7);
  return Array.from({ length: count }, (_, i) => addDays(first, i * 7));
}

export function isSunday(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && new Date(`${date}T12:00:00Z`).getUTCDay() === 0;
}

/** "Sun, Nov 2" */
export function formatServiceDate(date: string, opts: { long?: boolean } = {}): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: opts.long ? "long" : "short",
    month: opts.long ? "long" : "short",
    day: "numeric",
  });
}

/** Sundays a passenger can still request for a campus: today drops off once its service has started. */
export function bookableSundays(campusId: string, count = 4, now = new Date()) {
  const today = todayPacific(now);
  const dates = upcomingSundays(count + 1, now)
    .filter((d) => !serviceStarted(campusId, d, now))
    .slice(0, count);
  return dates.map((value, i) => {
    let suffix = "";
    if (value === today) suffix = " (today)";
    else if (i === 0) suffix = isSunday(today) ? " (next Sunday)" : " (this Sunday)";
    return { value, label: formatServiceDate(value, { long: true }) + suffix };
  });
}
