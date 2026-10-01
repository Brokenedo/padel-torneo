"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { getRepository } from "@/lib/data";
import { signIn, auth } from "@/lib/auth";

export async function loginAction(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/");

  try {
    await signIn("credentials", { email, password, redirectTo: callbackUrl });
    return { error: null };
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Email o password non corretti" };
    }
    throw err;
  }
}

const createPlayerSchema = z.object({
  name: z.string().trim().min(2, "Il nome deve avere almeno 2 caratteri"),
  email: z.string().trim().email().optional().or(z.literal("")),
});

export async function createPlayerAction(formData: FormData) {
  const parsed = createPlayerSchema.parse({
    name: formData.get("name"),
    email: formData.get("email") ?? "",
  });
  await getRepository().createPlayer({
    name: parsed.name,
    email: parsed.email ? parsed.email : null,
  });
  revalidatePath("/players");
}

const createTournamentSchema = z.object({
  name: z.string().trim().min(2, "Il nome del torneo e' obbligatorio"),
  startDate: z.string().min(1, "La data di inizio e' obbligatoria"),
  playerIds: z.array(z.string()).length(7, "Devi selezionare esattamente 7 giocatori"),
  scoringMode: z.enum(["VOLLEYBALL", "WIN_ONLY", "SETS_WON"], {
    message: "Seleziona una modalita' di punteggio",
  }),
});

export async function createTournamentAction(formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Solo un amministratore puo' creare un torneo");
  }

  const playerIds = formData.getAll("playerIds").map(String);
  const parsed = createTournamentSchema.parse({
    name: formData.get("name"),
    startDate: formData.get("startDate"),
    playerIds,
    scoringMode: formData.get("scoringMode"),
  });

  const tournament = await getRepository().createTournament({
    name: parsed.name,
    startDate: new Date(parsed.startDate),
    playerIds: parsed.playerIds,
    scoringMode: parsed.scoringMode,
  });

  revalidatePath("/");
  redirect(`/tournaments/${tournament.id}`);
}

const submitResultSchema = z.object({
  roundId: z.string().min(1),
  sets: z
    .array(
      z.object({
        team1Games: z.coerce.number().int().min(0).max(7),
        team2Games: z.coerce.number().int().min(0).max(7),
      })
    )
    .min(1)
    .max(3),
});

export async function submitResultAction(formData: FormData) {
  const roundId = String(formData.get("roundId"));
  const sets = [1, 2, 3]
    .map((n) => ({
      team1Games: formData.get(`set${n}team1`),
      team2Games: formData.get(`set${n}team2`),
    }))
    .filter((s) => s.team1Games !== null && s.team1Games !== "" && s.team2Games !== null && s.team2Games !== "");

  const parsed = submitResultSchema.parse({ roundId, sets });
  const round = await getRepository().submitMatchResult(parsed);
  revalidatePath(`/tournaments/${round.tournamentId}`);
}

export async function validateRoundAction(formData: FormData) {
  const roundId = String(formData.get("roundId"));
  const { round } = await getRepository().validateRound(roundId);
  revalidatePath(`/tournaments/${round.tournamentId}`);
  redirect(`/tournaments/${round.tournamentId}`);
}
