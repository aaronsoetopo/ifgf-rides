import Link from "next/link";
import { and, eq, gte, inArray } from "drizzle-orm";
import { db, drivers, rideRequests, users } from "@/lib/db";
import { CAMPUSES, formatServiceDate, todayPacific } from "@/lib/campuses";
import { distanceMiles, formatMiles } from "@/lib/places";
import { formatPhone } from "@/lib/phone";
import { requireAdmin } from "@/lib/session";
import { inviteCounts, seatsTaken, tripHref } from "@/lib/matching";
import { adminAssignAction, adminRetryMatchingAction } from "@/app/actions";
import { Flash, PageTitle, StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Coordinate" };

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  await requireAdmin();
  const today = todayPacific();

  const [requests, allDrivers] = await Promise.all([
    db
      .select({ request: rideRequests, passenger: users })
      .from(rideRequests)
      .innerJoin(users, eq(users.id, rideRequests.passengerId))
      .where(and(gte(rideRequests.serviceDate, today), inArray(rideRequests.status, ["open", "matched"])))
      .orderBy(rideRequests.serviceDate, rideRequests.createdAt),
    db.select({ driver: drivers, user: users }).from(drivers).innerJoin(users, eq(users.id, drivers.userId)),
  ]);
  const counts = await inviteCounts(requests.map((r) => r.request.id));
  // For each open request: every driver for that campus, nearest first, with their free seats that Sunday.
  const options = new Map(
    await Promise.all(
      requests
        .filter((r) => r.request.status === "open")
        .map(async ({ request }) => {
          const list = await Promise.all(
            allDrivers
              .filter((d) => d.driver.campus === request.campus && d.user.id !== request.passengerId)
              .map(async (d) => ({
                ...d,
                miles: distanceMiles(d.driver, request),
                free: d.driver.seats - (await seatsTaken(d.user.id, request.serviceDate)),
              })),
          );
          return [request.id, list.sort((a, b) => a.miles - b.miles)] as const;
        }),
    ),
  );
  const driverNames = new Map(allDrivers.map((d) => [d.user.id, d.user.name]));

  const dates = [...new Set(requests.map((r) => r.request.serviceDate))];
  const openCount = requests.filter((r) => r.request.status === "open").length;

  return (
    <div className="space-y-7">
      <Flash searchParams={searchParams} />
      <PageTitle
        sub={`${openCount} unmatched · ${requests.length - openCount} matched · ${allDrivers.filter((d) => d.driver.active).length} active drivers`}
      >
        Coordinator dashboard
      </PageTitle>

      {dates.length === 0 && <p className="card-soft text-sm text-black/60">No upcoming ride requests.</p>}

      {dates.map((date) => (
        <section key={date} className="space-y-4">
          <h2 className="text-lg font-semibold">{formatServiceDate(date, { long: true })}</h2>
          {CAMPUSES.map((campus) => {
            const rows = requests.filter((r) => r.request.serviceDate === date && r.request.campus === campus.id);
            if (!rows.length) return null;
            return (
              <div key={campus.id} className="space-y-2">
                <h3 className="text-sm font-semibold text-black/60">
                  {campus.name} · {campus.time}
                </h3>
                {rows.map(({ request, passenger }) => {
                  const c = counts.get(request.id) ?? { pending: 0, declined: 0 };
                  return (
                    <div key={request.id} className="card-soft space-y-2 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">
                            {passenger.name}
                            {request.partySize > 1 && ` +${request.partySize - 1}`}
                          </p>
                          <p className="text-black/60">{formatPhone(passenger.phone)}</p>
                        </div>
                        <StatusBadge status={request.status} />
                      </div>
                      <p className="text-black/70">📍 {request.address}</p>
                      {request.status === "matched" && request.driverId ? (
                        <p>
                          Driver:{" "}
                          <Link className="underline" href={tripHref(request.driverId, date)}>
                            {driverNames.get(request.driverId)}
                          </Link>
                        </p>
                      ) : (
                        <>
                          <p className="text-xs text-black/55">
                            {c.pending} waiting on a reply · {c.declined} declined
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <form action={adminAssignAction} className="flex w-full gap-2">
                              <input type="hidden" name="requestId" value={request.id} />
                              <select name="driverId" className="input min-w-0 flex-1 py-1.5 text-sm" defaultValue="">
                                <option value="" disabled>
                                  Assign a driver…
                                </option>
                                {(options.get(request.id) ?? []).map((o) => (
                                  <option key={o.user.id} value={o.user.id} disabled={o.free < request.partySize}>
                                    {o.user.name} — {formatMiles(o.miles)}, {o.free} free
                                    {o.driver.active ? "" : " (paused)"}
                                  </option>
                                ))}
                              </select>
                              <SubmitButton className="btn-primary py-1.5" pendingText="…">
                                Assign
                              </SubmitButton>
                            </form>
                            <form action={adminRetryMatchingAction}>
                              <input type="hidden" name="requestId" value={request.id} />
                              <SubmitButton className="btn-outline py-1.5" pendingText="…">
                                Ask more drivers
                              </SubmitButton>
                            </form>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </section>
      ))}

      <section>
        <h2 className="section-title">Drivers</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-black/50">
              <tr>
                <th className="py-1 pr-3 font-medium">Name</th>
                <th className="py-1 pr-3 font-medium">Campus</th>
                <th className="py-1 pr-3 font-medium">Seats</th>
                <th className="py-1 font-medium">Phone</th>
              </tr>
            </thead>
            <tbody>
              {allDrivers.map(({ driver, user }) => (
                <tr key={user.id} className={`border-t border-black/10 ${driver.active ? "" : "text-black/40"}`}>
                  <td className="py-2 pr-3">{user.name}</td>
                  <td className="py-2 pr-3">
                    {CAMPUSES.find((c) => c.id === driver.campus)?.name.replace(" Campus", "")}
                  </td>
                  <td className="py-2 pr-3">{driver.seats}</td>
                  <td className="py-2">{formatPhone(user.phone)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
