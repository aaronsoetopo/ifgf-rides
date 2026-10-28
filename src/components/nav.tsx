import Link from "next/link";
import { and, count, eq, isNull } from "drizzle-orm";
import { db, notifications } from "@/lib/db";
import { getCurrentUser, isAdmin } from "@/lib/session";
import { signOutAction } from "@/app/actions";
import { NavLink } from "./nav-link";

async function unreadCount(userId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.n ?? 0;
}

export async function Header() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-20 border-b border-black/10 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-ink text-xs font-bold text-white">
            IFGF
          </span>
          <span className="text-lg">Rides</span>
        </Link>
        {user ? (
          <div className="flex items-center gap-1">
            <Link href="/profile" className="btn-ghost px-2.5 py-1.5" title="Your profile">
              {user.name.split(" ")[0]}
            </Link>
            <form action={signOutAction}>
              <button className="btn-ghost px-2.5 py-1.5 text-black/50">Sign out</button>
            </form>
          </div>
        ) : (
          <Link href="/signin" className="btn-primary py-1.5">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}

export async function BottomNav() {
  const user = await getCurrentUser();
  if (!user) return null;
  const unread = await unreadCount(user.id);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-2xl justify-around">
        <NavLink href="/" icon="home" label="Home" />
        <NavLink href="/ride" icon="ride" label="Get a ride" />
        <NavLink href="/drive" icon="drive" label="Drive" />
        <NavLink href="/inbox" icon="inbox" label="Inbox" badge={unread} />
        {isAdmin(user) && <NavLink href="/admin" icon="admin" label="Coordinate" />}
      </div>
    </nav>
  );
}
