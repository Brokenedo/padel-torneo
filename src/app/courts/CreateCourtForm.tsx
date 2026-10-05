"use client";

import { useRef, useTransition } from "react";
import { createCourtAction } from "@/app/actions";

export function CreateCourtForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await createCourtAction(formData);
      if (res.error) {
        alert(res.error);
      } else {
        formRef.current?.reset();
      }
    });
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <h2 className="font-semibold text-slate-900 mb-4">Aggiungi nuovo campo</h2>
      <form ref={formRef} action={handleSubmit} className="flex gap-3 items-end">
        <div className="flex-1">
          <label htmlFor="name" className="block text-xs font-medium text-slate-700 mb-1">
            Nome del campo
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Es. Campo 1, Centrale, ecc."
            className="w-full border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary border"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Aggiunta..." : "Aggiungi"}
        </button>
      </form>
    </div>
  );
}
