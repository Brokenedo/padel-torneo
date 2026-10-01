import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export async function Header() {
  const session = await auth();

  return (
    <header className="bg-white border-b border-black/5">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-extrabold text-lg text-primary">
          🎾 Torneo Padel
        </Link>
        {session?.user && (
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="font-medium text-slate-600 hover:text-primary">
              Tornei
            </Link>
            <Link href="/players" className="font-medium text-slate-600 hover:text-primary">
              Giocatori
            </Link>
            {session.user.role === "ADMIN" && (
              <Link href="/users" className="font-medium text-slate-600 hover:text-primary">
                Utenti
              </Link>
            )}
            <span className="text-slate-400">{session.user.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button type="submit" className="text-red-600 hover:underline cursor-pointer">
                Esci
              </button>
            </form>
          </nav>
        )}
      </div>
    </header>
  );
}
