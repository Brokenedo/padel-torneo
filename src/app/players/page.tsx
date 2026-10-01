import { getRepository } from "@/lib/data";
import { createPlayerAction } from "@/app/actions";

export default async function PlayersPage() {
  const players = await getRepository().listPlayers();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Giocatori</h1>

      <form action={createPlayerAction} className="bg-white border border-slate-200 rounded p-4 flex gap-2 flex-wrap items-end">
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium block">
            Nome
          </label>
          <input
            id="name"
            name="name"
            required
            className="border border-slate-300 rounded px-3 py-2 text-sm"
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
            className="border border-slate-300 rounded px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="bg-slate-900 text-white rounded px-4 py-2 text-sm font-medium cursor-pointer"
        >
          Aggiungi
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded divide-y divide-slate-100">
        {players.map((p) => (
          <div key={p.id} className="px-4 py-2 text-sm flex items-center justify-between">
            <span>{p.name}</span>
            <span className="text-slate-400">{p.email ?? ""}</span>
          </div>
        ))}
        {players.length === 0 && (
          <div className="px-4 py-3 text-sm text-slate-400">Nessun giocatore ancora.</div>
        )}
      </div>
    </div>
  );
}
