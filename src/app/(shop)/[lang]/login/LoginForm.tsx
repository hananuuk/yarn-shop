"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "../actions";

type T = {
  phone: string; phonePh: string; sendCode: string; code: string; verify: string; changePhone: string; resend: string;
  sentTpl: string; devTpl: string; errors: Record<string, string>;
};

export function LoginForm({ lang, next, t }: { lang: string; next: string; t: T }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, { step: "phone", phone: "" });

  return (
    <form action={action} className="mt-8 flex flex-col gap-5">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="next" value={next} />

      {state.step === "phone" ? (
        <>
          <label className="label">
            {t.phone}
            <div className="flex items-center gap-2">
              <span className="text-[15px] text-muted">+976</span>
              <input name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" required maxLength={12} defaultValue={state.phone} placeholder={t.phonePh} className="field text-lg tracking-wider" autoFocus />
            </div>
          </label>
          <button name="intent" value="send" className="btn" disabled={pending}>{pending ? "…" : t.sendCode}</button>
        </>
      ) : (
        <>
          <p className="text-[15px]">{t.sentTpl.replace("{p}", state.phone)}</p>
          {state.devCode && (
            <p className="rounded-xl bg-cream p-4 text-sm font-semibold" role="status">{t.devTpl.replace("{c}", state.devCode)}</p>
          )}
          <label className="label">
            {t.code}
            <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="\d{6}" required className="field text-center text-2xl tracking-[0.5em]" autoFocus />
          </label>
          <button name="intent" value="verify" className="btn" disabled={pending}>{pending ? "…" : t.verify}</button>
          <div className="flex flex-wrap justify-between gap-2">
            <button name="intent" value="change" formNoValidate className="btn-ghost">{t.changePhone}</button>
            <button name="intent" value="resend" formNoValidate className="btn-ghost">{t.resend}</button>
          </div>
        </>
      )}

      {state.error && <p className="text-sm font-semibold text-accent" role="alert">{t.errors[state.error] ?? state.error}</p>}
    </form>
  );
}
