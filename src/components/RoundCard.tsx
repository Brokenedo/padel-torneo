import Link from "next/link";
import { Round } from "@/lib/types";

export function RoundCard({
  round,
  numberToName,
}: {
  round: Round;
  numberToName: Map<number, string>;
}) {
  if (!round.match) {
    return (
      <div className="bg-white border border-slate-200 rounded p-4 text-sm text-slate-500">
        Turno non ancora generato.
      </div>
    );
  }

  const name = (n: number) => numberToName.get(n) ?? `#${n}`;

  return (
    <div className="bg-white border border-slate-200 rounded p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold">Turno {round.roundNumber}</span>
        <span className="text-xs text-slate-500">
          {round.weekStartAt.toLocaleDateString("it-IT")}
        </span>
      </div>
      <p className="text-sm">
        <span className="font-medium">
          {name(round.match.team1Numbers[0])} / {name(round.match.team1Numbers[1])}
        </span>{" "}
        vs{" "}
        <span className="font-medium">
          {name(round.match.team2Numbers[0])} / {name(round.match.team2Numbers[1])}
        </span>
      </p>
      <p className="text-xs text-slate-500">
        Riposano: {round.restingNumbers.map(name).join(", ")}
      </p>
      <Link href={`/round/${round.id}`} className="inline-block text-sm text-blue-600 hover:underline">
        Inserisci risultato / convalida →
      </Link>
    </div>
  );
}
