import { PlayerStanding } from "@/lib/standings";

export function StandingsTable({ standings }: { standings: PlayerStanding[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-100">
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Giocatore</th>
            <th className="px-3 py-2 font-medium text-right">Punti</th>
            <th className="px-3 py-2 font-medium text-right">Partite</th>
            <th className="px-3 py-2 font-medium text-right">Set (+/-)</th>
            <th className="px-3 py-2 font-medium text-right">Game (+/-)</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, idx) => (
            <tr key={s.number} className="border-b border-slate-50 last:border-0">
              <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
              <td className="px-3 py-2">
                <span className="font-semibold text-slate-900">#{s.number}</span> {s.name}
              </td>
              <td className="px-3 py-2 text-right font-semibold">{s.points}</td>
              <td className="px-3 py-2 text-right text-slate-500">{s.matchesPlayed}</td>
              <td className="px-3 py-2 text-right text-slate-500">
                {s.setsWon}-{s.setsLost} ({s.setDiff >= 0 ? "+" : ""}
                {s.setDiff})
              </td>
              <td className="px-3 py-2 text-right text-slate-500">
                {s.gamesWon}-{s.gamesLost} ({s.gameDiff >= 0 ? "+" : ""}
                {s.gameDiff})
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
