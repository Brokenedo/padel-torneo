import { TournamentPlayer, Round } from "@/lib/types";
import { computePlannedWorkload } from "@/lib/stats";

/** Dashboard: quante partite giochera' (in totale, su tutto il calendario) ogni giocatore. */
export function PlayerWorkloadDashboard({
  players,
  rounds,
}: {
  players: TournamentPlayer[];
  rounds: Round[];
}) {
  const numbers = players.map((p) => p.number);
  const { plannedMatches, plannedRests } = computePlannedWorkload(numbers, rounds);
  const sorted = players.slice().sort((a, b) => plannedMatches[b.number] - plannedMatches[a.number]);
  const maxMatches = Math.max(...Object.values(plannedMatches), 1);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Partite previste per giocatore</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Calcolate sull&apos;intero calendario del torneo ({rounds.length} turni gia&apos; generati).
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sorted.map((p) => (
          <div key={p.id} className="bg-white rounded-xl shadow-sm px-4 py-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-primary shrink-0">#{p.number}</span>
                <span className="font-medium text-slate-900 truncate">{p.player.name}</span>
              </span>
              {p.avoidsExtraMatches && (
                <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  non vuole extra
                </span>
              )}
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${(plannedMatches[p.number] / maxMatches) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-900 text-sm">{plannedMatches[p.number]} partite</span>
              <span>{plannedRests[p.number]} riposi</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
