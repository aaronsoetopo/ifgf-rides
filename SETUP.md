# Going live: step-by-step setup

About 1 hour total. Do the parts in order. Every value you collect goes into **two places**:

- `.env.local` in this folder: makes it work on your computer (open it in VS Code / Notepad).
- **Vercel → your project → Settings → Environment Variables**: makes it work on the live site.

> Keep secrets (Google client secret, Turso token, Gmail app password) out of chats, screenshots and
> GitHub. `.env.local` is already excluded from git.

---

## Part 1 — GitHub (2 min)

1. Go to <https://github.com/new>.
2. **Repository name:** `ifgf-rides`. **Private**. Leave *everything else unchecked*
   (no README, no .gitignore, no license; the repo must be empty).
3. Click **Create repository**, then tell Claude "repo created". Claude pushes the code.
   The first push may open a browser window asking you to sign in to GitHub. Approve it.

---

## Part 2 — Turso database (5 min)

Turso is the online version of the database file (`local.db`) the app uses on your computer. The live
site needs a database on the internet; Turso's free plan is more than enough.

1. Go to <https://turso.tech> → **Sign up** → **Continue with GitHub**.
2. Click **Create Database**.
   - Name: `ifgf-rides`
   - Location / group: the one closest to California (e.g. *AWS US West (Oregon)* or *US West*).
3. Open the database. Copy the **URL**, which looks like `libsql://ifgf-rides-aaronsoetopo.aws-us-west-2.turso.io`.
   → this is `DATABASE_URL`
4. Click **Create Token** (or *Generate token*), choose **Read & Write**, no expiration. Copy it.
   It's shown only once. → this is `DATABASE_AUTH_TOKEN`

⚠️ Only put these two in **Vercel**, not in `.env.local`. Your computer keeps using its own
`local.db` so testing never touches real data. You don't need to create tables: every Vercel deploy
does that automatically.

---

## Part 3 — Gmail for sending emails (5 min)

1. Create a Gmail account for the app, e.g. `ifgfrides@gmail.com` (or use a church account).
2. Signed in as that account, turn on **2-Step Verification**: <https://myaccount.google.com/signinoptions/twosv>
   (required before step 3).
3. Go to <https://myaccount.google.com/apppasswords> → App name `IFGF Rides` → **Create**.
   Copy the 16-letter password (spaces don't matter).
4. Values:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=ifgfrides@gmail.com
   SMTP_PASS=<the 16-letter app password>
   EMAIL_FROM="IFGF Rides <ifgfrides@gmail.com>"
   ```
   Gmail allows ~500 emails/day, plenty for this.

---

## Part 4 — First deploy on Vercel (10 min)

1. <https://vercel.com/new> → find **ifgf-rides** under *Import Git Repository* → **Import**.
2. Leave the framework settings as detected (Next.js). Open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `AUTH_SECRET` | a long random string; get one at <https://generate-secret.vercel.app/32> |
   | `DATABASE_URL` | from Part 2 |
   | `DATABASE_AUTH_TOKEN` | from Part 2 |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | from Part 3 |
   | `ADMIN_EMAILS` | coordinator emails, comma-separated (e.g. `aaron.soetopo@gmail.com`) |

3. Click **Deploy**. When it finishes, note your site address, e.g. `https://ifgf-rides.vercel.app`.
4. Add one more variable: `APP_URL` = that address. Then **Deployments → ⋯ → Redeploy**.

The site works now, but **nobody can sign in yet**. That's Part 5.

---

## Part 5 — Google Cloud: Maps + "Sign in with Google" (20 min)

Google Cloud is Google's control panel for its developer services. You need one **project**
(a folder holding the app's keys) with two things: a **Maps API key** (address search) and an
**OAuth client** (Google sign-in).

### 5a. Create the project
1. Go to <https://console.cloud.google.com> and sign in (your own Google account is fine).
2. Top bar: click the project picker → **New project** → name `IFGF Rides` → **Create**.
   Make sure it's selected in the top bar afterwards.

### 5b. Billing (required by Google Maps, but you won't be charged at church scale)
1. ☰ menu → **Billing** → link a billing account (add a card).
2. Maps gives a large free monthly allowance per feature (thousands of address searches). This app
   only uses address search when someone types an address, so it should stay at $0.
3. Recommended: **Billing → Budgets & alerts → Create budget** of $5 with email alerts.

### 5c. Turn on the Maps APIs
1. ☰ → **APIs & Services → Library**.
2. Search **Maps JavaScript API** → **Enable**.
3. Search **Places API (New)** → **Enable**. (Note the *(New)*: the old "Places API" won't work.)

### 5d. Create the Maps key
1. ☰ → **APIs & Services → Credentials → + Create credentials → API key**. Copy it.
2. Click the key to edit it:
   - **Name:** `IFGF Rides web`
   - **Application restrictions → Websites**, add:
     - `http://localhost:3000/*`
     - `https://ifgf-rides.vercel.app/*` (your address from Part 4)
   - **API restrictions → Restrict key** → check **Maps JavaScript API** and **Places API (New)**.
   - **Save.**
3. This is `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. Put it in **both** `.env.local` and Vercel.
   (It's safe that it's visible in the browser; the website restriction above is what protects it.)

### 5e. Set up the sign-in screen
1. ☰ → **APIs & Services → OAuth consent screen** (may be called **Google Auth Platform**) → **Get started**.
2. **App name:** `IFGF Rides` · **Support email:** yours → Next.
3. **Audience:** **External** → Next. **Contact email:** yours → Next → agree → **Create**.
4. Go to **Audience** (or *Publishing status*) → **Publish app** → Confirm.
   Without this, only up to 100 manually-added "test users" can sign in. The app only asks for
   name + email, so Google doesn't require a review.

### 5f. Create the sign-in client
1. **Clients** (or *Credentials → + Create credentials → OAuth client ID*) → **Create client**.
2. **Application type:** Web application · **Name:** `IFGF Rides`.
3. **Authorized JavaScript origins:**
   - `http://localhost:3000`
   - `https://ifgf-rides.vercel.app`
4. **Authorized redirect URIs:**
   - `http://localhost:3000/api/auth/callback/google`
   - `https://ifgf-rides.vercel.app/api/auth/callback/google`
5. **Create**. Copy the **Client ID** → `AUTH_GOOGLE_ID` and **Client secret** → `AUTH_GOOGLE_SECRET`.
   Put both in `.env.local` and Vercel.

### 5g. Turn it on
- **Vercel:** after adding the three Google variables → **Deployments → ⋯ → Redeploy**.
- **Your computer:** stop and restart `npm run dev`. The sign-in page now shows
  *Continue with Google*, and the ride form has address search.

---

## Part 6 — Check it works on your phone
1. Open your Vercel address on your phone → **Continue with Google** → add your phone number.
2. *Drive* → set up as a driver (try typing your street in the search box).
3. Ask a friend to request a ride nearby → you should get an email and see it under *Drive*.
4. Share → **Add to Home Screen** so it opens like an app.

## Your `.env.local` at the end
```
AUTH_SECRET=...            (already there)
DATABASE_URL=file:local.db (leave as is)
ADMIN_EMAILS=aaron.soetopo@gmail.com
APP_URL=http://localhost:3000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
# Optional: fill in SMTP_* too if you want real emails while testing locally
```

## Troubleshooting
| Problem | Fix |
|---|---|
| Google says **redirect_uri_mismatch** | The redirect URI in 5f must match your site address exactly (https, no trailing slash). |
| Address search box says it isn't working | Check 5c (Places API **(New)** enabled), 5b (billing linked), and that your site is listed in the key's website restrictions. |
| Vercel build fails at `drizzle-kit migrate` | `DATABASE_URL` / `DATABASE_AUTH_TOKEN` missing or mistyped in Vercel. |
| No emails arrive | Check `SMTP_*` in Vercel; check the Gmail account's *Sent* folder; look in spam. |
