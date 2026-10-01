import Link from "next/link";
import { getRepository } from "@/lib/data";
import { auth } from "@/lib/auth";
import { DeleteTournamentButton } from "@/components/DeleteTournamentButton";

const STATUS_LABEL: Record<"ACTIVE" | "COMPLETED", string> = {
  ACTIVE: "In corso",
  COMPLETED: "Concluso",
};

export default async function TournamentsListPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const userId = session?.user?.id;
  const tournaments = await getRepository().listTournaments();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-slate-900">Tornei</h1>
        {isAdmin && (
          <Link
            href="/tournaments/new"
            className="inline-block bg-primary hover:bg-primary-dark text-white rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors"
          >
            + Nuovo torneo
          </Link>
        )}
      </div>

      {tournaments.length === 0 ? (
        <div className="text-center py-16 space-y-4 bg-white rounded-2xl shadow-sm">
          <h2 className="text-lg font-semibold">Nessun torneo ancora creato</h2>
          <p className="text-slate-500">Crea un nuovo torneo selezionando 7 giocatori.</p>
          {isAdmin && (
            <Link
              href="/tournaments/new"
              className="inline-block bg-primary hover:bg-primary-dark text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              Crea torneo
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-slate-100 overflow-hidden">
          {tournaments.map((t) => (
            <div key={t.id} className="flex items-center gap-2 px-5 py-2 hover:bg-slate-50 transition-colors">
              <Link href={`/tournaments/${t.id}`} className="flex items-center justify-between flex-1 py-2 min-w-0">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Inizio {t.startDate.toLocaleDateString("it-IT")} &middot; Turno{" "}
                    {t.currentRoundNumber} di {t.totalRounds}
                  </p>
                </div>
                <span
                  className={
                    t.status === "ACTIVE"
                      ? "ml-4 shrink-0 text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700"
                      : "ml-4 shrink-0 text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary"
                  }
                >
                  {STATUS_LABEL[t.status]}
                </span>
              </Link>
              {userId && t.createdById === userId && (
                <DeleteTournamentButton tournamentId={t.id} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
