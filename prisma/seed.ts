// Seed per il database Postgres reale (Prisma). Esegui con `npm run db:seed`
// dopo aver configurato DATABASE_URL e lanciato `npm run prisma:migrate`.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("padel123", 10);
  await prisma.adminUser.upsert({
    where: { email: "admin@padel.local" },
    update: {},
    create: { email: "admin@padel.local", username: "admin", name: "Admin", passwordHash, isAdmin: true },
  });

  const names = ["Alice", "Bruno", "Carla", "Davide", "Elena", "Fabio", "Giulia"];
  for (const name of names) {
    const email = `${name.toLowerCase()}@example.com`;
    await prisma.player.upsert({
      where: { id: `seed-${name.toLowerCase()}` },
      update: {},
      create: { id: `seed-${name.toLowerCase()}`, name, email },
    });
  }

  console.log("Seed completato: admin@padel.local / padel123, 7 giocatori di prova.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
