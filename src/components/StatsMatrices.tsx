import { TournamentStats } from "@/lib/types";

function Matrix({
  title,
  players,
  counts,
  numberToName,
}: {
  title: string;
  players: number[];
  counts: Record<number, Record<number, number>>;
  numberToName: Map<number, string>;
}) {
  const sorted = [...players].sort((a, b) => a - b);
  return (
    <div className="bg-white border border-slate-200 rounded p-4 overflow-x-auto">
      <h3 className="font-semibold mb-2 text-sm">{title}</h3>
      <table className="text-xs border-collapse">
        <thead>
          <tr>
            <th className="p-1"></th>
            {sorted.map((p) => (
              <th key={p} className="p-1 text-slate-500 font-medium" title={numberToName.get(p)}>
                {p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row}>
              <td className="p-1 text-slate-500 font-medium" title={numberToName.get(row)}>
                {row}
              </td>
              {sorted.map((col) => (
                <td key={col} className="p-1 text-center w-6">
                  {row === col ? "·" : counts[row]?.[col] ?? 0}
                </td>
              ))}
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
}: {
  players: number[];
  stats: TournamentStats;
  numberToName: Map<number, string>;
}) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Matrix
        title="Volte che siete compagni"
        players={players}
        counts={stats.partnerCount}
        numberToName={numberToName}
      />
      <Matrix
        title="Volte che vi affrontate"
        players={players}
        counts={stats.opponentCount}
        numberToName={numberToName}
      />
    </div>
  );
}
