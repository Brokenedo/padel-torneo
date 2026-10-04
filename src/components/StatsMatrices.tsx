import { Round, TournamentStats } from "@/lib/types";

function Matrix({
  title,
  players,
  counts,
  numberToName,
  highlightZero = false,
}: {
  title: string;
  players: number[];
  counts: Record<number, Record<number, number>>;
  numberToName: Map<number, string>;
  highlightZero?: boolean;
}) {
  const sorted = [...players].sort((a, b) => a - b);
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 overflow-x-auto">
      <h3 className="font-bold mb-3 text-sm text-slate-900">{title}</h3>
      <table className="text-xs border-collapse w-full">
        <thead>
          <tr>
            <th className="p-2"></th>
            {sorted.map((p) => (
              <th key={p} className="p-2 text-slate-500 font-medium whitespace-nowrap text-center">
                {numberToName.get(p) ?? p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row} className="border-t border-slate-50">
              <td className="p-2 text-slate-700 font-medium whitespace-nowrap text-right pr-4 border-r border-slate-50">
                {numberToName.get(row) ?? row}
              </td>
              {sorted.map((col) => {
                const val = counts[row]?.[col] ?? 0;
                const isZero = row !== col && val === 0;
                const isPositive = row !== col && val > 0;
                return (
                  <td
                    key={col}
                    className={`p-2 text-center rounded-sm ${
                      highlightZero
                        ? isZero
                          ? "bg-red-50 text-red-600 font-bold"
                          : isPositive
                          ? "bg-green-50 text-green-700 font-medium"
                          : ""
                        : ""
                    }`}
                  >
                    {row === col ? "—" : val}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatsMatrices({
  players,
  stats,
  numberToName,
  rounds,
}: {
  players: number[];
  stats: TournamentStats;
  numberToName: Map<number, string>;
  rounds?: Round[];
}) {
  const plannedOpponentCount: Record<number, Record<number, number>> = {};
  for (const p of players) {
    plannedOpponentCount[p] = {};
    for (const q of players) {
      plannedOpponentCount[p][q] = 0;
    }
  }

  if (rounds) {
    for (const round of rounds) {
      if (!round.match) continue;
      const [a, b] = round.match.team1Numbers;
      const [c, d] = round.match.team2Numbers;
      for (const x of [a, b]) {
        for (const y of [c, d]) {
          if (plannedOpponentCount[x] && typeof plannedOpponentCount[x][y] !== 'undefined') {
              plannedOpponentCount[x][y]++;
          }
          if (plannedOpponentCount[y] && typeof plannedOpponentCount[y][x] !== 'undefined') {
              plannedOpponentCount[y][x]++;
          }
        }
      }
    }
  }

  let allPlayedAgainstAll = false;
  if (rounds && rounds.length > 0) {
    allPlayedAgainstAll = true;
    for (const p of players) {
      for (const q of players) {
        if (p !== q && plannedOpponentCount[p][q] === 0) {
          allPlayedAgainstAll = false;
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      {rounds && allPlayedAgainstAll && (
        <div className="bg-green-50 text-green-800 p-4 rounded-xl text-sm font-medium flex items-center gap-2 border border-green-100">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          Il calendario garantisce che tutti i giocatori si sfidino contro tutti gli altri almeno una volta!
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rounds && (
          <Matrix
            title="Scontri previsti (intero torneo)"
            players={players}
            counts={plannedOpponentCount}
            numberToName={numberToName}
            highlightZero={true}
          />
        )}
        <Matrix
          title="Volte compagni (finora)"
          players={players}
          counts={stats.partnerCount}
          numberToName={numberToName}
        />
        <Matrix
          title="Volte avversari (finora)"
          players={players}
          counts={stats.opponentCount}
          numberToName={numberToName}
        />
      </div>
    </div>
  );
}
