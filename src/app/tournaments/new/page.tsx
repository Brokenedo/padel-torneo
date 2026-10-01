import Link from "next/link";
import { redirect } from "next/navigation";
import { getRepository } from "@/lib/data";
import { auth } from "@/lib/auth";
import { NewTournamentForm } from "./NewTournamentForm";

export default async function NewTournamentPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");

  const players = await getRepository().listPlayers();

  if (players.length < 7) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-extrabold text-slate-900">Nuovo torneo</h1>
        <p className="text-sm text-slate-600">
          Servono almeno 7 giocatori censiti per creare un torneo. Attualmente ce ne sono{" "}
          {players.length}.
        </p>
        <Link href="/players" className="text-primary font-medium hover:underline text-sm">
          Vai alla gestione giocatori →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold text-slate-900">Nuovo torneo</h1>
      <NewTournamentForm players={players} />
    </div>
  );
}
