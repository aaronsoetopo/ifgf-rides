"use client";

import { useActionState } from "react";
import { createRideRequest } from "@/app/actions";
import type { Campus } from "@/lib/campuses";
import type { PickedPlace } from "@/lib/places";
import { PlacePicker } from "@/components/place-picker";
import { FormError, SubmitButton } from "@/components/submit-button";

export function CampusChooser({ campuses, defaultValue }: { campuses: Campus[]; defaultValue?: string }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {campuses.map((c) => (
        <label
          key={c.id}
          className="cursor-pointer rounded-lg border border-black/15 bg-white p-3 has-[:checked]:border-ink has-[:checked]:ring-2 has-[:checked]:ring-ink/10"
        >
          <input
            type="radio"
            name="campus"
            value={c.id}
            defaultChecked={c.id === defaultValue}
            required
            className="sr-only"
          />
          <span className="block text-sm font-medium">{c.name}</span>
          <span className="block text-xs text-black/60">
            {c.region} · {c.time}
          </span>
        </label>
      ))}
    </div>
  );
}

export function RideRequestForm({
  campuses,
  sundays,
  last,
}: {
  campuses: Campus[];
  sundays: { value: string; label: string }[];
  last: (PickedPlace & { campus: string }) | null;
}) {
  const [state, action] = useActionState(createRideRequest, undefined);

  return (
    <form action={action} className="space-y-6">
      <fieldset>
        <legend className="label">Which campus?</legend>
        <CampusChooser campuses={campuses} defaultValue={last?.campus} />
      </fieldset>

      <div>
        <label className="label" htmlFor="serviceDate">
          Which Sunday?
        </label>
        <select id="serviceDate" name="serviceDate" className="input" defaultValue={sundays[0]?.value}>
          {sundays.map((s, i) => (
            <option key={s.value} value={s.value}>
              {s.label}
              {i === 0 ? " (this Sunday)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className="label">Where should we pick you up?</p>
        <PlacePicker defaultValue={last} placeholder="Your dorm, apartment, or a nearby spot" />
        <p className="hint">Only drivers we send your request to will see this.</p>
      </div>

      <div className="grid grid-cols-[auto_1fr] items-start gap-4">
        <div>
          <label className="label" htmlFor="partySize">
            People
          </label>
          <select id="partySize" name="partySize" className="input w-24" defaultValue="1">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="notes">
            Note for the driver <span className="font-normal text-black/50">(optional)</span>
          </label>
          <input
            id="notes"
            name="notes"
            maxLength={300}
            className="input"
            placeholder="e.g. I'll wait at the front entrance"
          />
        </div>
      </div>

      <FormError error={state?.error} />
      <SubmitButton className="btn-primary w-full py-3" pendingText="Finding drivers…">
        Request a ride
      </SubmitButton>
    </form>
  );
}
