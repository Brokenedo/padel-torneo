// Client HTTP minimale per le Web API di Dataverse (v9.2), usato per sincronizzare
// (best-effort, mai bloccante) le tabelle "edo_*" create con
// scripts/dataverse/Create-DataverseSchema.ps1.
//
// Attivo solo se sono configurate le variabili d'ambiente DATAVERSE_URL,
// DATAVERSE_TENANT_ID, DATAVERSE_CLIENT_ID, DATAVERSE_CLIENT_SECRET: in loro assenza
// (es. sviluppo locale senza Dataverse) isDataverseEnabled() e' false e nessuna
// chiamata viene effettuata.

const API_VERSION = "v9.2";

function getConfig() {
  const url = process.env.DATAVERSE_URL;
  const tenantId = process.env.DATAVERSE_TENANT_ID;
  const clientId = process.env.DATAVERSE_CLIENT_ID;
  const clientSecret = process.env.DATAVERSE_CLIENT_SECRET;
  if (!url || !tenantId || !clientId || !clientSecret) return null;
  return { url: url.replace(/\/$/, ""), tenantId, clientId, clientSecret };
}

export function isDataverseEnabled(): boolean {
  return getConfig() !== null;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const config = getConfig();
  if (!config) throw new Error("Dataverse non configurato");

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "client_credentials",
    scope: `${config.url}/.default`,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    throw new Error(`Autenticazione Dataverse fallita: ${response.status} ${await response.text()}`);
  }
  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

// Risolve il nome della collection (EntitySetName, es. "edo_matches") a partire dal
// nome logico della tabella (es. "edo_match"): evita di indovinare la pluralizzazione
// scelta/generata da Dataverse per ciascuna tabella.
const entitySetCache = new Map<string, string>();

async function resolveEntitySetName(logicalName: string): Promise<string> {
  const cached = entitySetCache.get(logicalName);
  if (cached) return cached;

  const config = getConfig()!;
  const token = await getAccessToken();
  const response = await fetch(
    `${config.url}/api/data/${API_VERSION}/EntityDefinitions(LogicalName='${logicalName}')?$select=EntitySetName`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
  );
  if (!response.ok) {
    throw new Error(`Impossibile risolvere la tabella Dataverse '${logicalName}': ${response.status}`);
  }
  const data = (await response.json()) as { EntitySetName: string };
  entitySetCache.set(logicalName, data.EntitySetName);
  return data.EntitySetName;
}

/**
 * Crea o aggiorna (upsert) un record identificandolo tramite la chiave alternativa
 * "edo_sourceid" (il valore e' l'id del record sorgente in Postgres, o una chiave
 * sintetica stabile per le entita' senza id proprio stabile, es. MatchSet).
 */
export async function upsertBySourceId(
  logicalName: string,
  sourceId: string,
  fields: Record<string, unknown>
): Promise<void> {
  const config = getConfig();
  if (!config) return;

  const token = await getAccessToken();
  const entitySet = await resolveEntitySetName(logicalName);
  const encodedId = encodeURIComponent(sourceId).replace(/'/g, "%27%27");

  const response = await fetch(`${config.url}/api/data/${API_VERSION}/${entitySet}(edo_sourceid='${encodedId}')`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
    },
    body: JSON.stringify({ edo_sourceid: sourceId, ...fields }),
  });

  if (!response.ok) {
    throw new Error(`Upsert Dataverse '${logicalName}' (${sourceId}) fallito: ${response.status} ${await response.text()}`);
  }
}

/** Elimina un record tramite la chiave alternativa "edo_sourceid" (no-op se non esiste). */
export async function deleteBySourceId(logicalName: string, sourceId: string): Promise<void> {
  const config = getConfig();
  if (!config) return;

  const token = await getAccessToken();
  const entitySet = await resolveEntitySetName(logicalName);
  const encodedId = encodeURIComponent(sourceId).replace(/'/g, "%27%27");

  const response = await fetch(`${config.url}/api/data/${API_VERSION}/${entitySet}(edo_sourceid='${encodedId}')`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}`, "OData-MaxVersion": "4.0", "OData-Version": "4.0" },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Delete Dataverse '${logicalName}' (${sourceId}) fallito: ${response.status} ${await response.text()}`);
  }
}

/** Riferimento @odata.bind a un record Dataverse individuato tramite edo_sourceid. */
export async function bindBySourceId(logicalName: string, sourceId: string): Promise<string> {
  const entitySet = await resolveEntitySetName(logicalName);
  const encodedId = encodeURIComponent(sourceId).replace(/'/g, "%27%27");
  return `/${entitySet}(edo_sourceid='${encodedId}')`;
}
