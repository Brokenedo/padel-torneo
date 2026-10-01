import Link from "next/link";
import { getRepository } from "@/lib/data";
import { auth } from "@/lib/auth";

const STATUS_LABEL: Record<"ACTIVE" | "COMPLETED", string> = {
  ACTIVE: "In corso",
  COMPLETED: "Concluso",
};

export default async function TournamentsListPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const tournaments = await getRepository().listTournaments();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tornei</h1>
        {isAdmin && (
          <Link
            href="/tournaments/new"
            className="inline-block bg-slate-900 text-white rounded px-4 py-2 text-sm font-medium"
          >
            + Nuovo torneo
          </Link>
        )}
      </div>

      {tournaments.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <h2 className="text-lg font-semibold">Nessun torneo ancora creato</h2>
          <p className="text-slate-500">Crea un nuovo torneo selezionando 7 giocatori.</p>
          {isAdmin && (
            <Link
              href="/tournaments/new"
              className="inline-block bg-slate-900 text-white rounded px-4 py-2 text-sm font-medium"
            >
              Crea torneo
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded divide-y divide-slate-100">
          {tournaments.map((t) => (
            <Link
              key={t.id}
              href={`/tournaments/${t.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
            >
              <div>
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-slate-500">
                  Inizio {t.startDate.toLocaleDateString("it-IT")} &middot; Turno{" "}
                  {t.currentRoundNumber} di {t.totalRounds}
                </p>
              </div>
              <span
                className={
                  t.status === "ACTIVE"
                    ? "text-amber-600 text-xs font-medium"
                    : "text-green-600 text-xs font-medium"
                }
              >
                {STATUS_LABEL[t.status]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
