import Link from "next/link";
import { redirect } from "next/navigation";
import { devLoginEnabled, googleEnabled } from "@/auth";
import { devSignIn, signInWithGoogle } from "@/app/actions";
import { getCurrentUser } from "@/lib/session";
import { PageTitle } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/signin">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : "/";
  if (await getCurrentUser()) redirect(next);

  return (
    <div className="mx-auto max-w-sm">
      <PageTitle sub="Sign in to request a ride or offer one.">Welcome to IFGF Rides</PageTitle>

      {googleEnabled && (
        <form action={signInWithGoogle}>
          <input type="hidden" name="next" value={next} />
          <SubmitButton className="btn-outline w-full py-3" pendingText="Redirecting…">
            <GoogleLogo /> Continue with Google
          </SubmitButton>
        </form>
      )}

      {devLoginEnabled && (
        <form action={devSignIn} className="card-soft mt-6 space-y-3 border-dashed">
          <div>
            <p className="font-medium">Dev login</p>
            <p className="hint">
              Local testing only — sign in as anyone without Google. Hidden in production.
            </p>
          </div>
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" name="email" type="email" required className="input" placeholder="you@example.com" />
          </div>
          <div>
            <label className="label" htmlFor="name">
              Name
            </label>
            <input id="name" name="name" className="input" placeholder="Your name" />
          </div>
          <SubmitButton className="btn-primary w-full" pendingText="Signing in…">
            Sign in
          </SubmitButton>
        </form>
      )}

      <p className="mt-6 text-center text-xs text-black/50">
        By signing in you agree to how we use your information in our{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          privacy policy
        </Link>
        .
      </p>

      {!googleEnabled && !devLoginEnabled && (
        <p className="text-sm text-red-700">Sign-in isn&apos;t configured yet. Set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET.</p>
      )}
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
