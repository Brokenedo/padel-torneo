// Tipi di dominio condivisi tra repository mock e repository Prisma,
// cosi' le pagine/componenti non dipendono mai direttamente dai tipi generati da Prisma.

export type TournamentStatus = "ACTIVE" | "COMPLETED";
export type RoundStatus = "PENDING" | "VALIDATED";
// Modalita' di assegnazione punti individuali, scelta alla creazione del torneo:
// VOLLEYBALL: 2-0 => 3/0, 2-1 => 2/1 | WIN_ONLY: vittoria 1, sconfitta 0 | SETS_WON: punti = set vinti
export type ScoringMode = "VOLLEYBALL" | "WIN_ONLY" | "SETS_WON";

export interface Player {
  id: string;
  name: string;
  email: string | null;
  createdAt: Date;
}

export interface TournamentPlayer {
  id: string;
  tournamentId: string;
  playerId: string;
  number: number; // 1-7, assegnato a sorteggio
  avoidsExtraMatches: boolean; // preferenza: non fare piu' partite degli altri
  player: Player;
}

export interface SetScore {
  setNumber: number;
  team1Games: number;
  team2Games: number;
}

export interface Court {
  id: string;
  name: string;
  createdAt: Date;
}

export interface Match {
  id: string;
  roundId: string;
  team1Numbers: [number, number];
  team2Numbers: [number, number];
  sets: SetScore[];
  winnerTeam: 1 | 2 | null;
  courtId: string | null;
  court?: Court | null;
}

export interface Round {
  id: string;
  tournamentId: string;
  roundNumber: number;
  weekStartAt: Date;
  status: RoundStatus;
  restingNumbers: number[]; // 3 numeri giocatore (1-7) che riposano
  match: Match | null;
}

export interface Tournament {
  id: string;
  name: string;
  startDate: Date;
  status: TournamentStatus;
  scoringMode: ScoringMode;
  currentRoundNumber: number;
  totalRounds: number;
  createdAt: Date;
  createdById: string | null; // admin che ha creato il torneo: solo lui puo' eliminarlo
  players: TournamentPlayer[];
  rounds: Round[];
}

export interface AuthUser {
  id: string;
  username: string | null;
  email: string;
  name: string;
  passwordHash: string;
  isAdmin: boolean;
  createdAt: Date;
}

// Utente applicativo senza passwordHash, per liste/visualizzazioni (sezione gestione utenti).
export interface AppUser {
  id: string;
  username: string | null;
  email: string;
  name: string;
  isAdmin: boolean;
  createdAt: Date;
}

// Statistiche calcolate dinamicamente dallo storico dei round (mai salvate su DB).
export interface TournamentStats {
  // conteggi indicizzati per numero giocatore (1-7)
  partnerCount: Record<number, Record<number, number>>;
  opponentCount: Record<number, Record<number, number>>;
  restCount: Record<number, number>;
  matchesPlayed: Record<number, number>;
}
