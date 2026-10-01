import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export async function Header() {
  const session = await auth();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg">
          🎾 Torneo Padel
        </Link>
        {session?.user && (
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="hover:underline">
              Tornei
            </Link>
            <Link href="/players" className="hover:underline">
              Giocatori
            </Link>
            <span className="text-slate-500">{session.user.email}</span>
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
