"use client";

import { useActionState } from "react";
import { createUserAction } from "@/app/actions";

export function NewUserForm() {
  const [state, formAction, pending] = useActionState(createUserAction, { error: null });

  return (
    <form action={formAction} className="relative bg-white rounded-2xl shadow-sm p-6 space-y-4">
      {pending && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/80 backdrop-blur-sm">
          <span className="h-8 w-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-700">Creazione utente in corso...</p>
        </div>
      )}
      <fieldset disabled={pending} className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label htmlFor="username" className="text-sm font-medium block">
              Username
            </label>
            <input
              id="username"
              name="username"
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              placeholder="mario.rossi"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium block">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              placeholder="mario.rossi@example.com"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium block">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer w-fit">
          <input type="checkbox" name="isAdmin" className="accent-primary" />
          Puo&apos; essere amministratore
        </label>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          className="bg-primary hover:bg-primary-dark text-white rounded-lg px-5 py-2.5 text-sm font-semibold cursor-pointer transition-colors"
        >
          Crea utente
        </button>
        <p className="text-xs text-slate-400">
          Verra&apos; creato automaticamente anche un giocatore con lo stesso nome.
        </p>
      </fieldset>
    </form>
  );
}
