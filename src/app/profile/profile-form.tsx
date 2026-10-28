"use client";

import { useActionState } from "react";
import { saveProfile } from "@/app/actions";
import { FormError, SubmitButton } from "@/components/submit-button";

export function ProfileForm({ name, phone, next }: { name: string; phone: string; next: string }) {
  const [state, action] = useActionState(saveProfile, undefined);
  const values = state?.values ?? { name, phone };
  return (
    <form action={action} className="card space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label" htmlFor="name">
          Full name
        </label>
        <input
          id="name"
          name="name"
          defaultValue={values.name}
          required
          className="input"
          autoComplete="name"
          placeholder="First and last name"
        />
        <p className="hint">So your driver or passengers know who to look for.</p>
      </div>
      <div>
        <label className="label" htmlFor="phone">
          Mobile phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={values.phone}
          required
          className="input"
          placeholder="(510) 555-1234"
          autoComplete="tel"
        />
      </div>
      <FormError error={state?.error} />
      <SubmitButton className="btn-primary w-full">Save</SubmitButton>
    </form>
  );
}
