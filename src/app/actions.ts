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

const createUserSchema = z.object({
  username: z.string().trim().min(2, "Lo username deve avere almeno 2 caratteri"),
  email: z.string().trim().email("Email non valida"),
  password: z.string().min(6, "La password deve avere almeno 6 caratteri"),
  isAdmin: z.boolean(),
});

export async function createUserAction(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { error: "Solo un amministratore puo' creare nuovi utenti" };
  }

  const parsed = createUserSchema.safeParse({
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
    isAdmin: formData.get("isAdmin") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  try {
    await getRepository().createUser(parsed.data);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Errore durante la creazione dell'utente" };
  }

  revalidatePath("/users");
  revalidatePath("/players");
  return { error: null };
}

const createTournamentSchema = z.object({
  name: z.string().trim().min(2, "Il nome del torneo e' obbligatorio"),
  startDate: z.string().min(1, "La data di inizio e' obbligatoria"),
  playerIds: z.array(z.string()).length(7, "Devi selezionare esattamente 7 giocatori"),
  avoidExtraMatchesPlayerIds: z.array(z.string()).default([]),
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
  const avoidExtraMatchesPlayerIds = formData.getAll("avoidExtraMatchesPlayerIds").map(String);
  const parsed = createTournamentSchema.parse({
    name: formData.get("name"),
    startDate: formData.get("startDate"),
    playerIds,
    avoidExtraMatchesPlayerIds,
    scoringMode: formData.get("scoringMode"),
  });

  const tournament = await getRepository().createTournament({
    name: parsed.name,
    startDate: new Date(parsed.startDate),
    playerIds: parsed.playerIds,
    // ignora eventuali id non tra i 7 selezionati (es. manomissione del form)
    avoidExtraMatchesPlayerIds: parsed.avoidExtraMatchesPlayerIds.filter((id) => parsed.playerIds.includes(id)),
    scoringMode: parsed.scoringMode,
    createdById: session.user.id,
  });

  revalidatePath("/");
  redirect(`/tournaments/${tournament.id}`);
}

export async function deleteTournamentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Devi essere autenticato");
  }

  const tournamentId = String(formData.get("tournamentId"));
  await getRepository().deleteTournament(tournamentId, session.user.id);
  revalidatePath("/");
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
