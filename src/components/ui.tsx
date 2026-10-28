import Link from "next/link";
import type { ReactNode } from "react";
import { CAMPUSES, getCampus, directionsUrl, formatServiceDate } from "@/lib/campuses";

/** Shows ?notice= / ?error= messages set by server actions after a redirect. */
export async function Flash({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const notice = typeof sp.notice === "string" ? sp.notice : null;
  const error = typeof sp.error === "string" ? sp.error : null;
  if (!notice && !error) return null;
  return (
    <div
      role="status"
      className={`mb-4 rounded-lg px-4 py-3 text-sm ${
        error ? "bg-red-50 text-red-800 ring-1 ring-red-200" : "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200"
      }`}
    >
      {error ?? notice}
    </div>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-semibold tracking-tight">{children}</h1>
      {sub && <p className="mt-1 text-sm text-black/60">{sub}</p>}
    </div>
  );
}

const badgeStyles = {
  open: "bg-amber-100 text-amber-900",
  matched: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-black/5 text-black/50",
  pending: "bg-amber-100 text-amber-900",
} as const;

export function StatusBadge({ status }: { status: keyof typeof badgeStyles }) {
  const label = { open: "Finding a driver", matched: "Ride confirmed", cancelled: "Cancelled", pending: "Waiting" }[
    status
  ];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeStyles[status]}`}>{label}</span>;
}

export function CampusLine({ campus, date }: { campus: string; date: string }) {
  const c = getCampus(campus);
  return (
    <span>
      <span className="font-medium">{c.name}</span> · {formatServiceDate(date)} · {c.time}
    </span>
  );
}

export function CampusCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {CAMPUSES.map((c) => (
        <div key={c.id} className="card text-center">
          <p className="handwritten-underline font-medium">{c.name}</p>
          <p className="mt-2 text-xl font-medium">{c.time}</p>
          <a
            href={directionsUrl(c.address)}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block text-xs leading-relaxed text-black/70 underline underline-offset-2"
          >
            {c.venue}
            <br />
            {c.address}
          </a>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ children, action }: { children: ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className="card-soft text-center text-sm text-black/60">
      <p>{children}</p>
      {action && (
        <Link href={action.href} className="btn-outline mt-3">
          {action.label}
        </Link>
      )}
    </div>
  );
}
