import bcrypt from "bcryptjs";
import { addDays } from "date-fns";
import { DataRepository, CreateTournamentInput, CreateUserInput, SubmitResultInput, CreateAuditLogInput } from "../repository";
import { Player, Tournament, Round, AppUser } from "../../types";
import { getMockStore } from "./mockStore";
import { generateFullSchedule } from "../../pairing";
import { computeWinnerTeam } from "../../matchLogic";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function reviveTournamentDates(tournament: Tournament): Tournament {
  tournament.startDate = new Date(tournament.startDate);
  tournament.createdAt = new Date(tournament.createdAt);
  for (const r of tournament.rounds) reviveRoundDates(r);
  return tournament;
}

function reviveRoundDates(round: Round): Round {
  round.weekStartAt = new Date(round.weekStartAt);
  return round;
}

function revivePlayerDates(player: Player): Player {
  player.createdAt = new Date(player.createdAt);
  return player;
}

export class MockRepository implements DataRepository {
  async findUserByEmail(email: string) {
    const store = getMockStore();
    return store.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
  }

  async findUserById(id: string) {
    const store = getMockStore();
    return store.users.find((u) => u.id === id) ?? null;
  }

  async listUsers(): Promise<AppUser[]> {
    const store = getMockStore();
    return store.users
      .slice()
      .sort((a, b) => a.email.localeCompare(b.email))
      .map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        name: u.name,
        isAdmin: u.isAdmin,
        createdAt: u.createdAt,
      }));
  }

  async createUser(input: CreateUserInput): Promise<AppUser> {
    const store = getMockStore();
    const email = input.email.toLowerCase().trim();
    if (store.users.some((u) => u.email.toLowerCase() === email)) {
      throw new Error("Esiste gia' un utente con questa email");
    }
    if (store.users.some((u) => u.username?.toLowerCase() === input.username.toLowerCase())) {
      throw new Error("Esiste gia' un utente con questo username");
    }

    const user = {
      id: crypto.randomUUID(),
      username: input.username,
      email,
      name: input.username,
      passwordHash: bcrypt.hashSync(input.password, 10),
      isAdmin: input.isAdmin,
      createdAt: new Date(),
    };
    store.users.push(user);

    // Giocatore omonimo creato automaticamente insieme al nuovo utente.
    store.players.push({
      id: crypto.randomUUID(),
      name: input.username,
      email,
      createdAt: new Date(),
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
    };
  }

  async updateUserPassword(id: string, newPasswordHash: string): Promise<void> {
    const store = getMockStore();
    const user = store.users.find((u) => u.id === id);
    if (!user) throw new Error("Utente non trovato");
    user.passwordHash = newPasswordHash;
  }

  async deleteUserAccount(id: string): Promise<{ playerId: string | null; playerDeleted: boolean }> {
    const store = getMockStore();
    const userIdx = store.users.findIndex((u) => u.id === id);
    if (userIdx === -1) throw new Error("Utente non trovato");
    const user = store.users[userIdx];

    if (user.isAdmin && !store.users.some((u) => u.isAdmin && u.id !== id)) {
      throw new Error("Sei l'ultimo amministratore: non puoi eliminare il tuo account");
    }

    const player = store.players.find((p) => p.email?.toLowerCase() === user.email.toLowerCase());
    const memberships = player
      ? store.tournaments.filter((t) => t.players.some((tp) => tp.playerId === player.id))
      : [];
    if (memberships.some((t) => t.status === "ACTIVE")) {
      throw new Error("Stai partecipando a un torneo in corso: non puoi eliminare il tuo account");
    }

    const playerDeleted = !!player && memberships.length === 0;
    if (playerDeleted) {
      store.players.splice(store.players.findIndex((p) => p.id === player!.id), 1);
    }
    store.users.splice(userIdx, 1);
    return { playerId: player?.id ?? null, playerDeleted };
  }

  async listPlayers(): Promise<Player[]> {
    const store = getMockStore();
    return clone(store.players).map(revivePlayerDates);
  }

  async createPlayer(input: { name: string; email?: string | null }): Promise<Player> {
    const store = getMockStore();
    const player: Player = {
      id: crypto.randomUUID(),
      name: input.name,
      email: input.email ?? null,
      createdAt: new Date(),
    };
    store.players.push(player);
    return revivePlayerDates(clone(player));
  }

  async deletePlayer(id: string): Promise<void> {
    const store = getMockStore();
    const idx = store.players.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Giocatore non trovato");
    if (store.tournaments.some((t) => t.players.some((tp) => tp.playerId === id))) {
      throw new Error("Il giocatore partecipa a uno o piu' tornei e non puo' essere eliminato");
    }
    store.players.splice(idx, 1);
  }

  async listTournaments(): Promise<Tournament[]> {
    const store = getMockStore();
    return store.tournaments
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((t) => reviveTournamentDates(clone(t)));
  }

  async getActiveTournament(): Promise<Tournament | null> {
    const store = getMockStore();
    const t = store.tournaments.find((x) => x.status === "ACTIVE");
    return t ? reviveTournamentDates(clone(t)) : null;
  }

  async getTournamentById(id: string): Promise<Tournament | null> {
    const store = getMockStore();
    const t = store.tournaments.find((x) => x.id === id);
    return t ? reviveTournamentDates(clone(t)) : null;
  }

  async createTournament(input: CreateTournamentInput): Promise<Tournament> {
    const store = getMockStore();
    if (input.playerIds.length !== 7) {
      throw new Error("Servono esattamente 7 giocatori per creare un torneo");
    }

    const shuffled = [...input.playerIds].sort(() => Math.random() - 0.5);
    const tournamentId = crypto.randomUUID();
    const avoidExtraMatchesSet = new Set(input.avoidExtraMatchesPlayerIds);

    const players = shuffled.map((playerId, idx) => {
      const player = store.players.find((p) => p.id === playerId);
      if (!player) throw new Error(`Giocatore ${playerId} non trovato`);
      return {
        id: crypto.randomUUID(),
        tournamentId,
        playerId,
        number: idx + 1,
        avoidsExtraMatches: avoidExtraMatchesSet.has(playerId),
        player,
      };
    });

    const totalRounds = 11;
    const avoidExtraMatchNumbers = players.filter((p) => p.avoidsExtraMatches).map((p) => p.number);
    // Calendario completo calcolato subito alla creazione: tutti i turni mostrano
    // gia' gli accoppiamenti, ma restano "bloccati" (vedi submitMatchResult/validateRound)
    // finche' non e' il loro turno (currentRoundNumber).
    const schedule = generateFullSchedule(
      players.map((p) => p.number),
      totalRounds,
      avoidExtraMatchNumbers
    );

    const rounds: Round[] = schedule.map((generated, i) => {
      const roundId = crypto.randomUUID();
      return {
        id: roundId,
        tournamentId,
        roundNumber: i + 1,
        weekStartAt: addDays(input.startDate, i * 7),
        status: "PENDING",
        restingNumbers: generated.resting,
        match: {
          id: crypto.randomUUID(),
          roundId,
          team1Numbers: generated.team1,
          team2Numbers: generated.team2,
          sets: [],
          winnerTeam: null,
        },
      };
    });

    const tournament: Tournament = {
      id: tournamentId,
      name: input.name,
      startDate: input.startDate,
      status: "ACTIVE",
      scoringMode: input.scoringMode,
      currentRoundNumber: 1,
      totalRounds,
      createdAt: new Date(),
      createdById: input.createdById,
      players,
      rounds,
    };

    store.tournaments.push(tournament);
    return reviveTournamentDates(clone(tournament));
  }

  async deleteTournament(id: string, requestedByUserId: string): Promise<void> {
    const store = getMockStore();
    const index = store.tournaments.findIndex((t) => t.id === id);
    if (index === -1) throw new Error("Torneo non trovato");
    if (store.tournaments[index].createdById !== requestedByUserId) {
      throw new Error("Solo chi ha creato il torneo puo' eliminarlo");
    }
    store.tournaments.splice(index, 1);
  }

  async getRound(roundId: string): Promise<Round | null> {
    const store = getMockStore();
    for (const t of store.tournaments) {
      const round = t.rounds.find((r) => r.id === roundId);
      if (round) return reviveRoundDates(clone(round));
    }
    return null;
  }

  async submitMatchResult(input: SubmitResultInput): Promise<Round> {
    const store = getMockStore();
    for (const t of store.tournaments) {
      const round = t.rounds.find((r) => r.id === input.roundId);
      if (round && round.match) {
        if (round.status === "VALIDATED") {
          throw new Error("Il turno e' gia' stato convalidato, non puoi modificare il risultato");
        }
        if (round.roundNumber !== t.currentRoundNumber) {
          throw new Error("Questo turno non e' ancora attivo: convalida prima i turni precedenti");
        }
        round.match.sets = input.sets.map((s, idx) => ({
          setNumber: idx + 1,
          team1Games: s.team1Games,
          team2Games: s.team2Games,
        }));
        round.match.winnerTeam = computeWinnerTeam(round.match.sets);
        return reviveRoundDates(clone(round));
      }
    }
    throw new Error("Turno non trovato");
  }

  async validateRound(roundId: string): Promise<{ round: Round; nextRound: Round | null }> {
    const store = getMockStore();
    for (const t of store.tournaments) {
      const round = t.rounds.find((r) => r.id === roundId);
      if (!round) continue;
      if (round.roundNumber !== t.currentRoundNumber) {
        throw new Error("Questo turno non e' ancora attivo: convalida prima i turni precedenti");
      }
      if (!round.match || round.match.winnerTeam === null) {
        throw new Error("Inserisci il risultato completo prima di convalidare il turno");
      }
      round.status = "VALIDATED";

      const nextRoundNumber = round.roundNumber + 1;
      const nextRound = t.rounds.find((r) => r.roundNumber === nextRoundNumber);

      if (nextRound) {
        t.currentRoundNumber = nextRoundNumber;
      } else {
        t.status = "COMPLETED";
      }

      return {
        round: reviveRoundDates(clone(round)),
        nextRound: nextRound ? reviveRoundDates(clone(nextRound)) : null,
      };
    }
    throw new Error("Turno non trovato");
  }

  async createAuditLog(input: CreateAuditLogInput): Promise<void> {
    getMockStore().auditLogs.push({
      id: `mock-audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date(),
      userId: input.userId,
      username: input.username,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      details: input.details ?? null,
    });
  }
}
