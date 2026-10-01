import { PlayerStanding } from "@/lib/standings";

export function StandingsTable({ standings }: { standings: PlayerStanding[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-400 border-b border-slate-100">
            <th className="px-4 py-3 font-medium">#</th>
            <th className="px-4 py-3 font-medium">Giocatore</th>
            <th className="px-4 py-3 font-medium text-right">Punti</th>
            <th className="px-4 py-3 font-medium text-right">Partite</th>
            <th className="px-4 py-3 font-medium text-right">Set (+/-)</th>
            <th className="px-4 py-3 font-medium text-right">Game (+/-)</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, idx) => (
            <tr key={s.number} className="border-b border-slate-50 last:border-0">
              <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
              <td className="px-4 py-3">
                <span className="font-bold text-primary">#{s.number}</span>{" "}
                <span className="font-medium text-slate-900">{s.name}</span>
              </td>
              <td className="px-4 py-3 text-right font-bold text-slate-900">{s.points}</td>
              <td className="px-4 py-3 text-right text-slate-500">{s.matchesPlayed}</td>
              <td className="px-4 py-3 text-right text-slate-500">
                {s.setsWon}-{s.setsLost} ({s.setDiff >= 0 ? "+" : ""}
                {s.setDiff})
              </td>
              <td className="px-4 py-3 text-right text-slate-500">
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
