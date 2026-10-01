import { SetScore } from "./types";
import { RoundHistoryEntry } from "./pairing";
import { Round } from "./types";

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

/** Costruisce lo storico (solo turni convalidati) da passare all'algoritmo di pairing. */
export function buildHistoryFromRounds(rounds: Round[]): RoundHistoryEntry[] {
  return rounds
    .filter((r) => r.status === "VALIDATED" && r.match)
    .sort((a, b) => a.roundNumber - b.roundNumber)
    .map((r) => ({
      team1: r.match!.team1Numbers,
      team2: r.match!.team2Numbers,
      resting: r.restingNumbers as [number, number, number],
    }));
}
