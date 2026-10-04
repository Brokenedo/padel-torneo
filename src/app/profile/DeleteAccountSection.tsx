"use client";

import { useState, useTransition } from "react";
import { deleteOwnAccountAction } from "@/app/actions";

export function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteOwnAccountAction(password);
      // In caso di successo il server effettua signOut + redirect a /login.
      if (result?.error) {
        alert(result.error);
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4 max-w-md border border-red-100">
      <h2 className="text-xl font-bold text-red-600">Elimina account</h2>
      <p className="text-sm text-slate-600">
        L&apos;eliminazione è definitiva: verranno rimossi il tuo account e il giocatore collegato.
        Non è possibile eliminarlo se stai partecipando a un torneo in corso.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full border border-red-300 text-red-600 hover:bg-red-50 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer transition-colors"
        >
          Elimina il mio account
        </button>
      ) : (
        <div className="space-y-3">
          <label htmlFor="deletePassword" className="text-sm font-medium block">
            Conferma con la tua password
          </label>
          <input
            id="deletePassword"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 w-full text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending || !password}
              onClick={() => {
                if (confirm("Sei sicuro di voler eliminare definitivamente il tuo account?")) {
                  handleDelete();
                }
              }}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer transition-colors disabled:opacity-50"
            >
              {isPending ? "Eliminazione..." : "Conferma eliminazione"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setOpen(false);
                setPassword("");
              }}
              className="flex-1 border border-slate-200 text-slate-600 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer"
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
