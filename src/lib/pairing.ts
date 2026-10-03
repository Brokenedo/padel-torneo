// Algoritmo di generazione del turno successivo per il torneo di padel a 7 giocatori.
//
// Regole del torneo:
// - 7 giocatori, identificati dai numeri 1-7 (assegnati a sorteggio a inizio torneo).
// - Ogni turno: 4 giocatori in campo (2 coppie), 3 riposano.
// - L'algoritmo e' greedy: ad ogni turno valuta TUTTE le combinazioni possibili
//   (chi riposa + come si accoppiano i 4 in campo) e sceglie quella che minimizza
//   le ripetizioni di: compagni di squadra, avversari e riposi, sulla base
//   dello storico dei turni gia' VALIDATI.
// - Con 7 giocatori e 11 turni non e' possibile evitare del tutto le ripetizioni
//   (21 coppie possibili su 22 "slot" da compagni in 11 turni): l'algoritmo
//   concentra le ripetizioni inevitabili dove pesano meno (costo quadratico).
// - Con 7 giocatori 44 "slot" da titolare in 11 turni non si dividono in parti
//   uguali (44/7): inevitabilmente alcuni giocatori giocano una partita in piu'
//   di altri. I giocatori contrassegnati come "non vuole fare piu' partite degli
//   altri" (avoidExtraMatchNumbers) vengono favoriti nell'assegnazione del riposo,
//   cosi' l'eccedenza di partite ricade il piu' possibile sugli altri (vincolo
//   "soft": se troppi giocatori la richiedono, non e' matematicamente sempre
//   possibile rispettarla per tutti).

export type PlayerNumber = number; // 1-7

// Fattore di sconto sul costo di riposo per i giocatori che preferiscono non fare
// piu' partite degli altri: rende il loro riposo ripetuto "meno caro" per il
// solver, cosi' l'ottimizzatore li fa riposare piu' spesso degli altri.
const AVOID_EXTRA_MATCH_REST_WEIGHT = 1.75;

function buildRestWeights(
  players: PlayerNumber[],
  avoidExtraMatchNumbers: PlayerNumber[]
): Map<PlayerNumber, number> {
  const avoidSet = new Set(avoidExtraMatchNumbers);
  const weights = new Map<PlayerNumber, number>();
  for (const p of players) weights.set(p, avoidSet.has(p) ? AVOID_EXTRA_MATCH_REST_WEIGHT : 1);
  return weights;
}

export interface RoundHistoryEntry {
  team1: [PlayerNumber, PlayerNumber];
  team2: [PlayerNumber, PlayerNumber];
  resting: [PlayerNumber, PlayerNumber, PlayerNumber];
}

export interface GeneratedRound {
  team1: [PlayerNumber, PlayerNumber];
  team2: [PlayerNumber, PlayerNumber];
  resting: [PlayerNumber, PlayerNumber, PlayerNumber];
}

interface Counters {
  partner: Map<string, number>;
  opponent: Map<string, number>;
  rest: Map<PlayerNumber, number>;
}

function pairKey(a: PlayerNumber, b: PlayerNumber): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function buildCounters(players: PlayerNumber[], history: RoundHistoryEntry[]): Counters {
  const partner = new Map<string, number>();
  const opponent = new Map<string, number>();
  const rest = new Map<PlayerNumber, number>();
  for (const p of players) rest.set(p, 0);

  for (const round of history) {
    const [a, b] = round.team1;
    const [c, d] = round.team2;
    partner.set(pairKey(a, b), (partner.get(pairKey(a, b)) ?? 0) + 1);
    partner.set(pairKey(c, d), (partner.get(pairKey(c, d)) ?? 0) + 1);
    for (const x of [a, b]) {
      for (const y of [c, d]) {
        opponent.set(pairKey(x, y), (opponent.get(pairKey(x, y)) ?? 0) + 1);
      }
    }
    for (const r of round.resting) {
      rest.set(r, (rest.get(r) ?? 0) + 1);
    }
  }

  return { partner, opponent, rest };
}

function combinations<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  const backtrack = (start: number, current: T[]) => {
    if (current.length === size) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < items.length; i++) {
      current.push(items[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  };
  backtrack(0, []);
  return result;
}

// Dati 4 giocatori, le 3 partizioni possibili in due coppie (AB|CD, AC|BD, AD|BC).
function teamPartitions(four: PlayerNumber[]): Array<[[PlayerNumber, PlayerNumber], [PlayerNumber, PlayerNumber]]> {
  const [a, b, c, d] = four;
  return [
    [[a, b], [c, d]],
    [[a, c], [b, d]],
    [[a, d], [b, c]],
  ];
}

/**
 * Valuta una singola scelta di turno (resting + coppie) rispetto allo storico corrente.
 * Un leggero rumore casuale (jitter) viene sommato per diversificare i tentativi del
 * solver a tentativi multipli (vedi planNextRound), senza alterare sensibilmente l'ordine
 * tra scelte chiaramente migliori/peggiori.
 */
function scoreCandidate(
  counters: Counters,
  resting: PlayerNumber[],
  team1: [PlayerNumber, PlayerNumber],
  team2: [PlayerNumber, PlayerNumber],
  jitter: number,
  restWeights: Map<PlayerNumber, number>
): number {
  const restCost = resting.reduce((sum, r) => {
    const count = counters.rest.get(r) ?? 0;
    const weight = restWeights.get(r) ?? 1;
    return sum + (count * count) / weight;
  }, 0);

  const partnerCost =
    Math.pow(counters.partner.get(pairKey(team1[0], team1[1])) ?? 0, 2) +
    Math.pow(counters.partner.get(pairKey(team2[0], team2[1])) ?? 0, 2);

  let opponentCost = 0;
  for (const x of team1) {
    for (const y of team2) {
      opponentCost += Math.pow(counters.opponent.get(pairKey(x, y)) ?? 0, 2);
    }
  }

  return restCost * 3 + partnerCost * 6 + opponentCost + jitter;
}

function allCandidates(players: PlayerNumber[]): Array<{
  resting: PlayerNumber[];
  team1: [PlayerNumber, PlayerNumber];
  team2: [PlayerNumber, PlayerNumber];
}> {
  const out: Array<{ resting: PlayerNumber[]; team1: [PlayerNumber, PlayerNumber]; team2: [PlayerNumber, PlayerNumber] }> = [];
  for (const resting of combinations(players, 3)) {
    const playing = players.filter((p) => !resting.includes(p));
    for (const [team1, team2] of teamPartitions(playing)) {
      out.push({ resting, team1, team2 });
    }
  }
  return out;
}

/**
 * Genera il turno immediatamente successivo con una singola scelta greedy
 * (usata internamente da planNextRound per ogni tentativo/simulazione).
 */
export function generateNextRound(
  players: PlayerNumber[],
  history: RoundHistoryEntry[],
  rng: () => number = Math.random,
  avoidExtraMatchNumbers: PlayerNumber[] = []
): GeneratedRound {
  if (players.length !== 7) {
    throw new Error("Il torneo richiede esattamente 7 giocatori");
  }

  const counters = buildCounters(players, history);
  const restWeights = buildRestWeights(players, avoidExtraMatchNumbers);
  const candidates = allCandidates(players);

  let bestCost = Infinity;
  let best: GeneratedRound = {
    team1: candidates[0].team1,
    team2: candidates[0].team2,
    resting: candidates[0].resting as [PlayerNumber, PlayerNumber, PlayerNumber],
  };

  for (const c of candidates) {
    const jitter = rng() * 1e-6;
    const cost = scoreCandidate(counters, c.resting, c.team1, c.team2, jitter, restWeights);
    if (cost < bestCost) {
      bestCost = cost;
      best = { team1: c.team1, team2: c.team2, resting: c.resting as [PlayerNumber, PlayerNumber, PlayerNumber] };
    }
  }

  return best;
}

function totalImbalanceCost(
  players: PlayerNumber[],
  history: RoundHistoryEntry[],
  avoidExtraMatchNumbers: PlayerNumber[] = []
): number {
  const counters = buildCounters(players, history);
  const restWeights = buildRestWeights(players, avoidExtraMatchNumbers);
  let cost = 0;
  for (const count of counters.partner.values()) cost += count * count;
  for (const count of counters.opponent.values()) cost += count * count;
  for (const [player, count] of counters.rest) cost += (count * count) / (restWeights.get(player) ?? 1);
  return cost;
}

/**
 * Calcola il prossimo turno da proporre dato lo storico (turni gia' VALIDATI) del torneo.
 * Esegue piu' simulazioni randomizzate dell'intero calendario rimanente e sceglie quella
 * complessivamente piu' bilanciata, restituendo solo il primo turno della simulazione
 * vincente: e' questo il "ricalcolo automatico" eseguito ogni volta che un turno viene
 * convalidato.
 */
export function planNextRound(
  players: PlayerNumber[],
  history: RoundHistoryEntry[],
  remainingRounds: number,
  attempts = 400,
  avoidExtraMatchNumbers: PlayerNumber[] = []
): GeneratedRound {
  if (remainingRounds <= 0) {
    throw new Error("Nessun turno rimanente da pianificare");
  }

  let bestFirstRound: GeneratedRound | null = null;
  let bestScore = Infinity;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const simulatedHistory = [...history];
    let firstRound: GeneratedRound | null = null;

    for (let step = 0; step < remainingRounds; step++) {
      const next = generateNextRound(players, simulatedHistory, Math.random, avoidExtraMatchNumbers);
      if (step === 0) firstRound = next;
      simulatedHistory.push(next);
    }

    const score = totalImbalanceCost(players, simulatedHistory, avoidExtraMatchNumbers);
    if (score < bestScore) {
      bestScore = score;
      bestFirstRound = firstRound;
    }
  }

  return bestFirstRound as GeneratedRound;
}

/** Genera il calendario completo (es. 11 turni) pianificando un turno alla volta. */
export function generateFullSchedule(
  players: PlayerNumber[],
  totalRounds: number,
  avoidExtraMatchNumbers: PlayerNumber[] = []
): GeneratedRound[] {
  const history: RoundHistoryEntry[] = [];
  const schedule: GeneratedRound[] = [];
  for (let i = 0; i < totalRounds; i++) {
    const next = planNextRound(players, history, totalRounds - i, 400, avoidExtraMatchNumbers);
    schedule.push(next);
    history.push(next);
  }
  return schedule;
}
