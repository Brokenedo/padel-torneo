import Link from "next/link";
import { getRepository } from "@/lib/data";
import { TournamentOverview } from "@/components/TournamentOverview";

export default async function DashboardPage() {
  const repo = getRepository();
  const tournament = await repo.getActiveTournament();

  if (!tournament) {
    return (
      <div className="text-center py-16 space-y-4">
        <h1 className="text-2xl font-semibold">Nessun torneo attivo</h1>
        <p className="text-slate-500">Crea un nuovo torneo selezionando 7 giocatori.</p>
        <Link
          href="/tournaments/new"
          className="inline-block bg-slate-900 text-white rounded px-4 py-2 text-sm font-medium"
        >
          Crea torneo
        </Link>
      </div>
    );
  }

  return <TournamentOverview tournament={tournament} />;
}
