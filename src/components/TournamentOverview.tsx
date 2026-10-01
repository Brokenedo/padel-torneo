import { Tournament } from "@/lib/types";
import { computeStats } from "@/lib/stats";
import { StatsMatrices } from "@/components/StatsMatrices";
import { RoundCard } from "@/components/RoundCard";
import Link from "next/link";

export function TournamentOverview({ tournament }: { tournament: Tournament }) {
  const numberToName = new Map(tournament.players.map((p) => [p.number, p.player.name]));
  const currentRound = tournament.rounds.find((r) => r.roundNumber === tournament.currentRoundNumber);
  const stats = computeStats(
    tournament.players.map((p) => p.number),
    tournament.rounds
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{tournament.name}</h1>
        <p className="text-sm text-slate-500">
          Inizio {tournament.startDate.toLocaleDateString("it-IT")} &middot; Turno{" "}
          {tournament.currentRoundNumber} di {tournament.totalRounds} &middot;{" "}
          {tournament.status === "ACTIVE" ? "In corso" : "Concluso"}
        </p>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Giocatori</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {tournament.players
            .slice()
            .sort((a, b) => a.number - b.number)
            .map((p) => (
              <div
                key={p.id}
                className="bg-white border border-slate-200 rounded px-3 py-2 text-sm flex items-center gap-2"
              >
                <span className="font-semibold text-slate-900">#{p.number}</span>
                <span>{p.player.name}</span>
              </div>
            ))}
        </div>
      </section>

      {currentRound && tournament.status === "ACTIVE" && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Turno in corso</h2>
          <RoundCard round={currentRound} numberToName={numberToName} />
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">Calendario</h2>
        <div className="bg-white border border-slate-200 rounded divide-y divide-slate-100">
          {tournament.rounds.map((r) => (
            <Link
              key={r.id}
              href={`/round/${r.id}`}
              className="flex items-center justify-between px-4 py-2 text-sm hover:bg-slate-50"
            >
              <span className="font-medium">T{r.roundNumber}</span>
              {r.match ? (
                <span>
                  {r.match.team1Numbers.join("-")} vs {r.match.team2Numbers.join("-")}{" "}
                  <span className="text-slate-400">(riposano {r.restingNumbers.join(", ")})</span>
                </span>
              ) : (
                <span className="text-slate-400">da definire</span>
              )}
              <span
                className={
                  r.status === "VALIDATED"
                    ? "text-green-600 text-xs font-medium"
                    : "text-amber-600 text-xs font-medium"
                }
              >
                {r.status === "VALIDATED" ? "Convalidato" : "In corso"}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Statistiche</h2>
        <StatsMatrices
          players={tournament.players.map((p) => p.number)}
          stats={stats}
          numberToName={numberToName}
        />
      </section>
    </div>
  );
}
