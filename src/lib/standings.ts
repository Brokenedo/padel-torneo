import { Tournament } from "./types";
import { computeMatchPoints } from "./matchLogic";

export interface PlayerStanding {
  number: number;
  playerId: string;
  name: string;
  points: number;
  matchesPlayed: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  setDiff: number;
  gameDiff: number;
}

function headToHeadKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/**
 * Classifica individuale del torneo: ogni giocatore prende i punti della squadra con cui
 * ha giocato quella partita (vedi computeMatchPoints). In caso di parita' si applicano,
 * in ordine, i criteri: differenza set, differenza game, scontro diretto.
 */
export function computeStandings(tournament: Tournament): PlayerStanding[] {
  const byNumber = new Map<number, PlayerStanding>();
  for (const tp of tournament.players) {
    byNumber.set(tp.number, {
      number: tp.number,
      playerId: tp.playerId,
      name: tp.player.name,
      points: 0,
      matchesPlayed: 0,
      setsWon: 0,
      setsLost: 0,
      gamesWon: 0,
      gamesLost: 0,
      setDiff: 0,
      gameDiff: 0,
    });
  }

  // Per ogni coppia di giocatori che si sono affrontati: quante volte ha vinto il piu' basso/alto dei due numeri.
  const headToHead = new Map<string, { winsForLower: number; winsForHigher: number }>();

  for (const round of tournament.rounds) {
    if (round.status !== "VALIDATED" || !round.match) continue;
    const match = round.match;

    let team1Sets = 0;
    let team2Sets = 0;
    let team1Games = 0;
    let team2Games = 0;
    for (const s of match.sets) {
      team1Games += s.team1Games;
      team2Games += s.team2Games;
      if (s.team1Games > s.team2Games) team1Sets++;
      else if (s.team2Games > s.team1Games) team2Sets++;
    }

    const { team1Points, team2Points } = computeMatchPoints(match.sets, tournament.scoringMode);

    for (const n of match.team1Numbers) {
      const s = byNumber.get(n);
      if (!s) continue;
      s.points += team1Points;
      s.matchesPlayed++;
      s.setsWon += team1Sets;
      s.setsLost += team2Sets;
      s.gamesWon += team1Games;
      s.gamesLost += team2Games;
    }
    for (const n of match.team2Numbers) {
      const s = byNumber.get(n);
      if (!s) continue;
      s.points += team2Points;
      s.matchesPlayed++;
      s.setsWon += team2Sets;
      s.setsLost += team1Sets;
      s.gamesWon += team2Games;
      s.gamesLost += team1Games;
    }

    for (const a of match.team1Numbers) {
      for (const b of match.team2Numbers) {
        const key = headToHeadKey(a, b);
        const entry = headToHead.get(key) ?? { winsForLower: 0, winsForHigher: 0 };
        const lower = Math.min(a, b);
        const team1Won = match.winnerTeam === 1;
        const aIsLower = a === lower;
        if (team1Won === aIsLower) entry.winsForLower++;
        else entry.winsForHigher++;
        headToHead.set(key, entry);
      }
    }
  }

  for (const s of byNumber.values()) {
    s.setDiff = s.setsWon - s.setsLost;
    s.gameDiff = s.gamesWon - s.gamesLost;
  }

  function headToHeadCompare(a: PlayerStanding, b: PlayerStanding): number {
    const entry = headToHead.get(headToHeadKey(a.number, b.number));
    if (!entry) return 0;
    const lower = Math.min(a.number, b.number);
    const aWins = a.number === lower ? entry.winsForLower : entry.winsForHigher;
    const bWins = b.number === lower ? entry.winsForLower : entry.winsForHigher;
    if (aWins === bWins) return 0;
    return aWins > bWins ? -1 : 1;
  }

  return Array.from(byNumber.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
    if (b.gameDiff !== a.gameDiff) return b.gameDiff - a.gameDiff;
    const h2h = headToHeadCompare(a, b);
    if (h2h !== 0) return h2h;
    return a.number - b.number;
  });
}
