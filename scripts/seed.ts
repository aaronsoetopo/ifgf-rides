/**
 * Adds demo drivers around the Bay Area so matching can be tried locally.
 * Run with: npm run db:seed   (safe to re-run; it only touches @example.com users)
 */
import { like } from "drizzle-orm";
import { db, drivers, users } from "../src/lib/db";

const demoDrivers = [
  { name: "Grace Tanoto", phone: "+15105550101", campus: "pinole", address: "Downtown Berkeley", lat: 37.8716, lng: -122.2727, seats: 3, car: "White Toyota Sienna" },
  { name: "Daniel Wijaya", phone: "+15105550102", campus: "pinole", address: "El Cerrito", lat: 37.9158, lng: -122.3108, seats: 4, car: "Gray Honda Pilot" },
  { name: "Michelle Halim", phone: "+19255550103", campus: "tri-valley", address: "Pleasant Hill", lat: 37.948, lng: -122.0608, seats: 3, car: "Blue Subaru Outback" },
  { name: "Kevin Santoso", phone: "+19255550104", campus: "tri-valley", address: "Dublin", lat: 37.7022, lng: -121.9358, seats: 2, car: "Black Tesla Model 3" },
  { name: "Stephanie Lim", phone: "+14085550105", campus: "south-bay", address: "Downtown San Jose", lat: 37.3382, lng: -121.8863, seats: 4, car: "Red Mazda CX-5" },
  { name: "Jonathan Gunawan", phone: "+14155550106", campus: "south-bay", address: "Daly City", lat: 37.6879, lng: -122.4702, seats: 3, car: "Silver Toyota Camry", maxPickupMiles: 30 },
];

async function main() {
  await db.delete(users).where(like(users.email, "%@example.com"));
  for (const d of demoDrivers) {
    const email = `${d.name.split(" ")[0].toLowerCase()}@example.com`;
    const [user] = await db.insert(users).values({ email, name: d.name, phone: d.phone }).returning();
    await db.insert(drivers).values({
      userId: user.id,
      campus: d.campus,
      address: d.address,
      lat: d.lat,
      lng: d.lng,
      seats: d.seats,
      car: d.car,
      maxPickupMiles: d.maxPickupMiles ?? 15,
    });
    console.log(`  driver: ${d.name} <${email}> → ${d.campus}`);
  }
  console.log(`Seeded ${demoDrivers.length} demo drivers. Sign in with the dev login as any of those emails.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
