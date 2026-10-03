import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { MobileNav } from "@/components/MobileNav";

export async function Header() {
  const session = await auth();

  if (!session?.user) {
    return (
      <header className="bg-white border-b border-black/5">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <Link href="/" className="font-extrabold text-lg text-primary shrink-0">
            🎾 Torneo Padel
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white border-b border-black/5">
      <MobileNav
        email={session.user.email ?? ""}
        isAdmin={session.user.role === "ADMIN"}
        signOutAction={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      />
    </header>
  );
}
