import { notFound } from "next/navigation";
import { getRepository } from "@/lib/data";
import { TournamentOverview } from "@/components/TournamentOverview";

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getRepository().getTournamentById(id);
  if (!tournament) notFound();

  return <TournamentOverview tournament={tournament} />;
}
