import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, drivers, rideRequests, users } from "@/lib/db";
import { directionsUrl, getCampus, todayPacific } from "@/lib/campuses";
import { formatPhone } from "@/lib/phone";
import { requireProfile } from "@/lib/session";
import { inviteCounts, tripHref } from "@/lib/matching";
import { cancelRideRequestAction } from "@/app/actions";
import { CampusLine, Flash, PageTitle, StatusBadge } from "@/components/ui";
import { ContactButtons } from "@/components/contact";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Your ride" };

export default async function RideStatusPage({ params, searchParams }: PageProps<"/rides/[id]">) {
  const { id } = await params;
  const user = await requireProfile(`/rides/${id}`);
  const request = await db.query.rideRequests.findFirst({ where: eq(rideRequests.id, id) });
  if (!request || request.passengerId !== user.id) notFound();

  const campus = getCampus(request.campus);
  const isPast = request.serviceDate < todayPacific();
  const [driverUser, driverProfile, counts] = await Promise.all([
    request.driverId ? db.query.users.findFirst({ where: eq(users.id, request.driverId) }) : null,
    request.driverId ? db.query.drivers.findFirst({ where: eq(drivers.userId, request.driverId) }) : null,
    inviteCounts([request.id]),
  ]);
  const invites = counts.get(request.id) ?? { pending: 0, declined: 0 };

  return (
    <div className="space-y-5">
      <Flash searchParams={searchParams} />
      <PageTitle sub={<CampusLine campus={request.campus} date={request.serviceDate} />}>Your ride</PageTitle>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-black/60">Status</span>
          <StatusBadge status={request.status} />
        </div>

        {request.status === "open" && (
          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
            {invites.pending > 0 ? (
              <>
                We sent your request to <b>{invites.pending}</b> nearby {invites.pending === 1 ? "driver" : "drivers"}.
                You&apos;ll get an email as soon as one accepts.
              </>
            ) : (
              <>
                No drivers near your pickup spot are available yet. Your request stays open: new drivers will see
                it as they sign up, and our ride coordinators have been notified.
              </>
            )}
          </div>
        )}

        {request.status === "matched" && driverUser && (
          <div className="space-y-3">
            <div>
              <p className="text-sm text-black/60">Your driver</p>
              <p className="text-lg font-semibold">{driverUser.name}</p>
              <p className="text-sm">{formatPhone(driverUser.phone)}</p>
              {driverProfile?.car && <p className="text-sm text-black/60">{driverProfile.car}</p>}
            </div>
            {driverUser.phone && <ContactButtons phone={driverUser.phone} name={driverUser.name} />}
            <Link href={tripHref(driverUser.id, request.serviceDate)} className="btn-outline w-full">
              See everyone in the car
            </Link>
          </div>
        )}

        <dl className="space-y-2 border-t border-black/10 pt-3 text-sm">
          <div>
            <dt className="text-black/60">Pickup</dt>
            <dd>{request.address}</dd>
          </div>
          <div>
            <dt className="text-black/60">Church</dt>
            <dd>
              <a href={directionsUrl(campus.address)} target="_blank" rel="noreferrer" className="underline">
                {campus.venue}, {campus.address}
              </a>
            </dd>
          </div>
          {request.partySize > 1 && (
            <div>
              <dt className="text-black/60">People</dt>
              <dd>{request.partySize}</dd>
            </div>
          )}
          {request.notes && (
            <div>
              <dt className="text-black/60">Note</dt>
              <dd>{request.notes}</dd>
            </div>
          )}
        </dl>
      </div>

      {request.status !== "cancelled" && !isPast && (
        <form action={cancelRideRequestAction}>
          <input type="hidden" name="requestId" value={request.id} />
          <SubmitButton className="btn-ghost w-full text-red-700" pendingText="Cancelling…">
            {request.status === "matched" ? "I don't need this ride anymore" : "Cancel request"}
          </SubmitButton>
        </form>
      )}
      {request.status === "cancelled" && (
        <Link href="/ride" className="btn-primary w-full">
          Request a new ride
        </Link>
      )}
    </div>
  );
}
