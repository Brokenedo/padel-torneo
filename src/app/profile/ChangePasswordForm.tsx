"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePasswordAction } from "@/app/actions";

const initialState = { error: null, success: false };

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changePasswordAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success && formRef.current) {
      formRef.current.reset();
      alert("Password modificata con successo.");
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="bg-white rounded-2xl shadow-sm p-6 space-y-4 max-w-md">
      <h2 className="text-xl font-bold text-slate-900 mb-2">Cambia Password</h2>

      {state.error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium">
          {state.error}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="currentPassword" className="text-sm font-medium block">
          Password Attuale
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          className="border border-slate-200 rounded-lg px-3 py-2 w-full text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="newPassword" className="text-sm font-medium block">
          Nuova Password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          className="border border-slate-200 rounded-lg px-3 py-2 w-full text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="confirmPassword" className="text-sm font-medium block">
          Conferma Nuova Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          className="border border-slate-200 rounded-lg px-3 py-2 w-full text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-primary hover:bg-primary-dark text-white rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer transition-colors disabled:opacity-50 mt-4"
      >
        {isPending ? "Salvataggio in corso..." : "Aggiorna Password"}
      </button>
    </form>
  );
}
