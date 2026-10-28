"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { db, drivers, notifications, rideRequests, users } from "@/lib/db";
import { CAMPUS_IDS, isSunday, todayPacific } from "@/lib/campuses";
import { normalizePhone } from "@/lib/phone";
import { requireAdmin, requireProfile, requireUser } from "@/lib/session";
import {
  acceptInvite,
  adminAssign,
  cancelRequest,
  declineInvite,
  inviteDriverToOpenRequests,
  inviteNearestDrivers,
  releasePassenger,
  tripHref,
} from "@/lib/matching";

export type FormState = { error?: string } | undefined;

/** Only allow redirects to paths inside this app. */
function safeNext(value: FormDataEntryValue | null, fallback = "/") {
  const next = String(value ?? "");
  return next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

function withMessage(path: string, key: "notice" | "error", message: string) {
  return `${path}${path.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(message)}`;
}

const location = {
  address: z.string().trim().min(3, "Choose a location."),
  lat: z.coerce.number({ message: "Choose a location from the list." }).min(-90).max(90),
  lng: z.coerce.number({ message: "Choose a location from the list." }).min(-180).max(180),
};

// ---------- Auth ----------

export async function signInWithGoogle(formData: FormData) {
  await signIn("google", { redirectTo: safeNext(formData.get("next")) });
}

export async function devSignIn(formData: FormData) {
  await signIn("dev", {
    email: formData.get("email"),
    name: formData.get("name"),
    redirectTo: safeNext(formData.get("next")),
  });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

// ---------- Profile ----------

const profileSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(80),
  phone: z.string().trim().min(7, "Please enter your phone number."),
});

export async function saveProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/profile");
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return { error: "That phone number doesn't look right. Use a 10-digit US number." };

  await db.update(users).set({ name: parsed.data.name, phone }).where(eq(users.id, user.id));
  redirect(withMessage(safeNext(formData.get("next")), "notice", "Profile saved."));
}

// ---------- Drivers ----------

const driverSchema = z.object({
  campus: z.enum(CAMPUS_IDS, { message: "Choose your campus." }),
  ...location,
  seats: z.coerce.number().int().min(1, "At least 1 seat.").max(8),
  car: z.string().trim().max(80).optional(),
  maxPickupMiles: z.coerce.number().min(1).max(60),
});

export async function saveDriver(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireProfile("/drive");
  const parsed = driverSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const values = { ...parsed.data, car: parsed.data.car || null, active: true };
  await db
    .insert(drivers)
    .values({ userId: user.id, ...values })
    .onConflictDoUpdate({ target: drivers.userId, set: values });
  await inviteDriverToOpenRequests(user.id);
  redirect(withMessage("/drive", "notice", "You're set up to drive. Thank you!"));
}

export async function setDriverActive(formData: FormData) {
  const user = await requireProfile("/drive");
  const active = formData.get("active") === "true";
  await db.update(drivers).set({ active }).where(eq(drivers.userId, user.id));
  if (active) await inviteDriverToOpenRequests(user.id);
  refresh();
}

export async function acceptInviteAction(formData: FormData) {
  const user = await requireProfile("/drive");
  const inviteId = String(formData.get("inviteId"));
  const result = await acceptInvite(inviteId, user.id);
  if (!result.ok) redirect(withMessage("/drive", "error", result.error));
  const date = String(formData.get("serviceDate"));
  redirect(withMessage(tripHref(user.id, date), "notice", "Ride accepted! Reach out to your passenger."));
}

export async function declineInviteAction(formData: FormData) {
  const user = await requireProfile("/drive");
  await declineInvite(String(formData.get("inviteId")), user.id);
  refresh();
}

export async function releasePassengerAction(formData: FormData) {
  const user = await requireProfile("/drive");
  await releasePassenger(String(formData.get("requestId")), user.id);
  refresh();
}

// ---------- Passengers ----------

const requestSchema = z.object({
  campus: z.enum(CAMPUS_IDS, { message: "Choose a campus." }),
  serviceDate: z.string().refine(isSunday, "Choose a Sunday."),
  ...location,
  partySize: z.coerce.number().int().min(1).max(6),
  notes: z.string().trim().max(300).optional(),
});

export async function createRideRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireProfile("/ride");
  const parsed = requestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data.serviceDate < todayPacific()) return { error: "That Sunday has already passed." };

  const existing = await db.query.rideRequests.findFirst({
    where: and(
      eq(rideRequests.passengerId, user.id),
      eq(rideRequests.serviceDate, parsed.data.serviceDate),
      inArray(rideRequests.status, ["open", "matched"]),
    ),
  });
  if (existing) {
    redirect(withMessage(`/rides/${existing.id}`, "notice", "You already have a request for that Sunday."));
  }

  const [request] = await db
    .insert(rideRequests)
    .values({ passengerId: user.id, ...parsed.data, notes: parsed.data.notes || null })
    .returning();
  await inviteNearestDrivers(request.id);
  redirect(`/rides/${request.id}`);
}

export async function cancelRideRequestAction(formData: FormData) {
  const user = await requireProfile("/");
  await cancelRequest(String(formData.get("requestId")), user.id);
  refresh();
}

// ---------- Notifications ----------

export async function markNotificationsRead() {
  const user = await requireUser("/inbox");
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  refresh();
}

// ---------- Coordinators ----------

export async function adminAssignAction(formData: FormData) {
  await requireAdmin();
  const driverId = String(formData.get("driverId") ?? "");
  if (!driverId) redirect(withMessage("/admin", "error", "Pick a driver first."));
  const result = await adminAssign(String(formData.get("requestId")), driverId);
  redirect(withMessage("/admin", result.ok ? "notice" : "error", result.ok ? "Driver assigned." : result.error));
}

export async function adminRetryMatchingAction(formData: FormData) {
  await requireAdmin();
  const invited = await inviteNearestDrivers(String(formData.get("requestId")));
  redirect(
    withMessage(
      "/admin",
      invited ? "notice" : "error",
      invited ? `Sent to ${invited} more driver(s).` : "No more drivers in range (or some are still deciding).",
    ),
  );
}
