import { redirect } from "next/navigation";
import { getRepository } from "@/lib/data";
import { auth } from "@/lib/auth";
import { NewUserForm } from "./NewUserForm";

export default async function UsersPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");

  const users = await getRepository().listUsers();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold text-slate-900">Utenti</h1>

      <NewUserForm />

      <div className="bg-white rounded-2xl shadow-sm divide-y divide-slate-100 overflow-hidden">
        {users.map((u) => (
          <div key={u.id} className="px-5 py-3 text-sm flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">
                {u.username ?? u.name} <span className="text-slate-400 font-normal">({u.email})</span>
              </p>
            </div>
            <span
              className={
                u.isAdmin
                  ? "text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary"
                  : "text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-500"
              }
            >
              {u.isAdmin ? "Amministratore" : "Utente"}
            </span>
          </div>
        ))}
        {users.length === 0 && (
          <div className="px-5 py-4 text-sm text-slate-400">Nessun utente ancora.</div>
        )}
      </div>
    </div>
  );
}
