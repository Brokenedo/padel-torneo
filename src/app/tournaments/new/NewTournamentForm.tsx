"use client";

import { useState } from "react";
import { createTournamentAction } from "@/app/actions";
import { Player } from "@/lib/types";

export function NewTournamentForm({ players }: { players: Player[] }) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 7 ? [...prev, id] : prev
    );
  }

  return (
    <form action={createTournamentAction} className="space-y-6">
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium block">
          Nome torneo
        </label>
        <input
          id="name"
          name="name"
          required
          className="w-full max-w-sm border border-slate-300 rounded px-3 py-2 text-sm"
          placeholder="Torneo padel autunno 2026"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="startDate" className="text-sm font-medium block">
          Data di inizio (turno 1)
        </label>
        <input
          id="startDate"
          name="startDate"
          type="date"
          required
          className="border border-slate-300 rounded px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">
          Seleziona esattamente 7 giocatori ({selected.length}/7)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {players.map((p) => {
            const checked = selected.includes(p.id);
            return (
              <label
                key={p.id}
                className={`border rounded px-3 py-2 text-sm flex items-center gap-2 cursor-pointer ${
                  checked ? "border-slate-900 bg-slate-100" : "border-slate-200"
                }`}
              >
                <input
                  type="checkbox"
                  name="playerIds"
                  value={p.id}
                  checked={checked}
                  onChange={() => toggle(p.id)}
                  className="accent-slate-900"
                />
                {p.name}
              </label>
            );
          })}
        </div>
      </div>

      <button
        type="submit"
        disabled={selected.length !== 7}
        className="bg-slate-900 text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50 cursor-pointer"
      >
        Crea torneo e assegna i numeri a sorteggio
      </button>
    </form>
  );
}
