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
