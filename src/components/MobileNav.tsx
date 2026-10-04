"use client";

import { useState } from "react";
import Link from "next/link";

export function MobileNav({
  email,
  isAdmin,
  signOutAction,
}: {
  email: string;
  isAdmin: boolean;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const links = (
    <>
      <Link href="/" onClick={close} className="font-medium text-slate-600 hover:text-primary">
        Tornei
      </Link>
      <Link href="/players" onClick={close} className="font-medium text-slate-600 hover:text-primary">
        Giocatori
      </Link>
      {isAdmin && (
        <Link href="/users" onClick={close} className="font-medium text-slate-600 hover:text-primary">
          Utenti
        </Link>
      )}
      <Link href="/profile" onClick={close} className="font-medium text-slate-600 hover:text-primary">
        Profilo
      </Link>
    </>
  );

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
        <Link href="/" className="font-extrabold text-lg text-primary shrink-0">
          🎾 Torneo Padel
        </Link>

        <nav className="hidden sm:flex items-center gap-4 text-sm">
          {links}
          <span className="text-slate-400">{email}</span>
          <form action={signOutAction}>
            <button type="submit" className="text-red-600 hover:underline cursor-pointer">
              Esci
            </button>
          </form>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Chiudi menu" : "Apri menu"}
          aria-expanded={open}
          className="sm:hidden p-2 -mr-2 text-slate-600 cursor-pointer"
        >
          {open ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </div>

      {open && (
        <div className="sm:hidden border-t border-slate-100">
          <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col gap-3 text-sm">
            {links}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-slate-400 truncate">{email}</span>
              <form action={signOutAction}>
                <button type="submit" className="text-red-600 hover:underline cursor-pointer shrink-0">
                  Esci
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
