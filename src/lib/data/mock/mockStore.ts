import bcrypt from "bcryptjs";
import { addDays } from "date-fns";
import { AuthUser, Player, Tournament, TournamentPlayer, Round } from "../../types";

/**
 * Store in-memory per lo sviluppo locale senza database reale.
 * Usa globalThis per sopravvivere agli hot-reload di Next.js in dev (stesso trucco
 * usato per il singleton di PrismaClient).
 */
interface MockStore {
  users: AuthUser[];
  players: Player[];
  courts: import("../../types").Court[];
  tournaments: Tournament[];
  auditLogs: MockAuditLog[];
}

interface MockAuditLog {
  id: string;
  createdAt: Date;
  userId: string | null;
  username: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
}

const globalForMock = globalThis as unknown as { __mockStore?: MockStore };

function seed(): MockStore {
  const players: Player[] = [
    "Alice", "Bruno", "Carla", "Davide", "Elena", "Fabio", "Giulia",
  ].map((name, i) => ({
    id: `seed-player-${i + 1}`,
    name,
    email: `${name.toLowerCase()}@example.com`,
    createdAt: new Date(),
  }));

  const users: AuthUser[] = [
    {
      id: "seed-admin-1",
      username: "admin",
      email: "admin@padel.local",
      name: "Admin",
      // password mock: "padel123" (solo per sviluppo locale)
      passwordHash: bcrypt.hashSync("padel123", 10),
      isAdmin: true,
      createdAt: new Date(),
    },
  ];

  const tournamentPlayers: TournamentPlayer[] = players.map((p, i) => ({
    id: `seed-tp-${i + 1}`,
    tournamentId: "seed-tournament-1",
    playerId: p.id,
    number: i + 1,
    avoidsExtraMatches: false,
    player: p,
  }));

  const firstRound: Round = {
    id: "seed-round-1",
    tournamentId: "seed-tournament-1",
    roundNumber: 1,
    weekStartAt: new Date(),
    status: "PENDING",
    restingNumbers: [5, 6, 7],
    match: {
      id: "seed-match-1",
      roundId: "seed-round-1",
      team1Numbers: [1, 3],
      team2Numbers: [2, 4],
      sets: [],
      winnerTeam: null,
      courtId: null,
    },
  };

  const rounds: Round[] = [firstRound];
  for (let n = 2; n <= 11; n++) {
    rounds.push({
      id: `seed-round-${n}`,
      tournamentId: "seed-tournament-1",
      roundNumber: n,
      weekStartAt: addDays(new Date(), (n - 1) * 7),
      status: "PENDING",
      restingNumbers: [],
      match: null,
    });
  }

  const tournaments: Tournament[] = [
    {
      id: "seed-tournament-1",
      name: "Torneo di prova",
      startDate: new Date(),
      status: "ACTIVE",
      scoringMode: "VOLLEYBALL",
      currentRoundNumber: 1,
      totalRounds: 11,
      createdAt: new Date(),
      createdById: "seed-admin-1",
      players: tournamentPlayers,
      rounds,
    },
  ];

  return { users, players, courts: [], tournaments, auditLogs: [] };
}

export function getMockStore(): MockStore {
  if (!globalForMock.__mockStore) {
    globalForMock.__mockStore = seed();
  }
  // store creato prima dell'introduzione dei log (hot-reload in dev)
  globalForMock.__mockStore.auditLogs ??= [];
  return globalForMock.__mockStore;
}
