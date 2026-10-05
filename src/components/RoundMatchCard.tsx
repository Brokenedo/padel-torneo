"use client";

import { useTransition, useState, useEffect } from "react";
import { Round, Court } from "@/lib/types";
import { submitResultAction, validateRoundAction, updateMatchCourtAction } from "@/app/actions";

const SET_NUMBERS = [1, 2, 3];

function StatusBadge({ round }: { round: Round }) {
  if (round.status === "VALIDATED") {
    return (
      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">
        convalidato
      </span>
    );
  }
  if (round.match && round.match.winnerTeam !== null) {
    return (
      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700">
        da convalidare
      </span>
    );
  }
  return (
    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-500">
      da giocare
    </span>
  );
}

export function RoundMatchCard({
  round,
  numberToName,
  isActive,
  courts = [],
}: {
  round: Round;
  numberToName: Map<number, string>;
  isActive: boolean;
  courts?: Court[];
}) {
  const name = (n: number) => numberToName.get(n) ?? `#${n}`;
  const [isPending, startTransition] = useTransition();
  const [selectedCourtId, setSelectedCourtId] = useState(round.match?.courtId ?? "");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedCourtId(round.match?.courtId ?? "");
  }, [round.match?.courtId]);

  function handleCourtSave() {
    if (!round.match) return;
    startTransition(async () => {
      const res = await updateMatchCourtAction(round.match!.id, selectedCourtId || null);
      if (res.error) alert(res.error);
    });
  }

  const isCourtChanged = selectedCourtId !== (round.match?.courtId ?? "");

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-900">Turno {round.roundNumber}</h3>
        <StatusBadge round={round} />
      </div>

      {!round.match ? (
        <p className="text-sm text-slate-400">
          Il turno verrà generato automaticamente dopo la convalida del turno precedente.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="text-sm font-medium text-slate-700">Campo:</span>
            <div className="flex items-center gap-2">
              <select
                disabled={round.status === "VALIDATED" || isPending}
                value={selectedCourtId}
                onChange={(e) => setSelectedCourtId(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-2 py-1 bg-white focus:ring-primary focus:border-primary disabled:opacity-50"
              >
                <option value="">Nessun campo</option>
                {courts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {isCourtChanged && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleCourtSave}
                  className="bg-primary hover:bg-primary-dark text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isPending ? "Salvataggio..." : "Salva"}
                </button>
              )}
            </div>
          </div>

          <form action={submitResultAction} className="space-y-2">
            <input type="hidden" name="roundId" value={round.id} />

            <div className="grid grid-cols-[1fr_repeat(3,56px)] gap-x-3 items-center">
              <span />
              {SET_NUMBERS.map((n) => (
                <span key={n} className="text-xs text-slate-400 text-center">
                  Set {n}
                </span>
              ))}

              <span className="font-semibold text-slate-900 py-2">
                {name(round.match.team1Numbers[0])} + {name(round.match.team1Numbers[1])}
              </span>
              {SET_NUMBERS.map((n) => {
                const existing = round.match!.sets.find((s) => s.setNumber === n);
                return (
                  <input
                    key={n}
                    type="number"
                    min={0}
                    max={7}
                    name={`set${n}team1`}
                    defaultValue={existing?.team1Games ?? ""}
                    disabled={round.status === "VALIDATED"}
                    className="w-14 h-10 text-center border border-slate-200 rounded-lg disabled:bg-slate-50 disabled:text-slate-400"
                  />
                );
              })}

              <div className="col-span-4 border-t border-slate-100" />

              <span className="font-semibold text-slate-900 py-2">
                {name(round.match.team2Numbers[0])} + {name(round.match.team2Numbers[1])}
              </span>
              {SET_NUMBERS.map((n) => {
                const existing = round.match!.sets.find((s) => s.setNumber === n);
                return (
                  <input
                    key={n}
                    type="number"
                    min={0}
                    max={7}
                    name={`set${n}team2`}
                    defaultValue={existing?.team2Games ?? ""}
                    disabled={round.status === "VALIDATED"}
                    className="w-14 h-10 text-center border border-slate-200 rounded-lg disabled:bg-slate-50 disabled:text-slate-400"
                  />
                );
              })}
            </div>

            <p className="text-xs text-slate-400">
              Riposano: {round.restingNumbers.map(name).join(", ")}
            </p>

            {round.status !== "VALIDATED" && (
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-4 py-2 text-xs font-semibold cursor-pointer"
                >
                  Salva risultato
                </button>
                {round.match.winnerTeam !== null && (
                  <button
                    type="submit"
                    formAction={validateRoundAction}
                    className="bg-primary hover:bg-primary-dark text-white rounded-lg px-4 py-2 text-xs font-semibold cursor-pointer"
                  >
                    Convalida turno
                  </button>
                )}
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
