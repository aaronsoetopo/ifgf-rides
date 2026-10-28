# IFGF Rides — Roadmap

A mobile-friendly web app that connects IFGF members who need a ride to Sunday service
with drivers who live nearby and are heading to the same campus.

## Campuses

| Campus | Service | Location |
|---|---|---|
| Tri-Valley (San Ramon) | 10:30 AM | Bollinger Canyon Elementary, 2300 Talavera Dr, San Ramon, CA 94583 |
| Pinole (East Bay) | 2:15 PM | Pinole Valley Community Church, 2885 Pinole Valley Road, Pinole, CA 94565 |
| South Bay (Sunnyvale) | 2:30 PM | Sunnyvale Senior Center, 550 E Remington Drive, Sunnyvale, CA 94087 |

> Note: the website graphic says "CA 9408" for South Bay — the real ZIP is 94087.

## How it works

1. **Sign in with Google** and add a phone number (shared only with the people you ride with).
2. **Drivers** register once: home area, home campus, number of open seats, car description,
   and how far they're willing to go for a pickup. Their exact address is never shown to anyone.
3. **Passengers** submit a request: which campus, which Sunday, and pickup spot
   (Google Maps address search, or quick picks like UC Berkeley, DVC, Richmond BART, SJSU).
4. **Matching**: the app finds active drivers for that campus, ranks them by distance from the
   pickup spot, and sends the request to the closest few (by default within 15 mi).
5. **First driver to accept gets the ride.** Both people are notified (email + in-app) with
   each other's name, phone, pickup spot, and service time. Other drivers' invites close.
6. If every invited driver declines, the request automatically moves to the next-closest drivers.
   If nobody is in range, it stays open and gets offered to new drivers as they sign up.
7. **Trip page** (per driver, per Sunday): every passenger in the car with tap-to-call,
   tap-to-text, a **"Group text everyone"** button, and a Google Maps directions link.
8. **Coordinators** (admins) see all open requests and drivers per campus/Sunday and can
   step in when something isn't getting matched.

## Tech stack

| Piece | Choice | Why |
|---|---|---|
| App | Next.js 16 (React, TypeScript), Tailwind CSS | One codebase, works on any phone, easy to deploy |
| Sign-in | Auth.js (Google provider) | One-tap sign-in, no passwords |
| Database | SQLite locally → Turso (hosted SQLite) in production, via Drizzle ORM | Same code in dev and prod, generous free tier |
| Maps | Google Maps Places Autocomplete | Accurate pickup addresses + coordinates |
| Distance | Straight-line (haversine) ranking for v1 → Google Routes API drive-time in v2 | Free and instant for v1 |
| Email | Nodemailer over SMTP (e.g. a church Gmail with an app password) | Free, sends to anyone |
| Hosting | Vercel | Free tier, deploys from GitHub |

## Phases

### Phase 0 — Accounts & keys (you, ~1 hour)
- [ ] Google Cloud project → OAuth client ID/secret (for sign-in)
- [ ] Google Cloud → Maps JavaScript API + Places API key (restricted to the app's domain)
- [ ] Turso database (free) → URL + auth token
- [ ] Gmail account for sending (e.g. ifgfrides@gmail.com) → app password
- [ ] Vercel account + GitHub repo

The app runs locally **without any of these** (dev login + preset pickup spots + emails
printed to the console), so building and testing isn't blocked on them.

### Phase 1 — MVP ✅ built (tested locally with dev login; Google sign-in/Maps/email need keys from Phase 0)
- [x] Project scaffold, campus data, database schema
- [x] Sign-in (Google; dev login locally) + profile with phone number
- [x] Driver registration / edit / pause
- [x] Ride request form with Google Places search + quick-pick spots + "use my location"
- [x] Matching engine: rank nearest drivers, invite, first-accept-wins, auto-expand on decline
- [x] Driver inbox: accept / decline invites
- [x] Notifications: in-app inbox + email
- [x] Trip page: passengers, call/text, group text, directions
- [x] Coordinator dashboard (admins set by email address)

### Phase 2 — Pilot launch
- [ ] Deploy to Vercel with real keys
- [ ] Pilot with one campus for 2–3 Sundays, gather feedback
- [ ] Announce at service / in group chats with a QR code to the app

### Phase 3 — Improvements (pick based on pilot feedback)
- [ ] Map view of drivers/passengers for coordinators
- [ ] Rank by real drive time (Google Routes API) instead of straight-line distance
- [ ] "Every Sunday" recurring requests so regulars don't re-submit weekly
- [ ] Saturday-evening reminder emails (Vercel Cron)
- [ ] Ride home after service
- [ ] Browser push notifications / SMS (Twilio) if email isn't seen fast enough
- [ ] Driver approval by a coordinator before they can receive requests (see below)

## Decisions to make before launch
- **Driver vetting**: should a coordinator approve drivers before they can receive requests?
  (Recommended for church liability; easy to switch on.)
- **Minors**: can under-18 passengers request rides on their own?
- **Request deadline**: e.g. requests close Saturday 8 PM so drivers can plan.
