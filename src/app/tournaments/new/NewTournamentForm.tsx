"use client";

import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
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

/** Overlay a schermo intero sul form: blocca ogni click finche' il torneo non e' stato creato. */
function PendingOverlay() {
  const { pending } = useFormStatus();
  if (!pending) return null;

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/80 backdrop-blur-sm">
      <span className="h-8 w-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" aria-hidden="true" />
      <p className="text-sm font-medium text-slate-700">
        Creazione del torneo in corso, sorteggio dei numeri e calcolo del calendario...
      </p>
    </div>
  );
}

/** Disabilita tutti i campi del form mentre la server action e' in corso. */
function FormFieldset({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <fieldset disabled={pending} className="space-y-6">
      {children}
    </fieldset>
  );
}

function SubmitButton({ canSubmit }: { canSubmit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={!canSubmit || pending}
      aria-busy={pending}
      className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
    >
      {pending && (
        <span
          className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin"
          aria-hidden="true"
        />
      )}
      {pending ? "Creazione in corso..." : "Crea torneo e assegna i numeri a sorteggio"}
    </button>
  );
}

export function NewTournamentForm({ players }: { players: Player[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [avoidExtraMatches, setAvoidExtraMatches] = useState<string[]>([]);
  const [scoringMode, setScoringMode] = useState<ScoringMode>("VOLLEYBALL");

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 7 ? [...prev, id] : prev
    );
    setAvoidExtraMatches((prev) => prev.filter((x) => x !== id));
  }

  function toggleAvoidExtraMatches(id: string) {
    setAvoidExtraMatches((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <form
      action={createTournamentAction}
      className="relative space-y-6 bg-white rounded-2xl shadow-sm p-6"
    >
      <PendingOverlay />
      <FormFieldset>
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
          {selected.length > 0 && (
            <div className="space-y-1 pt-1">
              <p className="text-xs text-slate-500">
                Giocatori selezionati che non vogliono fare piu&apos; partite degli altri
                (se matematicamente non evitabile, l&apos;eccedenza ricade sugli altri):
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {players
                  .filter((p) => selected.includes(p.id))
                  .map((p) => {
                    const checked = avoidExtraMatches.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`border rounded-xl px-3 py-2 text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                          checked ? "border-primary bg-primary/5" : "border-slate-200"
                        }`}
                      >
                        <input
                          type="checkbox"
                          name="avoidExtraMatchesPlayerIds"
                          value={p.id}
                          checked={checked}
                          onChange={() => toggleAvoidExtraMatches(p.id)}
                          className="accent-primary"
                        />
                        {p.name}
                      </label>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        <SubmitButton canSubmit={selected.length === 7} />
      </FormFieldset>
    </form>
  );
}
