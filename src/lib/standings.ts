import { Tournament } from "./types";
import { computeMatchPoints } from "./matchLogic";

export interface PlayerStanding {
  number: number;
  playerId: string;
  name: string;
  points: number;
  matchesPlayed: number;
  pointsAvg: number; // punti / partite giocate (criterio principale di ordinamento)
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  setDiff: number;
  gameDiff: number;
  setDiffPerMatch: number; // 1° spareggio: (set vinti - set persi) / partite giocate
  gameWinPct: number; // 2° spareggio: game vinti / (game vinti + game persi)
  /** Posizione in classifica: stringa perche' gli ex aequo condividono lo stesso numero
   * seguito da "=" (es. "2=", "2="), stile classifiche sportive. */
  rank: string;
}

interface ValidatedMatch {
  team1Numbers: [number, number];
  team2Numbers: [number, number];
  winnerTeam: 1 | 2;
}

const EPSILON = 1e-9;
const roughlyEqual = (a: number, b: number) => Math.abs(a - b) < EPSILON;

/** Raggruppa (in ordine decrescente per key) gli elementi con lo stesso valore di key. */
function groupByKeyDesc<T>(items: T[], keyFn: (item: T) => number): T[][] {
  const sorted = [...items].sort((a, b) => keyFn(b) - keyFn(a));
  const groups: T[][] = [];
  for (const item of sorted) {
    const last = groups[groups.length - 1];
    if (last && roughlyEqual(keyFn(last[0]), keyFn(item))) {
      last.push(item);
    } else {
      groups.push([item]);
    }
  }
  return groups;
}

/**
 * Calcola, per ciascun giocatore di un gruppo ancora a pari merito, il bilancio
 * vittorie-sconfitte negli scontri diretti SOLO contro gli altri giocatori dello
 * stesso gruppo (3° criterio di spareggio).
 */
function computeHeadToHeadScores(
  group: PlayerStanding[],
  matches: ValidatedMatch[]
): Map<number, number> {
  const groupNumbers = new Set(group.map((p) => p.number));
  const scores = new Map<number, number>();
  for (const p of group) scores.set(p.number, 0);

  for (const m of matches) {
    for (const a of m.team1Numbers) {
      if (!groupNumbers.has(a)) continue;
      for (const b of m.team2Numbers) {
        if (!groupNumbers.has(b)) continue;
        if (m.winnerTeam === 1) {
          scores.set(a, scores.get(a)! + 1);
          scores.set(b, scores.get(b)! - 1);
        } else {
          scores.set(a, scores.get(a)! - 1);
          scores.set(b, scores.get(b)! + 1);
        }
      }
    }
  }
  return scores;
}

// Criteri di spareggio numerici, in ordine: media punti (gia' usata per il raggruppamento
// di partenza), differenza set/partita, percentuale di game vinti (non dipende da quanti
// game si sono giocati in totale, a differenza della differenza assoluta).
const TIEBREAK_CRITERIA: Array<(p: PlayerStanding) => number> = [
  (p) => p.pointsAvg,
  (p) => p.setDiffPerMatch,
  (p) => p.gameWinPct,
];

/**
 * Risolve ricorsivamente un gruppo di giocatori a pari merito applicando i criteri
 * di spareggio in ordine; restituisce "blocchi" di giocatori: un blocco con piu' di
 * un elemento significa che quei giocatori restano in parita' assoluta (ex aequo)
 * anche dopo lo scontro diretto.
 */
function resolveTieGroup(
  group: PlayerStanding[],
  matches: ValidatedMatch[],
  criterionIndex: number
): PlayerStanding[][] {
  if (group.length <= 1) return [group];

  if (criterionIndex >= TIEBREAK_CRITERIA.length) {
    // Esauriti i criteri numerici: scontro diretto, solo tra i membri di questo gruppo.
    const h2hScores = computeHeadToHeadScores(group, matches);
    const subgroups = groupByKeyDesc(group, (p) => h2hScores.get(p.number) ?? 0);
    if (subgroups.length === 1) return [group]; // parita' assoluta -> ex aequo
    return subgroups; // ogni sottogruppo e' gia' il risultato finale (nessun altro criterio dopo lo scontro diretto)
  }

  const subgroups = groupByKeyDesc(group, TIEBREAK_CRITERIA[criterionIndex]);
  if (subgroups.length === 1) {
    // questo criterio non distingue nessuno: prova il successivo
    return resolveTieGroup(group, matches, criterionIndex + 1);
  }
  const blocks: PlayerStanding[][] = [];
  for (const sub of subgroups) blocks.push(...resolveTieGroup(sub, matches, criterionIndex + 1));
  return blocks;
}

/**
 * Classifica individuale del torneo. Regole:
 * - Ogni giocatore prende i punti della squadra con cui ha giocato quella partita.
 * - Criterio principale: MEDIA punti (punti totali / partite giocate), non il totale
 *   grezzo, perche' con 7 giocatori su un numero di turni non divisibile per 7 alcuni
 *   giocano una partita in piu' di altri.
 * - In caso di parita' sulla media, nell'ordine: differenza set/partita, percentuale
 *   di game vinti (game vinti / game totali giocati - non la differenza assoluta,
 *   perche' un match 2-1 ha piu' game totali di uno 2-0), scontro diretto (solo tra
 *   i giocatori ancora a pari merito).
 * - Se la parita' resta assoluta anche dopo lo scontro diretto: ex aequo (stesso
 *   piazzamento, es. "2=").
 * - Contano solo le partite dei turni gia' VALIDATI.
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
      pointsAvg: 0,
      setsWon: 0,
      setsLost: 0,
      gamesWon: 0,
      gamesLost: 0,
      setDiff: 0,
      gameDiff: 0,
      setDiffPerMatch: 0,
      gameWinPct: 0,
      rank: "",
    });
  }

  const validatedMatches: ValidatedMatch[] = [];

  for (const round of tournament.rounds) {
    if (round.status !== "VALIDATED" || !round.match) continue;
    const match = round.match;
    if (match.winnerTeam === null) continue;

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

    validatedMatches.push({
      team1Numbers: match.team1Numbers,
      team2Numbers: match.team2Numbers,
      winnerTeam: match.winnerTeam,
    });
  }

  for (const s of byNumber.values()) {
    s.setDiff = s.setsWon - s.setsLost;
    s.gameDiff = s.gamesWon - s.gamesLost;
    s.pointsAvg = s.matchesPlayed > 0 ? s.points / s.matchesPlayed : 0;
    s.setDiffPerMatch = s.matchesPlayed > 0 ? s.setDiff / s.matchesPlayed : 0;
    const totalGames = s.gamesWon + s.gamesLost;
    s.gameWinPct = totalGames > 0 ? s.gamesWon / totalGames : 0;
  }

  const allPlayers = Array.from(byNumber.values());
  const topGroups = groupByKeyDesc(allPlayers, (p) => p.pointsAvg);

  const blocks: PlayerStanding[][] = [];
  for (const group of topGroups) {
    blocks.push(...resolveTieGroup(group, validatedMatches, 1));
  }

  // Assegna il piazzamento: i membri dello stesso blocco condividono lo stesso numero
  // (con "=" se il blocco ha piu' di un giocatore); il blocco successivo riprende il
  // conteggio dopo tutti i giocatori gia' piazzati (classifica sportiva standard).
  let position = 1;
  const result: PlayerStanding[] = [];
  for (const block of blocks) {
    const rank = block.length > 1 ? `${position}=` : `${position}`;
    for (const p of block) {
      p.rank = rank;
      result.push(p);
    }
    position += block.length;
  }

  return result;
}
