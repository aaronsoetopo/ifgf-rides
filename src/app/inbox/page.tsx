import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, notifications } from "@/lib/db";
import { requireProfile } from "@/lib/session";
import { markNotificationsRead } from "@/app/actions";
import { EmptyState, PageTitle } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Inbox" };

const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default async function InboxPage() {
  const user = await requireProfile("/inbox");
  const items = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <PageTitle sub="Updates about your rides. We also email you each of these.">Inbox</PageTitle>
        {unread > 0 && (
          <form action={markNotificationsRead}>
            <SubmitButton className="btn-ghost py-1.5 text-xs" pendingText="…">
              Mark all read
            </SubmitButton>
          </form>
        )}
      </div>
      {items.length ? (
        <ul className="space-y-2">
          {items.map((n) => {
            const body = (
              <>
                <div className="flex items-start gap-2">
                  {!n.readAt && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />}
                  <p className={`flex-1 text-sm ${n.readAt ? "" : "font-semibold"}`}>{n.title}</p>
                  <time className="shrink-0 text-[11px] text-black/45">{timeFormat.format(n.createdAt)}</time>
                </div>
                <p className="mt-1 text-sm text-black/65">{n.body}</p>
              </>
            );
            return (
              <li key={n.id}>
                {n.href ? (
                  <Link href={n.href} className="card-soft block hover:border-ink/60">
                    {body}
                  </Link>
                ) : (
                  <div className="card-soft">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState>Nothing here yet.</EmptyState>
      )}
    </div>
  );
}
