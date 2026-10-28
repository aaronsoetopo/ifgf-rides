"use client";

import { useActionState } from "react";
import { saveDriver } from "@/app/actions";
import type { Campus } from "@/lib/campuses";
import type { PickedPlace } from "@/lib/places";
import { PlacePicker } from "@/components/place-picker";
import { FormError, SubmitButton } from "@/components/submit-button";
import { CampusChooser } from "@/app/ride/request-form";

type DriverValues = PickedPlace & {
  campus: string;
  seats: number;
  car: string | null;
  maxPickupMiles: number;
};

export function DriverForm({ campuses, driver }: { campuses: Campus[]; driver: DriverValues | null | undefined }) {
  const [state, action] = useActionState(saveDriver, undefined);

  return (
    <form action={action} className="space-y-6">
      <fieldset>
        <legend className="label">Which campus do you drive to?</legend>
        <CampusChooser campuses={campuses} defaultValue={driver?.campus} />
      </fieldset>

      <div>
        <p className="label">Where do you usually drive from?</p>
        <PlacePicker
          defaultValue={driver}
          showQuickSpots={false}
          placeholder="Your home address or a nearby intersection"
        />
        <p className="hint">
          Used only to find passengers near you. It&apos;s never shown to anyone — a cross street works fine.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="seats">
            Open seats
          </label>
          <select id="seats" name="seats" className="input" defaultValue={driver?.seats ?? 3}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="maxPickupMiles">
            Max pickup distance
          </label>
          <select
            id="maxPickupMiles"
            name="maxPickupMiles"
            className="input"
            defaultValue={driver?.maxPickupMiles ?? 15}
          >
            {[5, 10, 15, 20, 30, 45].map((n) => (
              <option key={n} value={n}>
                {n} miles
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="car">
          Your car <span className="font-normal text-black/50">(optional)</span>
        </label>
        <input
          id="car"
          name="car"
          maxLength={80}
          defaultValue={driver?.car ?? ""}
          className="input"
          placeholder="e.g. Silver Honda Odyssey"
        />
        <p className="hint">Helps passengers spot you at pickup.</p>
      </div>

      <FormError error={state?.error} />
      <SubmitButton className="btn-primary w-full py-3">{driver ? "Save changes" : "Start driving"}</SubmitButton>
    </form>
  );
}
