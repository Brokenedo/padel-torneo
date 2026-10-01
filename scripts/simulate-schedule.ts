// Script di verifica manuale dell'algoritmo di pairing: genera un calendario completo
// e stampa le matrici di compagni/avversari/riposi per controllare che sia bilanciato.
// Uso: npm run simulate
import { generateFullSchedule } from "../src/lib/pairing";

const players = [1, 2, 3, 4, 5, 6, 7];
const schedule = generateFullSchedule(players, 11);

console.log("CALENDARIO");
schedule.forEach((r, i) => {
  console.log(
    `T${i + 1}: ${r.team1.join("-")} vs ${r.team2.join("-")} (riposano ${r.resting.join(", ")})`
  );
});

const partner: Record<number, Record<number, number>> = {};
const opponent: Record<number, Record<number, number>> = {};
const rest: Record<number, number> = {};
for (const p of players) {
  partner[p] = {};
  opponent[p] = {};
  rest[p] = 0;
  for (const q of players) {
    partner[p][q] = 0;
    opponent[p][q] = 0;
  }
}

for (const r of schedule) {
  const [a, b] = r.team1;
  const [c, d] = r.team2;
  partner[a][b]++; partner[b][a]++;
  partner[c][d]++; partner[d][c]++;
  for (const x of [a, b]) for (const y of [c, d]) { opponent[x][y]++; opponent[y][x]++; }
  for (const x of r.resting) rest[x]++;
}

console.log("\nVOLTE CHE SIETE COMPAGNI");
console.log("    " + players.slice(1).join("  "));
for (const p of players) {
  console.log(`${p}: ` + players.filter((q) => q > p).map((q) => partner[p][q]).join("  "));
}

console.log("\nVOLTE CHE VI AFFRONTATE");
console.log("    " + players.slice(1).join("  "));
for (const p of players) {
  console.log(`${p}: ` + players.filter((q) => q > p).map((q) => opponent[p][q]).join("  "));
}

console.log("\nRIPOSI PER GIOCATORE");
console.log(rest);
