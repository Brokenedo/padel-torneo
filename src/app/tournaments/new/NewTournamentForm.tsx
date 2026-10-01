"use client";

import { useState } from "react";
import { createTournamentAction } from "@/app/actions";
import { Player, ScoringMode } from "@/lib/types";

const SCORING_OPTIONS: Array<{ value: ScoringMode; label: string; description: string }> = [
  {
    value: "VOLLEYBALL",
    label: "A) 2-0 / 2-1 (stile pallavolo)",
    description: "Vittoria 2-0: vincitori 3, perdenti 0 · Vittoria 2-1: vincitori 2, perdenti 1",
  },
  {
    value: "WIN_ONLY",
    label: "B) 1 punto a vittoria",
    description: "Chi vince prende 1, chi perde 0, qualunque sia il risultato",
  },
  {
    value: "SETS_WON",
    label: "C) Punti = set vinti",
    description: "Vittoria 2-0: vincitori 2, perdenti 0 · Vittoria 2-1: vincitori 2, perdenti 1",
  },
];

export function NewTournamentForm({ players }: { players: Player[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [scoringMode, setScoringMode] = useState<ScoringMode>("VOLLEYBALL");

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 7 ? [...prev, id] : prev
    );
  }

  return (
    <form action={createTournamentAction} className="space-y-6 bg-white rounded-2xl shadow-sm p-6">
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium block">
          Nome torneo
        </label>
        <input
          id="name"
          name="name"
          required
          className="w-full max-w-sm border border-slate-200 rounded-lg px-3 py-2 text-sm"
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
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Modalita&apos; di assegnazione punti (classifica individuale)</p>
        <div className="space-y-2">
          {SCORING_OPTIONS.map((opt) => {
            const checked = scoringMode === opt.value;
            return (
              <label
                key={opt.value}
                className={`block border rounded-xl px-4 py-3 text-sm cursor-pointer transition-colors ${
                  checked ? "border-primary bg-primary/5" : "border-slate-200"
                }`}
              >
                <span className="flex items-center gap-2 font-medium">
                  <input
                    type="radio"
                    name="scoringMode"
                    value={opt.value}
                    checked={checked}
                    onChange={() => setScoringMode(opt.value)}
                    className="accent-primary"
                  />
                  {opt.label}
                </span>
                <span className="block text-xs text-slate-500 mt-1 ml-6">{opt.description}</span>
              </label>
            );
          })}
        </div>
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
                className={`border rounded-xl px-3 py-2 text-sm flex items-center gap-2 cursor-pointer transition-colors ${
                  checked ? "border-primary bg-primary/5" : "border-slate-200"
                }`}
              >
                <input
                  type="checkbox"
                  name="playerIds"
                  value={p.id}
                  checked={checked}
                  onChange={() => toggle(p.id)}
                  className="accent-primary"
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
        className="bg-primary hover:bg-primary-dark text-white rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 cursor-pointer transition-colors"
      >
        Crea torneo e assegna i numeri a sorteggio
      </button>
    </form>
  );
}
