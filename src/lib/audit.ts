import { auth } from "@/lib/auth";
import { getRepository } from "@/lib/data";
import type { AuditAction } from "@/lib/data/repository";

interface AuditEntry {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
}

/**
 * Registra un'operazione CRUD nel log di audit, attribuendola all'utente della
 * sessione corrente. Un errore di scrittura del log non deve mai far fallire
 * l'operazione principale (gia' eseguita): viene solo segnalato in console.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const session = await auth();
    await getRepository().createAuditLog({
      userId: session?.user?.id ?? null,
      username: session?.user?.name ?? "sconosciuto",
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      details: entry.details ?? null,
    });
  } catch (err) {
    console.error("[audit] impossibile scrivere il log:", err);
  }
}
