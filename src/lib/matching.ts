import "server-only";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db, drivers, rideInvites, rideRequests, users, type RideRequest } from "@/lib/db";
import { formatServiceDate, getCampus, todayPacific } from "@/lib/campuses";
import { distanceMiles, formatMiles } from "@/lib/places";
import { firstName, formatPhone } from "@/lib/phone";
import { notify, notifyAdmins } from "@/lib/notify";

/** How many of the nearest drivers get a request at a time. */
const INVITE_BATCH = 3;

export function tripHref(driverId: string, date: string) {
  return `/trip/${driverId}/${date}`;
}

function rideLabel(req: Pick<RideRequest, "campus" | "serviceDate">) {
  const campus = getCampus(req.campus);
  return `${campus.name} · ${formatServiceDate(req.serviceDate)} · ${campus.time}`;
}

/** Seats already promised by a driver on a given Sunday. */
export async function seatsTaken(driverId: string, date: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${rideRequests.partySize}), 0)` })
    .from(rideRequests)
    .where(
      and(
        eq(rideRequests.driverId, driverId),
        eq(rideRequests.serviceDate, date),
        eq(rideRequests.status, "matched"),
      ),
    );
  return Number(row?.total ?? 0);
}

type Candidate = { driverId: string; miles: number };

/** Active drivers for the request's campus, within their pickup range, with enough free seats, nearest first. */
async function rankDrivers(request: RideRequest, exclude: Set<string>): Promise<Candidate[]> {
  const rows = await db
    .select()
    .from(drivers)
    .where(and(eq(drivers.active, true), eq(drivers.campus, request.campus)));

  const ranked: Candidate[] = [];
  for (const driver of rows) {
    if (driver.userId === request.passengerId || exclude.has(driver.userId)) continue;
    const miles = distanceMiles(driver, request);
    if (miles > driver.maxPickupMiles) continue;
    const free = driver.seats - (await seatsTaken(driver.userId, request.serviceDate));
    if (free < request.partySize) continue;
    ranked.push({ driverId: driver.userId, miles });
  }
  return ranked.sort((a, b) => a.miles - b.miles);
}

async function sendInvites(request: RideRequest, candidates: Candidate[]) {
  if (!candidates.length) return;
  await db
    .insert(rideInvites)
    .values(candidates.map((c) => ({ requestId: request.id, driverId: c.driverId, distanceMiles: c.miles })))
    .onConflictDoNothing();

  const passenger = await db.query.users.findFirst({ where: eq(users.id, request.passengerId) });
  const who = passenger ? firstName(passenger.name) : "Someone";
  const party = request.partySize > 1 ? ` (${request.partySize} people)` : "";
  for (const c of candidates) {
    await notify([c.driverId], {
      title: `Ride request: ${who}${party} needs a ride`,
      body: `${rideLabel(request)} — pickup ${formatMiles(c.miles)} from you.`,
      href: "/drive",
      email:
        `${who}${party} is looking for a ride to ${rideLabel(request)}.\n\n` +
        `Pickup: ${request.address} (${formatMiles(c.miles)} from your home)\n` +
        (request.notes ? `Note: ${request.notes}\n` : "") +
        `\nYou're one of the closest drivers. The first driver to accept gets the ride.`,
    });
  }
}

/**
 * Offers an open request to the next-nearest drivers who haven't seen it yet.
 * Only runs when nobody is currently considering it, so drivers aren't flooded.
 * Returns how many drivers were invited.
 */
export async function inviteNearestDrivers(requestId: string): Promise<number> {
  const request = await db.query.rideRequests.findFirst({ where: eq(rideRequests.id, requestId) });
  if (!request || request.status !== "open") return 0;

  const existing = await db.select().from(rideInvites).where(eq(rideInvites.requestId, requestId));
  if (existing.some((i) => i.status === "pending")) return 0;

  const candidates = (await rankDrivers(request, new Set(existing.map((i) => i.driverId)))).slice(
    0,
    INVITE_BATCH,
  );
  await sendInvites(request, candidates);

  if (!candidates.length) {
    notifyAdmins(
      `Unmatched ride request: ${rideLabel(request)}`,
      `No more drivers in range for a request (pickup: ${request.address}).\n` +
        `See the coordinator dashboard to help: /admin`,
    );
  }
  return candidates.length;
}

/** When a driver signs up or changes their info, offer them any open requests they can take. */
export async function inviteDriverToOpenRequests(driverId: string) {
  const driver = await db.query.drivers.findFirst({ where: eq(drivers.userId, driverId) });
  if (!driver?.active) return;

  const open = await db
    .select()
    .from(rideRequests)
    .where(
      and(
        eq(rideRequests.status, "open"),
        eq(rideRequests.campus, driver.campus),
        gte(rideRequests.serviceDate, todayPacific()),
      ),
    );
  const alreadyInvited = new Set(
    (
      await db
        .select({ requestId: rideInvites.requestId })
        .from(rideInvites)
        .where(eq(rideInvites.driverId, driverId))
    ).map((r) => r.requestId),
  );

  for (const request of open) {
    if (alreadyInvited.has(request.id) || request.passengerId === driverId) continue;
    const miles = distanceMiles(driver, request);
    if (miles > driver.maxPickupMiles) continue;
    if (driver.seats - (await seatsTaken(driverId, request.serviceDate)) < request.partySize) continue;
    await sendInvites(request, [{ driverId, miles }]);
  }
}

export type MatchResult = { ok: true } | { ok: false; error: string };

/** Assigns a driver to a request if it's still open and the driver has room. First one wins. */
async function matchRequest(requestId: string, driverId: string): Promise<MatchResult> {
  const request = await db.query.rideRequests.findFirst({ where: eq(rideRequests.id, requestId) });
  if (!request || request.status !== "open") {
    return { ok: false, error: "This ride was already taken or cancelled." };
  }
  const driver = await db.query.drivers.findFirst({ where: eq(drivers.userId, driverId) });
  if (!driver) return { ok: false, error: "Driver profile not found." };
  const free = driver.seats - (await seatsTaken(driverId, request.serviceDate));
  if (free < request.partySize) {
    return { ok: false, error: `Not enough open seats that Sunday (${free} left).` };
  }

  // Conditional update: only one driver can flip the request from open to matched.
  const won = await db
    .update(rideRequests)
    .set({ status: "matched", driverId, matchedAt: new Date() })
    .where(and(eq(rideRequests.id, requestId), eq(rideRequests.status, "open")))
    .returning({ id: rideRequests.id });
  if (!won.length) return { ok: false, error: "Another driver just accepted this ride." };

  const now = new Date();
  await db
    .insert(rideInvites)
    .values({
      requestId,
      driverId,
      distanceMiles: distanceMiles(driver, request),
      status: "accepted",
      respondedAt: now,
    })
    .onConflictDoUpdate({
      target: [rideInvites.requestId, rideInvites.driverId],
      set: { status: "accepted", respondedAt: now },
    });
  await db
    .update(rideInvites)
    .set({ status: "closed" })
    .where(and(eq(rideInvites.requestId, requestId), eq(rideInvites.status, "pending")));

  const [passenger, driverUser] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, request.passengerId) }),
    db.query.users.findFirst({ where: eq(users.id, driverId) }),
  ]);
  if (!passenger || !driverUser) return { ok: true };

  const campus = getCampus(request.campus);
  const href = tripHref(driverId, request.serviceDate);
  await notify([passenger.id], {
    title: `You have a ride! ${firstName(driverUser.name)} is driving you`,
    body: `${rideLabel(request)}. Tap to see your driver's contact info.`,
    href,
    email:
      `Good news! ${driverUser.name} will drive you to ${rideLabel(request)}.\n\n` +
      `Driver: ${driverUser.name}\nPhone: ${formatPhone(driverUser.phone)}\n` +
      (driver.car ? `Car: ${driver.car}\n` : "") +
      `Pickup: ${request.address}\nChurch: ${campus.venue}, ${campus.address}\n\n` +
      `Your driver will reach out to confirm the pickup time.`,
  });
  await notify([driverId], {
    title: `You're driving ${firstName(passenger.name)} to church`,
    body: `${rideLabel(request)}. Tap to see the trip and contact your passengers.`,
    href,
    email:
      `Thanks for driving! You're taking ${passenger.name}` +
      (request.partySize > 1 ? ` (+${request.partySize - 1})` : "") +
      ` to ${rideLabel(request)}.\n\n` +
      `Passenger: ${passenger.name}\nPhone: ${formatPhone(passenger.phone)}\n` +
      `Pickup: ${request.address}\n` +
      (request.notes ? `Note: ${request.notes}\n` : "") +
      `\nPlease text them to confirm a pickup time. The trip page has a group-text button for everyone in your car.`,
  });
  return { ok: true };
}

export async function acceptInvite(inviteId: string, driverId: string): Promise<MatchResult> {
  const invite = await db.query.rideInvites.findFirst({ where: eq(rideInvites.id, inviteId) });
  if (!invite || invite.driverId !== driverId) return { ok: false, error: "Invite not found." };
  if (invite.status !== "pending") return { ok: false, error: "This request is no longer available." };
  const result = await matchRequest(invite.requestId, driverId);
  if (!result.ok) {
    await db.update(rideInvites).set({ status: "closed" }).where(eq(rideInvites.id, inviteId));
  }
  return result;
}

export async function declineInvite(inviteId: string, driverId: string) {
  const invite = await db.query.rideInvites.findFirst({ where: eq(rideInvites.id, inviteId) });
  if (!invite || invite.driverId !== driverId || invite.status !== "pending") return;
  await db
    .update(rideInvites)
    .set({ status: "declined", respondedAt: new Date() })
    .where(eq(rideInvites.id, inviteId));
  await inviteNearestDrivers(invite.requestId);
}

/** Coordinator override: assign any driver to an open request. */
export async function adminAssign(requestId: string, driverId: string): Promise<MatchResult> {
  return matchRequest(requestId, driverId);
}

export async function cancelRequest(requestId: string, passengerId: string) {
  const request = await db.query.rideRequests.findFirst({ where: eq(rideRequests.id, requestId) });
  if (!request || request.passengerId !== passengerId || request.status === "cancelled") return;

  await db.update(rideRequests).set({ status: "cancelled" }).where(eq(rideRequests.id, requestId));
  await db
    .update(rideInvites)
    .set({ status: "closed" })
    .where(and(eq(rideInvites.requestId, requestId), eq(rideInvites.status, "pending")));

  if (request.status === "matched" && request.driverId) {
    const passenger = await db.query.users.findFirst({ where: eq(users.id, passengerId) });
    await notify([request.driverId], {
      title: `${passenger ? firstName(passenger.name) : "A passenger"} cancelled their ride`,
      body: `${rideLabel(request)}. That seat is open again.`,
      href: tripHref(request.driverId, request.serviceDate),
      email: `${passenger?.name ?? "A passenger"} no longer needs a ride to ${rideLabel(request)}. Their seat is open again.`,
    });
  }
}

/** Driver can't take a passenger after all: put the request back up for other drivers. */
export async function releasePassenger(requestId: string, driverId: string) {
  const request = await db.query.rideRequests.findFirst({ where: eq(rideRequests.id, requestId) });
  if (!request || request.driverId !== driverId || request.status !== "matched") return;

  await db
    .update(rideRequests)
    .set({ status: "open", driverId: null, matchedAt: null })
    .where(eq(rideRequests.id, requestId));
  await db
    .update(rideInvites)
    .set({ status: "declined", respondedAt: new Date() })
    .where(and(eq(rideInvites.requestId, requestId), eq(rideInvites.driverId, driverId)));

  const driverUser = await db.query.users.findFirst({ where: eq(users.id, driverId) });
  await notify([request.passengerId], {
    title: "Your driver can't make it — finding you another ride",
    body: `${rideLabel(request)}. We're asking other nearby drivers now.`,
    href: `/rides/${request.id}`,
    email:
      `${driverUser?.name ?? "Your driver"} can no longer drive you to ${rideLabel(request)}.\n\n` +
      `Your request is open again and we've sent it to other nearby drivers. We'll email you when someone accepts.`,
  });
  await inviteNearestDrivers(requestId);
}

/** Drivers' pending invites with request + passenger info, for the driver inbox. */
export async function pendingInvitesFor(driverId: string) {
  return db
    .select({ invite: rideInvites, request: rideRequests, passenger: users })
    .from(rideInvites)
    .innerJoin(rideRequests, eq(rideRequests.id, rideInvites.requestId))
    .innerJoin(users, eq(users.id, rideRequests.passengerId))
    .where(
      and(
        eq(rideInvites.driverId, driverId),
        eq(rideInvites.status, "pending"),
        eq(rideRequests.status, "open"),
        gte(rideRequests.serviceDate, todayPacific()),
      ),
    )
    .orderBy(rideRequests.serviceDate, rideInvites.distanceMiles);
}

/** Upcoming Sundays where this driver has passengers. */
export async function upcomingTripsFor(driverId: string) {
  return db
    .select({
      serviceDate: rideRequests.serviceDate,
      campus: rideRequests.campus,
      people: sql<number>`sum(${rideRequests.partySize})`,
    })
    .from(rideRequests)
    .where(
      and(
        eq(rideRequests.driverId, driverId),
        eq(rideRequests.status, "matched"),
        gte(rideRequests.serviceDate, todayPacific()),
      ),
    )
    .groupBy(rideRequests.serviceDate, rideRequests.campus)
    .orderBy(rideRequests.serviceDate);
}

export async function inviteCounts(requestIds: string[]) {
  if (!requestIds.length) return new Map<string, { pending: number; declined: number }>();
  const rows = await db
    .select({ requestId: rideInvites.requestId, status: rideInvites.status })
    .from(rideInvites)
    .where(inArray(rideInvites.requestId, requestIds));
  const map = new Map<string, { pending: number; declined: number }>();
  for (const r of rows) {
    const c = map.get(r.requestId) ?? { pending: 0, declined: 0 };
    if (r.status === "pending") c.pending++;
    if (r.status === "declined") c.declined++;
    map.set(r.requestId, c);
  }
  return map;
}
