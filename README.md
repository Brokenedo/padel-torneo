# 🎾 Torneo Padel

> 📐 Per l'architettura tecnica completa dell'app (stack, livelli, repository pattern,
> autenticazione/autorizzazione, logica di dominio) e il diagramma ER del database,
> vedi [ARCHITECTURE.md](./ARCHITECTURE.md).

Gestionale per un torneo di padel a 7 giocatori a rotazione: ogni settimana (turno) viene
giocata una partita (2 contro 2, al meglio di 3 set) mentre 3 giocatori riposano. Dopo la
convalida del risultato, il sistema genera automaticamente l'abbinamento del turno
successivo cercando di bilanciare compagni, avversari e riposi.


## Funzionalità Principali

- **Gestione Tornei e Turni**: Creazione tornei, inserimento risultati, avanzamento turni e classifica (3 modalità di punteggio).
- **Algoritmo di Pairing**: Generazione calendario intelligente (`src/lib/pairing.ts`) per evitare doppioni di compagni, avversari e turni di riposo.
- **Autenticazione e Area Riservata**: Accesso admin per gestire i dati e area riservata per modificare la propria password.
- **Audit Log**: Tracciamento di ogni operazione di creazione/modifica/eliminazione nel database.
- **Supporto PWA**: L'app può essere installata su smartphone e desktop. Il Service Worker aggiorna la cache dei file statici ad ogni nuovo rilascio.
- **Sincronizzazione Dataverse (Opzionale)**: Sincronizzazione "best-effort" degli eventi su un sistema Microsoft Dataverse esterno.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS v4)
- **Prisma 6** come ORM per Postgres (produzione/staging)
- **NextAuth v5** (Credentials) per l'autenticazione
- **Repository pattern**: in sviluppo locale, senza configurare `DATABASE_URL`, l'app usa
  automaticamente uno **stub mock in-memory** con dati di esempio (nessun database reale
  necessario). In produzione, impostando `DATABASE_URL`, usa Prisma/Postgres.

## Avvio in locale (con dati mock, nessun DB)

```bash
npm install
cp .env.example .env.local   # genera AUTH_SECRET con: openssl rand -base64 32
npm run dev
```

Apri http://localhost:3000 e accedi con l'utente admin di sviluppo:

- Email: `admin@padel.local`
- Password: `padel123`

Sono gia' presenti 7 giocatori di prova e un torneo attivo al turno 1.

## Verifica dell'algoritmo di abbinamento

```bash
npm run simulate
```

Genera un calendario completo a 11 turni e stampa le matrici "volte compagni" /
"volte avversari" / riposi per controllarne il bilanciamento.

## Passare a un database Postgres reale

1. Imposta `DATABASE_URL` in `.env.local` (es. Postgres locale, Neon, Vercel Postgres...).
2. Esegui le migrazioni e il seed:

   ```bash
   npm run prisma:migrate
   npm run db:seed
   ```

3. Riavvia l'app: rilevando `DATABASE_URL`, il repository userà automaticamente Prisma al
   posto dello stub mock (puoi forzare la scelta con `DATA_SOURCE=mock|prisma`).

## Deploy su Vercel

1. Collega il repository a un progetto Vercel.
2. Configura le variabili d'ambiente: `AUTH_SECRET`, `DATABASE_URL` (Postgres gestito, es.
   Vercel Postgres o Neon).
3. Il comando `postinstall` esegue automaticamente `prisma generate` ad ogni deploy.
4. Esegui le migrazioni sul database di produzione (`npx prisma migrate deploy`) e il seed
   iniziale (admin + giocatori) prima del primo accesso.

## Struttura principale

- `src/lib/pairing.ts` — algoritmo di generazione turni (multi-restart greedy che
  minimizza le ripetizioni di compagni/avversari/riposi).
- `src/lib/stats.ts` — calcolo dinamico delle statistiche (mai persistite).
- `src/lib/data/` — repository pattern: `repository.ts` (interfaccia),
  `mock/` (stub in-memory), `prisma/` (implementazione Postgres reale).
- `src/lib/auth.ts` — configurazione NextAuth (Credentials).
- `src/app/` — pagine (dashboard, gestione giocatori, creazione torneo, dettaglio turno).
