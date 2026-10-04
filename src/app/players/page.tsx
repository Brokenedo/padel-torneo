import { getRepository } from "@/lib/data";
import { auth } from "@/lib/auth";
import { createPlayerAction } from "@/app/actions";
import { DeletePlayerButton } from "@/components/DeletePlayerButton";

export default async function PlayersPage() {
  const players = await getRepository().listPlayers();
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold text-slate-900">Giocatori</h1>

      <form action={createPlayerAction} className="bg-white rounded-2xl shadow-sm p-5 flex gap-3 flex-wrap items-end">
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium block">
            Nome
          </label>
          <input
            id="name"
            name="name"
            required
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium block">
            Email (opzionale)
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="bg-primary hover:bg-primary-dark text-white rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer transition-colors"
        >
          Aggiungi
        </button>
      </form>

      <div className="bg-white rounded-2xl shadow-sm divide-y divide-slate-100 overflow-hidden">
        {players.map((p) => (
          <div key={p.id} className="px-5 py-3 text-sm flex items-center justify-between gap-3">
            <span className="font-medium text-slate-900">{p.name}</span>
            <span className="flex items-center gap-2">
              <span className="text-slate-400">{p.email ?? ""}</span>
              {isAdmin && <DeletePlayerButton playerId={p.id} playerName={p.name} />}
            </span>
          </div>
        ))}
        {players.length === 0 && (
          <div className="px-5 py-4 text-sm text-slate-400">Nessun giocatore ancora.</div>
        )}
      </div>
    </div>
  );
}
