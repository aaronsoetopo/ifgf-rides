import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, users, type User } from "@/lib/db";

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdmin(user: Pick<User, "email">): boolean {
  return adminEmails().includes(user.email.toLowerCase());
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return (await db.query.users.findFirst({ where: eq(users.id, id) })) ?? null;
});

export async function requireUser(next = "/"): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?next=${encodeURIComponent(next)}`);
  return user;
}

/** Requires a signed-in user who has added a phone number (needed to coordinate rides). */
export async function requireProfile(next = "/"): Promise<User> {
  const user = await requireUser(next);
  if (!user.phone) redirect(`/profile?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser("/admin");
  if (!isAdmin(user)) redirect("/");
  return user;
}
