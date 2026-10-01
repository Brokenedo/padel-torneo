import { SetScore, ScoringMode } from "./types";

/** Determina chi ha vinto il match (meglio dei 3 set), oppure null se non ancora concluso. */
export function computeWinnerTeam(sets: SetScore[]): 1 | 2 | null {
  let team1Sets = 0;
  let team2Sets = 0;
  for (const s of sets) {
    if (s.team1Games > s.team2Games) team1Sets++;
    else if (s.team2Games > s.team1Games) team2Sets++;
  }
  if (team1Sets >= 2) return 1;
  if (team2Sets >= 2) return 2;
  return null;
}

/** Conta i set vinti da ciascuna squadra in un match. */
export function countSetsWon(sets: SetScore[]): { team1Sets: number; team2Sets: number } {
  let team1Sets = 0;
  let team2Sets = 0;
  for (const s of sets) {
    if (s.team1Games > s.team2Games) team1Sets++;
    else if (s.team2Games > s.team1Games) team2Sets++;
  }
  return { team1Sets, team2Sets };
}

/**
 * Calcola i punti individuali (classifica) assegnati a ciascuna squadra per un match
 * concluso, secondo la modalita' di punteggio scelta per il torneo. Se il match non e'
 * ancora concluso (nessuna squadra a 2 set) restituisce 0 punti per entrambe.
 */
export function computeMatchPoints(
  sets: SetScore[],
  scoringMode: ScoringMode
): { team1Points: number; team2Points: number } {
  const { team1Sets, team2Sets } = countSetsWon(sets);
  const winner = team1Sets >= 2 ? 1 : team2Sets >= 2 ? 2 : null;
  if (!winner) return { team1Points: 0, team2Points: 0 };

  switch (scoringMode) {
    case "WIN_ONLY":
      return winner === 1 ? { team1Points: 1, team2Points: 0 } : { team1Points: 0, team2Points: 1 };
    case "SETS_WON":
      return { team1Points: team1Sets, team2Points: team2Sets };
    case "VOLLEYBALL":
    default: {
      const margin = Math.abs(team1Sets - team2Sets); // 2 => 2-0, 1 => 2-1
      const winPoints = margin === 2 ? 3 : 2;
      const losePoints = margin === 2 ? 0 : 1;
      return winner === 1
        ? { team1Points: winPoints, team2Points: losePoints }
        : { team1Points: losePoints, team2Points: winPoints };
    }
  }
}
