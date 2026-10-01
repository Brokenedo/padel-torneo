import { DataRepository } from "./repository";

/**
 * Seleziona l'implementazione del repository:
 * - "mock" (default se DATABASE_URL non e' configurato): dati in-memory, nessun DB reale.
 * - "prisma": Postgres reale tramite Prisma, usato in produzione/staging.
 * Si puo' forzare con la variabile d'ambiente DATA_SOURCE=mock|prisma.
 */
function resolveDataSource(): "mock" | "prisma" {
  const forced = process.env.DATA_SOURCE;
  if (forced === "mock" || forced === "prisma") return forced;
  return process.env.DATABASE_URL ? "prisma" : "mock";
}

let repository: DataRepository | null = null;

export function getRepository(): DataRepository {
  if (!repository) {
    if (resolveDataSource() === "prisma") {
      // import dinamico sincrono: evita di caricare @prisma/client quando si usa il mock
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PrismaRepository } = require("./prisma/prismaRepository") as typeof import("./prisma/prismaRepository");
      repository = new PrismaRepository();
    } else {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { MockRepository } = require("./mock/mockRepository") as typeof import("./mock/mockRepository");
      repository = new MockRepository();
    }
  }
  return repository;
}

export * from "./repository";
