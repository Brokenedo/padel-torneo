// Mappatura dei dati di dominio dell'app verso le tabelle Dataverse "edo_*" generate da
// scripts/dataverse/Create-DataverseSchema.ps1. Ogni funzione e' "best effort": logga
// un errore e non lancia mai eccezioni, cosi' un problema di sincronizzazione con
// Dataverse non puo' mai far fallire l'operazione principale su Postgres (che resta
// l'unica fonte di verita' dell'app).
import { isDataverseEnabled, upsertBySourceId, deleteBySourceId, bindBySourceId } from "./client";
import {
  Player,
  AppUser,
  Tournament,
  Round,
  TournamentStatus,
  RoundStatus,
  ScoringMode,
} from "../types";

// Valori delle option-set (Choice), coerenti con l'ordine delle Options nello script
// PowerShell di creazione schema (il primo valore e' sempre 100000000).
const TOURNAMENT_STATUS_OPTIONS: Record<TournamentStatus, number> = { ACTIVE: 100000000, COMPLETED: 100000001 };
const SCORING_MODE_OPTIONS: Record<ScoringMode, number> = {
  VOLLEYBALL: 100000000,
  WIN_ONLY: 100000001,
  SETS_WON: 100000002,
};
const ROUND_STATUS_OPTIONS: Record<RoundStatus, number> = { PENDING: 100000000, VALIDATED: 100000001 };
const WINNER_TEAM_OPTIONS: Record<1 | 2, number> = { 1: 100000000, 2: 100000001 };
/** Le colonne "numero giocatore" (1-7) sono scelte multiple con opzioni "1".."7" in quest'ordine. */
const playerNumberOption = (n: number) => 100000000 + (n - 1);
const multiChoiceValue = (numbers: number[]) => numbers.map(playerNumberOption).join(",");

async function safeSync(label: string, fn: () => Promise<void>) {
  if (!isDataverseEnabled()) return;
  try {
    await fn();
  } catch (err) {
    console.error(`[dataverse-sync] ${label} fallita:`, err instanceof Error ? err.message : err);
  }
}

export async function syncPlayer(player: Player) {
  await safeSync(`player ${player.id}`, () =>
    upsertBySourceId("edo_player", player.id, {
      edo_name: player.name,
      edo_email: player.email ?? null,
      edo_createdat: player.createdAt.toISOString(),
    })
  );
}

/** AppUser non contiene mai l'hash della password: non viene replicato su Dataverse. */
export async function syncAdminUser(user: AppUser) {
  await safeSync(`adminuser ${user.id}`, () =>
    upsertBySourceId("edo_adminuser", user.id, {
      edo_name: user.username ?? user.email,
      edo_username: user.username,
      edo_email: user.email,
      edo_isadmin: user.isAdmin,
      edo_createdat: user.createdAt.toISOString(),
    })
  );
}

export async function syncAdminUserDeleted(userId: string) {
  await safeSync(`delete adminuser ${userId}`, () => deleteBySourceId("edo_adminuser", userId));
}

export async function syncTournamentDeleted(tournamentId: string) {
  await safeSync(`delete tournament ${tournamentId}`, () => deleteBySourceId("edo_tournament", tournamentId));
}

export async function syncPlayerDeleted(playerId: string) {
  await safeSync(`delete player ${playerId}`, () => deleteBySourceId("edo_player", playerId));
}

/** Sincronizzazione completa alla creazione del torneo: torneo, giocatori, turni e match. */
export async function syncTournamentCreated(tournament: Tournament) {
  if (!isDataverseEnabled()) return;

  await safeSync(`tournament ${tournament.id}`, async () => {
    const createdByBind = tournament.createdById
      ? await bindBySourceId("edo_adminuser", tournament.createdById).catch(() => null)
      : null;
    await upsertBySourceId("edo_tournament", tournament.id, {
      edo_name: tournament.name,
      edo_startdate: tournament.startDate.toISOString(),
      edo_status: TOURNAMENT_STATUS_OPTIONS[tournament.status],
      edo_scoringmode: SCORING_MODE_OPTIONS[tournament.scoringMode],
      edo_currentroundnumber: tournament.currentRoundNumber,
      edo_totalrounds: tournament.totalRounds,
      edo_createdat: tournament.createdAt.toISOString(),
      ...(createdByBind ? { "edo_createdby@odata.bind": createdByBind } : {}),
    });
  });

  const tournamentBind = await bindBySourceId("edo_tournament", tournament.id);

  await Promise.allSettled(
    tournament.players.map((tp) =>
      safeSync(`tournamentplayer ${tp.id}`, async () => {
        const playerBind = await bindBySourceId("edo_player", tp.playerId);
        await upsertBySourceId("edo_tournamentplayer", tp.id, {
          edo_name: `${tournament.name} - #${tp.number}`,
          edo_number: tp.number,
          "edo_tournament@odata.bind": tournamentBind,
          "edo_player@odata.bind": playerBind,
        });
      })
    )
  );

  await Promise.allSettled(tournament.rounds.map((round) => syncRound(tournament, round, tournamentBind)));
}

async function syncRound(tournament: Tournament, round: Round, tournamentBind: string) {
  await safeSync(`round ${round.id}`, () =>
    upsertBySourceId("edo_round", round.id, {
      edo_name: `Turno ${round.roundNumber}`,
      edo_roundnumber: round.roundNumber,
      edo_weekstartat: round.weekStartAt.toISOString(),
      edo_status: ROUND_STATUS_OPTIONS[round.status],
      edo_restingnumbers: multiChoiceValue(round.restingNumbers),
      "edo_tournament@odata.bind": tournamentBind,
    })
  );

  if (!round.match) return;
  const roundBind = await bindBySourceId("edo_round", round.id);
  await safeSync(`match ${round.match.id}`, () =>
    upsertBySourceId("edo_match", round.match!.id, {
      edo_name: `${tournament.name} - Turno ${round.roundNumber}`,
      edo_team1numbers: multiChoiceValue(round.match!.team1Numbers),
      edo_team2numbers: multiChoiceValue(round.match!.team2Numbers),
      edo_winnerteam: round.match!.winnerTeam ? WINNER_TEAM_OPTIONS[round.match!.winnerTeam] : null,
      "edo_round@odata.bind": roundBind,
    })
  );
}

/** Dopo l'inserimento/modifica del risultato di un turno: aggiorna match e set. */
export async function syncMatchResult(round: Round) {
  if (!isDataverseEnabled() || !round.match) return;
  const matchId = round.match.id;

  await safeSync(`match ${matchId}`, async () => {
    const roundBind = await bindBySourceId("edo_round", round.id);
    await upsertBySourceId("edo_match", matchId, {
      edo_winnerteam: round.match!.winnerTeam ? WINNER_TEAM_OPTIONS[round.match!.winnerTeam] : null,
      "edo_round@odata.bind": roundBind,
    });
  });

  const matchBind = await bindBySourceId("edo_match", matchId).catch(() => null);
  const submittedSetNumbers = new Set(round.match.sets.map((s) => s.setNumber));

  await Promise.allSettled(
    round.match.sets.map((set) => {
      // id sintetico stabile: il record MatchSet su Postgres viene ricreato ad ogni
      // submit, quindi non possiamo usare il suo id come sourceid.
      const sourceId = `${matchId}_${set.setNumber}`;
      return safeSync(`matchset ${sourceId}`, async () =>
        upsertBySourceId("edo_matchset", sourceId, {
          edo_setnumber: set.setNumber,
          edo_team1games: set.team1Games,
          edo_team2games: set.team2Games,
          ...(matchBind ? { "edo_match@odata.bind": matchBind } : {}),
        })
      );
    })
  );

  // Ripulisce eventuali set rimasti da una precedente sottomissione con piu' set (max 3).
  await Promise.allSettled(
    [1, 2, 3]
      .filter((n) => !submittedSetNumbers.has(n))
      .map((n) => safeSync(`delete matchset ${matchId}_${n}`, () => deleteBySourceId("edo_matchset", `${matchId}_${n}`)))
  );
}

/** Dopo la convalida di un turno: stato del turno + avanzamento/chiusura del torneo. */
export async function syncRoundValidated(
  round: Round,
  tournament: { id: string; currentRoundNumber: number; status: TournamentStatus }
) {
  await safeSync(`round ${round.id} validated`, () =>
    upsertBySourceId("edo_round", round.id, { edo_status: ROUND_STATUS_OPTIONS.VALIDATED })
  );
  await safeSync(`tournament ${tournament.id} progress`, () =>
    upsertBySourceId("edo_tournament", tournament.id, {
      edo_currentroundnumber: tournament.currentRoundNumber,
      edo_status: TOURNAMENT_STATUS_OPTIONS[tournament.status],
    })
  );
}
