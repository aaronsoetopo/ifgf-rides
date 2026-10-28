import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, drivers } from "@/lib/db";
import { CAMPUSES, getCampus } from "@/lib/campuses";
import { formatMiles } from "@/lib/places";
import { firstName } from "@/lib/phone";
import { requireProfile } from "@/lib/session";
import { pendingInvitesFor, tripHref, upcomingTripsFor } from "@/lib/matching";
import { acceptInviteAction, declineInviteAction, setDriverActive } from "@/app/actions";
import { CampusLine, EmptyState, Flash, PageTitle } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { DriverForm } from "./driver-form";

export const metadata = { title: "Drive" };

export default async function DrivePage({ searchParams }: PageProps<"/drive">) {
  const user = await requireProfile("/drive");
  const driver = await db.query.drivers.findFirst({ where: eq(drivers.userId, user.id) });
  const sp = await searchParams;
  const editing = sp.edit === "1";

  if (!driver || editing) {
    return (
      <div>
        <Flash searchParams={searchParams} />
        <PageTitle
          sub={
            driver
              ? "Update your driving details."
              : "Thank you for helping people get to church! Tell us a bit about your ride."
          }
        >
          {driver ? "Edit driver info" : "Become a driver"}
        </PageTitle>
        <DriverForm
          campuses={CAMPUSES}
          driver={
            driver && {
              campus: driver.campus,
              address: driver.address,
              lat: driver.lat,
              lng: driver.lng,
              seats: driver.seats,
              car: driver.car,
              maxPickupMiles: driver.maxPickupMiles,
            }
          }
        />
      </div>
    );
  }

  const [invites, trips] = await Promise.all([pendingInvitesFor(user.id), upcomingTripsFor(user.id)]);
  const campus = getCampus(driver.campus);

  return (
    <div className="space-y-7">
      <Flash searchParams={searchParams} />
      <PageTitle sub={`${campus.name} · ${campus.time} · ${driver.seats} seats · up to ${driver.maxPickupMiles} mi pickup`}>
        Drive
      </PageTitle>

      <div className="card flex items-center gap-3">
        <span className={`size-3 rounded-full ${driver.active ? "bg-emerald-500" : "bg-black/25"}`} />
        <div className="flex-1">
          <p className="font-medium">{driver.active ? "You're available to drive" : "Driving is paused"}</p>
          <p className="text-xs text-black/60">
            {driver.active ? "Nearby ride requests will be sent to you." : "You won't get new ride requests."}
          </p>
        </div>
        <form action={setDriverActive}>
          <input type="hidden" name="active" value={driver.active ? "false" : "true"} />
          <SubmitButton className={driver.active ? "btn-outline py-1.5" : "btn-primary py-1.5"} pendingText="…">
            {driver.active ? "Pause" : "Resume"}
          </SubmitButton>
        </form>
      </div>

      <section>
        <h2 className="section-title">Ride requests near you</h2>
        {invites.length ? (
          <ul className="space-y-3">
            {invites.map(({ invite, request, passenger }) => (
              <li key={invite.id} className="card space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {firstName(passenger.name)}
                      {request.partySize > 1 && (
                        <span className="font-normal text-black/60"> +{request.partySize - 1}</span>
                      )}
                    </p>
                    <p className="text-sm">
                      <CampusLine campus={request.campus} date={request.serviceDate} />
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
                    {formatMiles(invite.distanceMiles)} away
                  </span>
                </div>
                <p className="text-sm text-black/70">📍 {request.address}</p>
                {request.notes && <p className="text-sm italic text-black/60">“{request.notes}”</p>}
                <div className="flex gap-2">
                  <form action={acceptInviteAction} className="flex-1">
                    <input type="hidden" name="inviteId" value={invite.id} />
                    <input type="hidden" name="serviceDate" value={request.serviceDate} />
                    <SubmitButton className="btn-primary w-full" pendingText="Accepting…">
                      Accept
                    </SubmitButton>
                  </form>
                  <form action={declineInviteAction}>
                    <input type="hidden" name="inviteId" value={invite.id} />
                    <SubmitButton className="btn-outline" pendingText="…">
                      Can&apos;t this time
                    </SubmitButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>
            No requests right now. We&apos;ll email you when someone near you needs a ride to {campus.name}.
          </EmptyState>
        )}
      </section>

      <section>
        <h2 className="section-title">Your upcoming trips</h2>
        {trips.length ? (
          <ul className="space-y-2">
            {trips.map((t) => (
              <li key={`${t.serviceDate}-${t.campus}`}>
                <Link
                  href={tripHref(user.id, t.serviceDate)}
                  className="card-soft flex items-center justify-between text-sm hover:border-ink/60"
                >
                  <CampusLine campus={t.campus} date={t.serviceDate} />
                  <span className="text-xs text-black/60">
                    {t.people} {Number(t.people) === 1 ? "passenger" : "passengers"} →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>No passengers yet.</EmptyState>
        )}
      </section>

      <Link href="/drive?edit=1" className="btn-ghost w-full">
        Edit driver info
      </Link>
    </div>
  );
}
