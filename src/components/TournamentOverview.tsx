import { Tournament } from "@/lib/types";
import { computeStats } from "@/lib/stats";
import { computeStandings } from "@/lib/standings";
import { TournamentTabs } from "@/components/TournamentTabs";

const SCORING_LABELS: Record<Tournament["scoringMode"], string> = {
  VOLLEYBALL: "2-0 / 2-1 (stile pallavolo)",
  WIN_ONLY: "1 punto a vittoria",
  SETS_WON: "Punti = set vinti",
};

import { Court } from "@/lib/types";

export function TournamentOverview({ tournament, isAdmin = false, courts = [] }: { tournament: Tournament; isAdmin?: boolean; courts?: Court[] }) {
  const numberToName = new Map(tournament.players.map((p) => [p.number, p.player.name]));
  const stats = computeStats(
    tournament.players.map((p) => p.number),
    tournament.rounds
  );
  const standings = computeStandings(tournament);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">{tournament.name}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {tournament.players.length} giocatori &middot; {tournament.totalRounds} turni &middot;
          partite al meglio di 3 set &middot; punteggio: {SCORING_LABELS[tournament.scoringMode]}
        </p>
      </div>

      <TournamentTabs
        tournament={tournament}
        standings={standings}
        stats={stats}
        numberToName={numberToName}
        isAdmin={isAdmin}
        courts={courts}
      />
    </div>
  );
}
