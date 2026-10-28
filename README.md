# IFGF Rides

Carpool app for IFGF Bay Area: people who need a ride to Sunday service are matched with
church members driving from nearby. See [ROADMAP.md](ROADMAP.md) for the plan.

## Run it locally

```bash
npm install
cp .env.example .env.local     # then set AUTH_SECRET (npx auth secret)
npm run db:migrate             # create tables in local.db
npm run db:seed                # optional: 6 demo drivers around the Bay Area
npm run dev                    # http://localhost:3000
```

Without Google keys, the sign-in page shows a **dev login**: type any email to sign in as that
person. Demo drivers: `grace@example.com`, `daniel@example.com` (Pinole), `michelle@example.com`,
`kevin@example.com` (Tri-Valley), `stephanie@example.com`, `jonathan@example.com` (South Bay).
Emails are printed to the terminal instead of being sent. Delete `local.db` to start over.

**Try it:** sign in as a new passenger → *Get a ride* → Pinole + "UC Berkeley" → sign out →
sign in as `grace@example.com` → *Drive* → Accept → see the trip page.

## How matching works (`src/lib/matching.ts`)

1. A new request goes to the **3 nearest** active drivers for that campus who are within their
   max pickup distance and have enough free seats that Sunday.
2. The **first to accept** gets the passenger (an atomic `open → matched` update, so two drivers
   can't both win). Other invites close. Both sides get an email + in-app notification with
   each other's contact info.
3. If all invited drivers decline, it goes to the next 3. If nobody is left, coordinators
   (`ADMIN_EMAILS`) get an email and can assign a driver from `/admin`.
4. New or re-activated drivers are offered any open requests in their range.
5. Drivers can release a passenger (it's re-offered to others); passengers can cancel.

## Going live

Follow [SETUP.md](SETUP.md): GitHub → Turso → Gmail → Vercel → Google Cloud (Maps + sign-in).

## Changing the database

Edit `src/lib/db/schema.ts`, then run `npm run db:generate` and commit the new file in `drizzle/`.
`npm run build` (which Vercel runs on every deploy) applies pending migrations before building.

## Project layout

| Path | What |
|---|---|
| `src/lib/campuses.ts` | Campus names, times, addresses; Sunday date helpers |
| `src/lib/places.ts` | Quick-pick pickup spots, distance calculation |
| `src/lib/matching.ts` | Matching engine |
| `src/lib/notify.ts`, `email.ts` | In-app notifications + email |
| `src/lib/db/schema.ts` | Tables: users, drivers, ride_requests, ride_invites, notifications |
| `src/app/actions.ts` | All form submissions (server actions) |
| `src/app/ride`, `rides/[id]` | Passenger: request form, request status |
| `src/app/drive` | Driver: setup, incoming requests, upcoming trips |
| `src/app/trip/[driverId]/[date]` | Everyone in one car: contacts, group text, route |
| `src/app/admin` | Coordinator dashboard |
