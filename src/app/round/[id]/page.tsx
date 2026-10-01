import { notFound, redirect } from "next/navigation";
import { getRepository } from "@/lib/data";

// Il turno si gestisce ora inline nella tab "Partite" della pagina del torneo:
// questa route resta solo come scorciatoia per i link/bookmark preesistenti.
export default async function RoundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const round = await getRepository().getRound(id);
  if (!round) notFound();

  redirect(`/tournaments/${round.tournamentId}`);
}
