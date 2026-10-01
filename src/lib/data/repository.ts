import { Player, Tournament, Round, AuthUser, ScoringMode } from "../types";

export interface CreateTournamentInput {
  name: string;
  startDate: Date;
  playerIds: string[]; // esattamente 7 Player id
  scoringMode: ScoringMode;
  createdById: string;
}

export interface SubmitResultInput {
  roundId: string;
  sets: Array<{ team1Games: number; team2Games: number }>;
}

/**
 * Contratto comune implementato sia dal repository mock (in-memory, per lo sviluppo
 * locale senza database reale) sia dal repository Prisma (Postgres reale, produzione).
 * Le pagine/azioni server devono dipendere SOLO da questa interfaccia, mai
 * direttamente da Prisma o dai dati mock.
 */
export interface DataRepository {
  findUserByEmail(email: string): Promise<AuthUser | null>;

  listPlayers(): Promise<Player[]>;
  createPlayer(input: { name: string; email?: string | null }): Promise<Player>;

  listTournaments(): Promise<Tournament[]>;
  getActiveTournament(): Promise<Tournament | null>;
  getTournamentById(id: string): Promise<Tournament | null>;
  createTournament(input: CreateTournamentInput): Promise<Tournament>;
  /** Elimina il torneo: lancia un errore se requestedByUserId non e' l'admin che l'ha creato. */
  deleteTournament(id: string, requestedByUserId: string): Promise<void>;

  getRound(roundId: string): Promise<Round | null>;
  submitMatchResult(input: SubmitResultInput): Promise<Round>;
  /** Convalida il turno e, se non e' l'ultimo, ricalcola e genera il turno successivo. */
  validateRound(roundId: string): Promise<{ round: Round; nextRound: Round | null }>;
}
