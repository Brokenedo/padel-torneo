"use client";

import { useTransition } from "react";
import { deleteCourtAction } from "@/app/actions";

export function DeleteCourtButton({ courtId }: { courtId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        if (confirm("Sei sicuro di voler eliminare questo campo?")) {
          startTransition(async () => {
            const res = await deleteCourtAction(courtId);
            if (res.error) alert(res.error);
          });
        }
      }}
      disabled={isPending}
      className="text-red-600 hover:bg-red-50 p-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
    >
      {isPending ? "Eliminazione..." : "Elimina"}
    </button>
  );
}
