import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, drivers, rideRequests, users } from "@/lib/db";
import { directionsUrl, formatServiceDate, getCampus } from "@/lib/campuses";
import { distanceMiles } from "@/lib/places";
import { firstName, formatPhone } from "@/lib/phone";
import { isAdmin, requireProfile } from "@/lib/session";
import { releasePassengerAction } from "@/app/actions";
import { Flash, PageTitle } from "@/components/ui";
import { ContactButtons, GroupText } from "@/components/contact";
import { SubmitButton } from "@/components/submit-button";
import { Icon } from "@/components/icon";

export const metadata = { title: "Trip" };

/** Everyone riding with one driver on one Sunday. Visible to the driver, their passengers, and coordinators. */
export default async function TripPage({ params, searchParams }: PageProps<"/trip/[driverId]/[date]">) {
  const { driverId, date } = await params;
  const user = await requireProfile(`/trip/${driverId}/${date}`);

  const [driverUser, driver, riders] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, driverId) }),
    db.query.drivers.findFirst({ where: eq(drivers.userId, driverId) }),
    db
      .select({ request: rideRequests, passenger: users })
      .from(rideRequests)
      .innerJoin(users, eq(users.id, rideRequests.passengerId))
      .where(
        and(
          eq(rideRequests.driverId, driverId),
          eq(rideRequests.serviceDate, date),
          eq(rideRequests.status, "matched"),
        ),
      ),
  ]);
  if (!driverUser || !driver) notFound();

  const isDriver = user.id === driverId;
  const isRider = riders.some((r) => r.passenger.id === user.id);
  if (!isDriver && !isRider && !isAdmin(user)) notFound();

  // Order pickups nearest-to-home first, which is usually a sensible route.
  riders.sort((a, b) => distanceMiles(driver, a.request) - distanceMiles(driver, b.request));
  const campus = getCampus(riders[0]?.request.campus ?? driver.campus);
  const people = riders.reduce((n, r) => n + r.request.partySize, 0);

  const everyone = [driverUser, ...riders.map((r) => r.passenger)];
  const otherPhones = everyone.filter((p) => p.id !== user.id && p.phone).map((p) => p.phone!);
  const groupMessage =
    `Hi all! This is our IFGF carpool to ${campus.name} on ${formatServiceDate(date)} (service at ${campus.time}). ` +
    `Driver: ${firstName(driverUser.name)}. Riders: ${riders.map((r) => firstName(r.passenger.name)).join(", ")}.`;

  return (
    <div className="space-y-5">
      <Flash searchParams={searchParams} />
      <PageTitle sub={`${formatServiceDate(date, { long: true })} · service at ${campus.time}`}>
        Carpool to {campus.name}
      </PageTitle>

      {riders.length === 0 ? (
        <p className="card-soft text-sm text-black/60">No passengers on this trip anymore.</p>
      ) : (
        <>
          {otherPhones.length > 1 && <GroupText phones={otherPhones} message={groupMessage} />}

          <section className="card space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-black/50">Driver</p>
            <p className="font-semibold">
              {driverUser.name} {isDriver && <span className="font-normal text-black/50">(you)</span>}
            </p>
            <p className="text-sm text-black/70">
              {formatPhone(driverUser.phone)}
              {driver.car && ` · ${driver.car}`}
            </p>
            {!isDriver && driverUser.phone && (
              <div className="pt-2">
                <ContactButtons phone={driverUser.phone} name={driverUser.name} />
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="section-title mb-0">
              Passengers <span className="font-normal text-black/50">({people} of {driver.seats} seats)</span>
            </h2>
            {riders.map(({ request, passenger }, i) => (
              <div key={request.id} className="card-soft space-y-2">
                <div className="flex items-start gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-xs font-semibold text-white">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold">
                      {passenger.name}
                      {request.partySize > 1 && (
                        <span className="font-normal text-black/60"> +{request.partySize - 1}</span>
                      )}
                      {passenger.id === user.id && <span className="font-normal text-black/50"> (you)</span>}
                    </p>
                    <p className="text-sm text-black/70">{formatPhone(passenger.phone)}</p>
                    <p className="text-sm">📍 {request.address}</p>
                    {request.notes && <p className="text-sm italic text-black/60">“{request.notes}”</p>}
                  </div>
                </div>
                {passenger.id !== user.id && passenger.phone && (
                  <ContactButtons phone={passenger.phone} name={passenger.name} />
                )}
                {isDriver && (
                  <form action={releasePassengerAction}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <SubmitButton className="btn-ghost w-full py-1.5 text-xs text-red-700" pendingText="Releasing…">
                      I can&apos;t take {firstName(passenger.name)} anymore — find them another driver
                    </SubmitButton>
                  </form>
                )}
              </div>
            ))}
          </section>

          <a
            href={directionsUrl(
              campus.address,
              isDriver ? riders.map((r) => `${r.request.lat},${r.request.lng}`) : [],
            )}
            target="_blank"
            rel="noreferrer"
            className="btn-primary w-full py-3"
          >
            <Icon name="map" />
            {isDriver ? "Route: all pickups → church" : "Directions to church"}
          </a>
          <p className="text-center text-xs text-black/50">
            {campus.venue}, {campus.address}
          </p>
        </>
      )}
    </div>
  );
}
