import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRepository } from "@/lib/data";
import { CreateCourtForm } from "./CreateCourtForm";
import { DeleteCourtButton } from "./DeleteCourtButton";

export default async function CourtsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }

  const courts = await getRepository().listCourts();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Configurazioni Campi</h1>
          <p className="text-sm text-slate-500 mt-1">Gestisci i campi da padel disponibili nei tornei.</p>
        </div>
      </div>

      <CreateCourtForm />

      <div className="bg-white shadow-sm rounded-xl border border-slate-100 overflow-hidden">
        {courts.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Nessun campo configurato. Aggiungine uno.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {courts.map((court) => (
              <li key={court.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <div className="font-semibold text-slate-900">{court.name}</div>
                  <div className="text-xs text-slate-400">
                    Creato il {court.createdAt.toLocaleDateString("it-IT")}
                  </div>
                </div>
                <DeleteCourtButton courtId={court.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
