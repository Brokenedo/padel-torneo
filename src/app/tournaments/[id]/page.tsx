import { notFound } from "next/navigation";
import { getRepository } from "@/lib/data";
import { auth } from "@/lib/auth";
import { TournamentOverview } from "@/components/TournamentOverview";

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await getRepository().getTournamentById(id);
  if (!tournament) notFound();

  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  return <TournamentOverview tournament={tournament} isAdmin={isAdmin} />;
}

