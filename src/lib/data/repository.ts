import { Player, Tournament, Round, AuthUser, AppUser, ScoringMode } from "../types";

export interface CreateTournamentInput {
  name: string;
  startDate: Date;
  playerIds: string[]; // esattamente 7 Player id
  // sottoinsieme di playerIds: giocatori che preferiscono non fare piu' partite degli altri
  avoidExtraMatchesPlayerIds: string[];
  scoringMode: ScoringMode;
  createdById: string;
}

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  isAdmin: boolean;
}

export interface SubmitResultInput {
  roundId: string;
  sets: Array<{ team1Games: number; team2Games: number }>;
}

export type AuditAction = "CREATE" | "UPDATE" | "DELETE";

export interface CreateAuditLogInput {
  userId: string | null;
  username: string;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
}

/**
 * Contratto comune implementato sia dal repository mock (in-memory, per lo sviluppo
 * locale senza database reale) sia dal repository Prisma (Postgres reale, produzione).
 * Le pagine/azioni server devono dipendere SOLO da questa interfaccia, mai
 * direttamente da Prisma o dai dati mock.
 */
export interface DataRepository {
  findUserByEmail(email: string): Promise<AuthUser | null>;
  listUsers(): Promise<AppUser[]>;
  /** Crea un nuovo utente e, in automatico, un giocatore omonimo. */
  createUser(input: CreateUserInput): Promise<AppUser>;

  listPlayers(): Promise<Player[]>;
  createPlayer(input: { name: string; email?: string | null }): Promise<Player>;
  /** Elimina il giocatore: lancia un errore se non esiste o partecipa ad almeno un torneo. */
  deletePlayer(id: string): Promise<void>;

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

  /** Registra un'operazione CRUD nel log di audit. */
  createAuditLog(input: CreateAuditLogInput): Promise<void>;
}
