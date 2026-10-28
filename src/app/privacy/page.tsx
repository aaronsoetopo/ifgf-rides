import type { ReactNode } from "react";
import { PageTitle } from "@/components/ui";

export const metadata = { title: "Privacy policy" };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-semibold">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-black/75">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  const contact = process.env.CONTACT_EMAIL;

  return (
    <article className="space-y-6">
      <PageTitle sub="Last updated October 28, 2026">Privacy policy</PageTitle>

      <p className="text-sm leading-relaxed text-black/75">
        IFGF Rides is a volunteer carpool tool for members and guests of IFGF Bay Area (Tri-Valley, Pinole and
        South Bay campuses). It helps people who need a ride to Sunday service connect with church members who are
        driving. This page explains what information the app keeps and who can see it.
      </p>

      <Section title="What we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <b>From Google sign-in:</b> your name and email address. We don&apos;t receive your Google password or
            access anything else in your Google account.
          </li>
          <li>
            <b>Your phone number</b>, which you enter so your driver or passengers can reach you.
          </li>
          <li>
            <b>Passengers:</b> your pickup location, the campus and Sunday you need a ride for, how many people, and
            any note you write.
          </li>
          <li>
            <b>Drivers:</b> the area you drive from, your campus, number of seats, how far you&apos;re willing to go
            for a pickup, and (optionally) your car description.
          </li>
          <li>
            <b>App activity:</b> ride requests, which drivers accepted or declined, and notifications sent to you.
          </li>
        </ul>
      </Section>

      <Section title="Who can see it">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <b>Drivers we send your request to</b> see your first name, pickup location, campus, date and note. They
            do not see your phone number unless they accept.
          </li>
          <li>
            <b>Once a ride is matched</b>, the driver and everyone riding in that car see each other&apos;s name,
            phone number and pickup location, so you can coordinate.
          </li>
          <li>
            <b>A driver&apos;s home location is never shown</b> to passengers. It&apos;s only used to measure distance
            to pickups.
          </li>
          <li>
            <b>Church ride coordinators</b> can see ride requests, drivers and contact details so they can help when
            a request isn&apos;t matched.
          </li>
        </ul>
        <p>We don&apos;t sell your information or use it for advertising.</p>
      </Section>

      <Section title="Services we use">
        <p>
          The app is hosted on Vercel and stores its data with Turso. Address search uses Google Maps Platform, whose
          use is covered by{" "}
          <a href="https://policies.google.com/privacy" className="underline" target="_blank" rel="noreferrer">
            Google&apos;s privacy policy
          </a>
          . Ride notifications may be sent to your email address.
        </p>
      </Section>

      <Section title="Keeping and deleting your information">
        <p>
          We keep your information while you use the app so that rides keep working week to week. You can change
          your name and phone number on your profile, pause driving at any time, and cancel ride requests.
        </p>
        <p>
          To have your account and data deleted,{" "}
          {contact ? (
            <>
              email{" "}
              <a href={`mailto:${contact}`} className="underline">
                {contact}
              </a>
            </>
          ) : (
            "contact a ride coordinator at your campus"
          )}
          .
        </p>
      </Section>

      <Section title="Changes">
        <p>If we change how information is used, we&apos;ll update this page and the date at the top.</p>
      </Section>
    </article>
  );
}
