import { Round, TournamentStats } from "./types";

/**
 * Calcola dinamicamente (mai persistite) le statistiche di un torneo a partire
 * dai turni gia' VALIDATI: volte che compagni, volte che avversari, riposi.
 * Le chiavi sono il numero (1-7) del TournamentPlayer, come nelle tabelle
 * mostrate dall'utente.
 */
export function computeStats(players: number[], rounds: Round[]): TournamentStats {
  const partnerCount: TournamentStats["partnerCount"] = {};
  const opponentCount: TournamentStats["opponentCount"] = {};
  const restCount: TournamentStats["restCount"] = {};
  const matchesPlayed: TournamentStats["matchesPlayed"] = {};

  for (const p of players) {
    partnerCount[p] = {};
    opponentCount[p] = {};
    restCount[p] = 0;
    matchesPlayed[p] = 0;
    for (const q of players) {
      partnerCount[p][q] = 0;
      opponentCount[p][q] = 0;
    }
  }

  for (const round of rounds) {
    if (round.status !== "VALIDATED" || !round.match) continue;
    const [a, b] = round.match.team1Numbers;
    const [c, d] = round.match.team2Numbers;
    partnerCount[a][b]++; partnerCount[b][a]++;
    partnerCount[c][d]++; partnerCount[d][c]++;
    for (const x of [a, b]) {
      for (const y of [c, d]) {
        opponentCount[x][y]++;
        opponentCount[y][x]++;
      }
    }
    matchesPlayed[a]++; matchesPlayed[b]++; matchesPlayed[c]++; matchesPlayed[d]++;
    for (const r of round.restingNumbers) {
      restCount[r]++;
    }
  }

  return { partnerCount, opponentCount, restCount, matchesPlayed };
}

export interface PlannedWorkload {
  plannedMatches: Record<number, number>;
  plannedRests: Record<number, number>;
}

/**
 * Calcola quante partite ogni giocatore giochera' nell'intero torneo, considerando
 * TUTTI i turni del calendario gia' generato (a differenza di computeStats, che
 * conta solo i turni gia' VALIDATI): il calendario completo e' noto fin dalla
 * creazione del torneo (vedi generateFullSchedule).
 */
export function computePlannedWorkload(players: number[], rounds: Round[]): PlannedWorkload {
  const plannedMatches: PlannedWorkload["plannedMatches"] = {};
  const plannedRests: PlannedWorkload["plannedRests"] = {};
  for (const p of players) {
    plannedMatches[p] = 0;
    plannedRests[p] = 0;
  }

  for (const round of rounds) {
    if (!round.match) continue;
    for (const x of [...round.match.team1Numbers, ...round.match.team2Numbers]) {
      plannedMatches[x]++;
    }
    for (const r of round.restingNumbers) {
      plannedRests[r]++;
    }
  }

  return { plannedMatches, plannedRests };
}
