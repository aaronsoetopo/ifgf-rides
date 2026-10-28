import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, gte, ne } from "drizzle-orm";
import { db, drivers, rideRequests, users } from "@/lib/db";
import { todayPacific } from "@/lib/campuses";
import { firstName } from "@/lib/phone";
import { getCurrentUser } from "@/lib/session";
import { pendingInvitesFor, tripHref, upcomingTripsFor } from "@/lib/matching";
import { CampusCards, CampusLine, Flash, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icon";

export default async function Home({ searchParams }: PageProps<"/">) {
  const user = await getCurrentUser();
  // New sign-ins land here: finish the profile (full name + phone) before anything else.
  if (user && !user.phone) redirect("/profile");

  return (
    <div className="space-y-8">
      <Flash searchParams={searchParams} />
      {user ? <Dashboard userId={user.id} name={user.name} /> : <Welcome />}
      <section>
        <h2 className="section-title">Sunday Services</h2>
        <CampusCards />
      </section>
      <p className="text-center text-xs text-black/50">
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy policy
        </Link>
      </p>
    </div>
  );
}

function Welcome() {
  return (
    <>
      <section className="pt-2">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight">
          Need a ride to church? <span className="handwritten-underline decoration-accent">We&apos;ve got you.</span>
        </h1>
        <p className="mt-3 text-black/70">
          IFGF Rides connects people who need a ride to Sunday service with church members driving from nearby —
          Berkeley, DVC, SF, San Jose and everywhere in between.
        </p>
      </section>
      <ActionCards signedIn={false} />
      <section className="card-soft">
        <h2 className="mb-3 font-semibold">How it works</h2>
        <ol className="space-y-2 text-sm text-black/75">
          <li>
            <b>1.</b> Sign in with Google and add your phone number.
          </li>
          <li>
            <b>2.</b> Passengers tell us where to pick them up. Drivers tell us roughly where they live.
          </li>
          <li>
            <b>3.</b> We send each request to the closest drivers heading to that campus.
          </li>
          <li>
            <b>4.</b> When a driver accepts, you both get an email with each other&apos;s contact info, and the driver
            can group-text everyone in the car.
          </li>
        </ol>
      </section>
    </>
  );
}

function ActionCards({ signedIn }: { signedIn: boolean }) {
  const href = (path: string) => (signedIn ? path : `/signin?next=${path}`);
  return (
    <div className="grid grid-cols-2 gap-3">
      <Link href={href("/ride")} className="card group flex flex-col gap-2 hover:bg-black/[0.02]">
        <Icon name="ride" className="size-7 text-accent" />
        <span className="font-semibold">I need a ride</span>
        <span className="text-xs text-black/60">Get matched with a driver near you</span>
      </Link>
      <Link href={href("/drive")} className="card group flex flex-col gap-2 hover:bg-black/[0.02]">
        <Icon name="drive" className="size-7 text-accent" />
        <span className="font-semibold">I can drive</span>
        <span className="text-xs text-black/60">Offer your open seats on Sunday</span>
      </Link>
    </div>
  );
}

async function Dashboard({ userId, name }: { userId: string; name: string }) {
  const today = todayPacific();
  const [myRequests, driver, invites, trips] = await Promise.all([
    db
      .select({ request: rideRequests, driver: users })
      .from(rideRequests)
      .leftJoin(users, eq(users.id, rideRequests.driverId))
      .where(
        and(
          eq(rideRequests.passengerId, userId),
          gte(rideRequests.serviceDate, today),
          ne(rideRequests.status, "cancelled"),
        ),
      )
      .orderBy(rideRequests.serviceDate, desc(rideRequests.createdAt)),
    db.query.drivers.findFirst({ where: eq(drivers.userId, userId) }),
    pendingInvitesFor(userId),
    upcomingTripsFor(userId),
  ]);

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Hi {firstName(name)} 👋</h1>

      {invites.length > 0 && (
        <Link href="/drive" className="flex items-center gap-3 rounded-xl bg-accent px-4 py-3 text-white">
          <Icon name="drive" className="size-6" />
          <span className="flex-1 font-medium">
            {invites.length} {invites.length === 1 ? "person needs" : "people need"} a ride near you
          </span>
          <span aria-hidden>→</span>
        </Link>
      )}

      <ActionCards signedIn />

      {myRequests.length > 0 && (
        <section>
          <h2 className="section-title">Your rides</h2>
          <ul className="space-y-2">
            {myRequests.map(({ request, driver: d }) => (
              <li key={request.id}>
                <Link href={`/rides/${request.id}`} className="card-soft block hover:border-ink/60">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <CampusLine campus={request.campus} date={request.serviceDate} />
                    <StatusBadge status={request.status} />
                  </div>
                  <p className="mt-1 text-xs text-black/60">
                    {d ? `Driver: ${d.name}` : `Pickup: ${request.address}`}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {driver && (
        <section>
          <h2 className="section-title">Your trips as a driver</h2>
          {trips.length ? (
            <ul className="space-y-2">
              {trips.map((t) => (
                <li key={`${t.serviceDate}-${t.campus}`}>
                  <Link
                    href={tripHref(userId, t.serviceDate)}
                    className="card-soft flex items-center justify-between text-sm hover:border-ink/60"
                  >
                    <CampusLine campus={t.campus} date={t.serviceDate} />
                    <span className="text-xs text-black/60">
                      {t.people} {Number(t.people) === 1 ? "passenger" : "passengers"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="card-soft text-sm text-black/60">
              {driver.active
                ? "No passengers yet. We'll email you when someone nearby needs a ride."
                : "You're paused as a driver. Turn driving back on from the Drive tab."}
            </p>
          )}
        </section>
      )}
    </>
  );
}
