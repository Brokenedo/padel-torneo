import { addDays } from "date-fns";
import { DataRepository, CreateTournamentInput, SubmitResultInput } from "../repository";
import { Player, Tournament, Round } from "../../types";
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

    const players = shuffled.map((playerId, idx) => {
      const player = store.players.find((p) => p.id === playerId);
      if (!player) throw new Error(`Giocatore ${playerId} non trovato`);
      return {
        id: crypto.randomUUID(),
        tournamentId,
        playerId,
        number: idx + 1,
        player,
      };
    });

    const totalRounds = 11;
    // Calendario completo calcolato subito alla creazione: tutti i turni mostrano
    // gia' gli accoppiamenti, ma restano "bloccati" (vedi submitMatchResult/validateRound)
    // finche' non e' il loro turno (currentRoundNumber).
    const schedule = generateFullSchedule(
      players.map((p) => p.number),
      totalRounds
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
      players,
      rounds,
    };

    store.tournaments.push(tournament);
    return reviveTournamentDates(clone(tournament));
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
}
