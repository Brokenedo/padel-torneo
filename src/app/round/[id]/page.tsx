import { notFound } from "next/navigation";
import Link from "next/link";
import { getRepository } from "@/lib/data";
import { submitResultAction, validateRoundAction } from "@/app/actions";

export default async function RoundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = getRepository();
  const round = await repo.getRound(id);
  if (!round) notFound();

  const tournament = await repo.getTournamentById(round.tournamentId);
  if (!tournament) notFound();

  const numberToName = new Map(tournament.players.map((p) => [p.number, p.player.name]));
  const name = (n: number) => numberToName.get(n) ?? `#${n}`;

  if (!round.match) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Turno {round.roundNumber}</h1>
        <p className="text-sm text-slate-500">
          Questo turno non e&apos; ancora stato generato: completa e convalida i turni precedenti.
        </p>
        <Link href="/" className="text-blue-600 hover:underline text-sm">
          ← Torna alla dashboard
        </Link>
      </div>
    );
  }

  const match = round.match;
  const isValidated = round.status === "VALIDATED";
  const canValidate = !isValidated && match.winnerTeam !== null;

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-semibold">Turno {round.roundNumber}</h1>
        <p className="text-sm text-slate-500">{round.weekStartAt.toLocaleDateString("it-IT")}</p>
      </div>

      <div className="bg-white border border-slate-200 rounded p-4 space-y-1">
        <p className="text-sm">
          <span className="font-medium">
            {name(match.team1Numbers[0])} / {name(match.team1Numbers[1])}
          </span>{" "}
          vs{" "}
          <span className="font-medium">
            {name(match.team2Numbers[0])} / {name(match.team2Numbers[1])}
          </span>
        </p>
        <p className="text-xs text-slate-500">
          Riposano: {round.restingNumbers.map(name).join(", ")}
        </p>
      </div>

      <form action={submitResultAction} className="bg-white border border-slate-200 rounded p-4 space-y-4">
        <input type="hidden" name="roundId" value={round.id} />
        <h2 className="font-semibold text-sm">Risultato (meglio dei 3 set)</h2>
        {[1, 2, 3].map((setNumber) => {
          const existing = match.sets.find((s) => s.setNumber === setNumber);
          return (
            <div key={setNumber} className="flex items-center gap-3 text-sm">
              <span className="w-12 text-slate-500">Set {setNumber}</span>
              <input
                type="number"
                min={0}
                max={7}
                name={`set${setNumber}team1`}
                defaultValue={existing?.team1Games ?? ""}
                disabled={isValidated}
                className="w-16 border border-slate-300 rounded px-2 py-1 disabled:bg-slate-100"
              />
              <span>-</span>
              <input
                type="number"
                min={0}
                max={7}
                name={`set${setNumber}team2`}
                defaultValue={existing?.team2Games ?? ""}
                disabled={isValidated}
                className="w-16 border border-slate-300 rounded px-2 py-1 disabled:bg-slate-100"
              />
            </div>
          );
        })}
        {!isValidated && (
          <button
            type="submit"
            className="bg-slate-900 text-white rounded px-4 py-2 text-sm font-medium cursor-pointer"
          >
            Salva risultato
          </button>
        )}
        {match.winnerTeam && (
          <p className="text-sm text-green-700">
            Vince la coppia {match.winnerTeam === 1 ? match.team1Numbers.map(name).join(" / ") : match.team2Numbers.map(name).join(" / ")}
          </p>
        )}
      </form>

      {canValidate && (
        <form action={validateRoundAction}>
          <input type="hidden" name="roundId" value={round.id} />
          <button
            type="submit"
            className="bg-green-700 text-white rounded px-4 py-2 text-sm font-medium cursor-pointer"
          >
            Convalida turno e genera il prossimo
          </button>
        </form>
      )}

      {isValidated && (
        <p className="text-sm text-green-700 font-medium">
          ✅ Turno convalidato. Il turno successivo e&apos; stato generato automaticamente.
        </p>
      )}

      <Link href="/" className="inline-block text-blue-600 hover:underline text-sm">
        ← Torna alla dashboard
      </Link>
    </div>
  );
}
