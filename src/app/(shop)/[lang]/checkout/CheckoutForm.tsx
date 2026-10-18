"use client";

import { useActionState } from "react";
import { checkoutAction, type CheckoutState } from "../actions";

type T = {
  contact: string; name: string; phone: string; address: string; district: string; choose: string; khoroo: string;
  addressLine: string; note: string; notePh: string; pay: string; errors: Record<string, string>;
};

export function CheckoutForm(props: {
  lang: string;
  defaults: { name: string; phone: string; district: string; khoroo: string; address: string };
  districts: { id: string; label: string }[];
  t: T;
}) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(checkoutAction, {});
  const { t, defaults } = props;
  return (
    <form action={action} className="flex flex-col gap-8">
      <input type="hidden" name="lang" value={props.lang} />
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-lg font-semibold">{t.contact}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="label">{t.name}<input name="name" required autoComplete="name" defaultValue={defaults.name} className="field" /></label>
          <label className="label">{t.phone}<input name="phone" type="tel" inputMode="numeric" required autoComplete="tel-national" defaultValue={defaults.phone} className="field" /></label>
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-lg font-semibold">{t.address}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="label">{t.district}
            <select name="district" required defaultValue={defaults.district} className="field">
              <option value="" disabled>{t.choose}</option>
              {props.districts.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </label>
          <label className="label">{t.khoroo}<input name="khoroo" defaultValue={defaults.khoroo} className="field" /></label>
        </div>
        <label className="label">{t.addressLine}<textarea name="address" required rows={2} autoComplete="street-address" defaultValue={defaults.address} className="field py-2" /></label>
        <label className="label">{t.note}<input name="note" placeholder={t.notePh} className="field" /></label>
      </fieldset>
      {state.error && <p className="text-sm font-semibold text-accent" role="alert">{t.errors[state.error]}</p>}
      <button className="btn self-start px-10" disabled={pending}>{pending ? "…" : t.pay}</button>
    </form>
  );
}
