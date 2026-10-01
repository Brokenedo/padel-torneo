import { addDays } from "date-fns";
import { prisma } from "../../prisma";
import { DataRepository, CreateTournamentInput, SubmitResultInput } from "../repository";
import { Player, Tournament, Round, Match, SetScore } from "../../types";
import { generateFullSchedule } from "../../pairing";
import { computeWinnerTeam } from "../../matchLogic";
import type {
  Player as PrismaPlayer,
  Round as PrismaRound,
  Match as PrismaMatch,
  MatchSet as PrismaMatchSet,
  TournamentPlayer as PrismaTournamentPlayer,
  Tournament as PrismaTournament,
} from "@prisma/client";

type TournamentWithRelations = PrismaTournament & {
  players: (PrismaTournamentPlayer & { player: PrismaPlayer })[];
  rounds: (PrismaRound & { match: (PrismaMatch & { sets: PrismaMatchSet[] }) | null })[];
};

const tournamentInclude = {
  players: { include: { player: true }, orderBy: { number: "asc" as const } },
  rounds: {
    include: { match: { include: { sets: true } } },
    orderBy: { roundNumber: "asc" as const },
  },
};

function mapPlayer(p: PrismaPlayer): Player {
  return { id: p.id, name: p.name, email: p.email, createdAt: p.createdAt };
}

function mapSets(sets: PrismaMatchSet[]): SetScore[] {
  return sets
    .sort((a, b) => a.setNumber - b.setNumber)
    .map((s) => ({ setNumber: s.setNumber, team1Games: s.team1Games, team2Games: s.team2Games }));
}

function mapMatch(m: (PrismaMatch & { sets: PrismaMatchSet[] }) | null): Match | null {
  if (!m) return null;
  return {
    id: m.id,
    roundId: m.roundId,
    team1Numbers: [m.team1Numbers[0], m.team1Numbers[1]],
    team2Numbers: [m.team2Numbers[0], m.team2Numbers[1]],
    sets: mapSets(m.sets),
    winnerTeam: (m.winnerTeam as 1 | 2 | null) ?? null,
  };
}

function mapRound(r: PrismaRound & { match: (PrismaMatch & { sets: PrismaMatchSet[] }) | null }): Round {
  return {
    id: r.id,
    tournamentId: r.tournamentId,
    roundNumber: r.roundNumber,
    weekStartAt: r.weekStartAt,
    status: r.status,
    restingNumbers: r.restingNumbers,
    match: mapMatch(r.match),
  };
}

function mapTournament(t: TournamentWithRelations): Tournament {
  return {
    id: t.id,
    name: t.name,
    startDate: t.startDate,
    status: t.status,
    scoringMode: t.scoringMode,
    currentRoundNumber: t.currentRoundNumber,
    totalRounds: t.totalRounds,
    createdAt: t.createdAt,
    createdById: t.createdById,
    players: t.players.map((tp) => ({
      id: tp.id,
      tournamentId: tp.tournamentId,
      playerId: tp.playerId,
      number: tp.number,
      player: mapPlayer(tp.player),
    })),
    rounds: t.rounds.map(mapRound),
  };
}

export class PrismaRepository implements DataRepository {
  async findUserByEmail(email: string) {
    const user = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return null;
    return { id: user.id, email: user.email, name: user.name, passwordHash: user.passwordHash };
  }

  async listPlayers(): Promise<Player[]> {
    const players = await prisma.player.findMany({ orderBy: { name: "asc" } });
    return players.map(mapPlayer);
  }

  async createPlayer(input: { name: string; email?: string | null }): Promise<Player> {
    const player = await prisma.player.create({ data: { name: input.name, email: input.email ?? null } });
    return mapPlayer(player);
  }

  async listTournaments(): Promise<Tournament[]> {
    const tournaments = await prisma.tournament.findMany({
      include: tournamentInclude,
      orderBy: { createdAt: "desc" },
    });
    return tournaments.map((t) => mapTournament(t as TournamentWithRelations));
  }

  async getActiveTournament(): Promise<Tournament | null> {
    const t = await prisma.tournament.findFirst({
      where: { status: "ACTIVE" },
      include: tournamentInclude,
      orderBy: { createdAt: "desc" },
    });
    return t ? mapTournament(t as TournamentWithRelations) : null;
  }

  async getTournamentById(id: string): Promise<Tournament | null> {
    const t = await prisma.tournament.findUnique({ where: { id }, include: tournamentInclude });
    return t ? mapTournament(t as TournamentWithRelations) : null;
  }

  async createTournament(input: CreateTournamentInput): Promise<Tournament> {
    if (input.playerIds.length !== 7) {
      throw new Error("Servono esattamente 7 giocatori per creare un torneo");
    }
    const shuffled = [...input.playerIds].sort(() => Math.random() - 0.5);
    const totalRounds = 11;
    const numbers = shuffled.map((_, idx) => idx + 1);
    // Calendario completo calcolato subito alla creazione: tutti i turni mostrano
    // gia' gli accoppiamenti, ma restano "bloccati" (vedi submitMatchResult/validateRound)
    // finche' non e' il loro turno (currentRoundNumber).
    const schedule = generateFullSchedule(numbers, totalRounds);

    const created = await prisma.tournament.create({
      data: {
        name: input.name,
        startDate: input.startDate,
        scoringMode: input.scoringMode,
        totalRounds,
        createdById: input.createdById,
        players: {
          create: shuffled.map((playerId, idx) => ({ playerId, number: idx + 1 })),
        },
        rounds: {
          create: schedule.map((generated, i) => ({
            roundNumber: i + 1,
            weekStartAt: addDays(input.startDate, i * 7),
            restingNumbers: generated.resting,
            match: {
              create: {
                team1Numbers: generated.team1,
                team2Numbers: generated.team2,
              },
            },
          })),
        },
      },
      include: tournamentInclude,
    });

    return mapTournament(created as TournamentWithRelations);
  }

  async deleteTournament(id: string, requestedByUserId: string): Promise<void> {
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: { createdById: true },
    });
    if (!tournament) throw new Error("Torneo non trovato");
    if (tournament.createdById !== requestedByUserId) {
      throw new Error("Solo chi ha creato il torneo puo' eliminarlo");
    }
    await prisma.tournament.delete({ where: { id } });
  }

  async getRound(roundId: string): Promise<Round | null> {
    const round = await prisma.round.findUnique({
      where: { id: roundId },
      include: { match: { include: { sets: true } } },
    });
    return round ? mapRound(round) : null;
  }

  async submitMatchResult(input: SubmitResultInput): Promise<Round> {
    const round = await prisma.round.findUnique({
      where: { id: input.roundId },
      include: { match: { include: { sets: true } }, tournament: true },
    });
    if (!round || !round.match) throw new Error("Turno non trovato");
    if (round.status === "VALIDATED") {
      throw new Error("Il turno e' gia' stato convalidato, non puoi modificare il risultato");
    }
    if (round.roundNumber !== round.tournament.currentRoundNumber) {
      throw new Error("Questo turno non e' ancora attivo: convalida prima i turni precedenti");
    }

    const winnerTeam = computeWinnerTeam(
      input.sets.map((s, idx) => ({ setNumber: idx + 1, ...s }))
    );

    await prisma.$transaction([
      prisma.matchSet.deleteMany({ where: { matchId: round.match.id } }),
      prisma.matchSet.createMany({
        data: input.sets.map((s, idx) => ({
          matchId: round.match!.id,
          setNumber: idx + 1,
          team1Games: s.team1Games,
          team2Games: s.team2Games,
        })),
      }),
      prisma.match.update({ where: { id: round.match.id }, data: { winnerTeam } }),
    ]);

    return (await this.getRound(input.roundId))!;
  }

  async validateRound(roundId: string): Promise<{ round: Round; nextRound: Round | null }> {
    const round = await prisma.round.findUnique({
      where: { id: roundId },
      include: { match: { include: { sets: true } }, tournament: true },
    });
    if (!round || !round.match || round.match.winnerTeam === null) {
      throw new Error("Inserisci il risultato completo prima di convalidare il turno");
    }
    if (round.roundNumber !== round.tournament.currentRoundNumber) {
      throw new Error("Questo turno non e' ancora attivo: convalida prima i turni precedenti");
    }

    await prisma.round.update({ where: { id: roundId }, data: { status: "VALIDATED" } });

    const nextRoundNumber = round.roundNumber + 1;
    const nextRoundExisting = await prisma.round.findFirst({
      where: { tournamentId: round.tournamentId, roundNumber: nextRoundNumber },
    });

    if (nextRoundExisting) {
      await prisma.tournament.update({
        where: { id: round.tournamentId },
        data: { currentRoundNumber: nextRoundNumber },
      });
    } else {
      await prisma.tournament.update({ where: { id: round.tournamentId }, data: { status: "COMPLETED" } });
    }

    const validatedRound = await this.getRound(roundId);
    const nextRound = nextRoundExisting ? await this.getRound(nextRoundExisting.id) : null;
    return { round: validatedRound!, nextRound };
  }
}
