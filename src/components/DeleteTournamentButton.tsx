"use client";

import { useTransition } from "react";
import { deleteTournamentAction } from "@/app/actions";

export function DeleteTournamentButton({ tournamentId }: { tournamentId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Eliminare definitivamente questo torneo? L'operazione non e' reversibile.")) {
      return;
    }
    const formData = new FormData();
    formData.set("tournamentId", tournamentId);
    startTransition(() => {
      deleteTournamentAction(formData);
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      aria-label="Elimina torneo"
      title="Elimina torneo"
      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 cursor-pointer transition-colors"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.25H3.5a.75.75 0 0 0 0 1.5h.3l.7 10.07A2.75 2.75 0 0 0 7.24 18h5.52a2.75 2.75 0 0 0 2.74-2.43L16.2 5.5h.3a.75.75 0 0 0 0-1.5H14v-.25A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4.75h2.5v-.25a1.25 1.25 0 0 0-1.25-1.25h-2.5A1.25 1.25 0 0 0 7.5 4.5v.25H10Zm-3 2.5a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0V8a.75.75 0 0 1 .75-.75Zm6 0a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-1.5 0V8a.75.75 0 0 1 .75-.75Z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}
