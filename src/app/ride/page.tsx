import { desc, eq } from "drizzle-orm";
import { db, rideRequests } from "@/lib/db";
import { CAMPUSES, formatServiceDate, upcomingSundays } from "@/lib/campuses";
import { requireProfile } from "@/lib/session";
import { Flash, PageTitle } from "@/components/ui";
import { RideRequestForm } from "./request-form";

export const metadata = { title: "Get a ride" };

export default async function RidePage({ searchParams }: PageProps<"/ride">) {
  const user = await requireProfile("/ride");
  // Pre-fill with the passenger's last request, since most people ride from the same place every week.
  const last = await db.query.rideRequests.findFirst({
    where: eq(rideRequests.passengerId, user.id),
    orderBy: desc(rideRequests.createdAt),
  });

  return (
    <div>
      <Flash searchParams={searchParams} />
      <PageTitle sub="Tell us where you are. We'll send your request to the closest drivers going to your campus.">
        Get a ride
      </PageTitle>
      <RideRequestForm
        campuses={CAMPUSES}
        sundays={upcomingSundays(4).map((d) => ({ value: d, label: formatServiceDate(d, { long: true }) }))}
        last={last ? { campus: last.campus, address: last.address, lat: last.lat, lng: last.lng } : null}
      />
    </div>
  );
}
