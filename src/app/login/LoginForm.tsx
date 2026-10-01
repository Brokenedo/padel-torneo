"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction } from "@/app/actions";

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [state, formAction, pending] = useActionState(loginAction, { error: null });

  return (
    <form
      action={formAction}
      className="w-full max-w-sm bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4"
    >
      <h1 className="text-xl font-semibold">Accedi</h1>
      <p className="text-sm text-slate-500">Gestionale torneo di padel</p>

      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
          placeholder="admin@padel.local"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-slate-900 text-white rounded py-2 text-sm font-medium disabled:opacity-50 cursor-pointer"
      >
        {pending ? "Accesso in corso..." : "Accedi"}
      </button>

      <p className="text-xs text-slate-400">Dev locale: admin@padel.local / padel123</p>
    </form>
  );
}
