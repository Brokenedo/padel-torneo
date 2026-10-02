<#
.SYNOPSIS
  Diagnostica rapida: verifica lo stato della alternate key "edo_sourceid" sulle tabelle
  Dataverse edo_* (causa piu' comune dell'errore "The key in the request URI is not valid").

.NOTES
  Legge le credenziali da variabili d'ambiente (DATAVERSE_URL, DATAVERSE_TENANT_ID,
  DATAVERSE_CLIENT_ID, DATAVERSE_CLIENT_SECRET), mai da parametri in chiaro sulla CLI.
  Eseguire da PowerShell dopo aver caricato .env.local nell'ambiente, es.:
    Get-Content ..\..\.env.local | ForEach-Object {
      if ($_ -match '^(DATAVERSE_[A-Z_]+)\s*=\s*"?([^"]*?)"?\s*$') {
        [System.Environment]::SetEnvironmentVariable($Matches[1], $Matches[2])
      }
    }
#>

$ErrorActionPreference = "Stop"

$DataverseUrl = $env:DATAVERSE_URL
$TenantId = $env:DATAVERSE_TENANT_ID
$ClientId = $env:DATAVERSE_CLIENT_ID
$ClientSecret = $env:DATAVERSE_CLIENT_SECRET

if (-not $DataverseUrl -or -not $TenantId -or -not $ClientId -or -not $ClientSecret) {
  throw "Variabili DATAVERSE_* mancanti nell'ambiente. Caricale da .env.local prima di eseguire lo script."
}
$DataverseUrl = $DataverseUrl.TrimEnd("/")

Write-Output "Richiesta token..."
$tokenBody = @{
  client_id     = $ClientId
  client_secret = $ClientSecret
  grant_type    = "client_credentials"
  scope         = "$DataverseUrl/.default"
}
$tokenResponse = Invoke-RestMethod -Method Post -Uri "https://login.microsoftonline.com/$TenantId/oauth2/v2.0/token" -Body $tokenBody -ContentType "application/x-www-form-urlencoded"
$accessToken = $tokenResponse.access_token
Write-Output "Token ottenuto."

$headers = @{
  Authorization    = "Bearer $accessToken"
  Accept           = "application/json"
  "OData-MaxVersion" = "4.0"
  "OData-Version"    = "4.0"
}

$tables = @("edo_player", "edo_adminuser", "edo_tournament", "edo_tournamentplayer", "edo_round", "edo_match", "edo_matchset")

foreach ($table in $tables) {
  Write-Output "`n--- $table ---"
  try {
    $keysUrl = "$DataverseUrl/api/data/v9.2/EntityDefinitions(LogicalName='$table')/Keys?`$select=SchemaName,LogicalName,KeyAttributes,EntityKeyIndexStatus"
    $keys = Invoke-RestMethod -Method Get -Uri $keysUrl -Headers $headers
    if ($keys.value.Count -eq 0) {
      Write-Output "NESSUNA alternate key trovata su $table."
    } else {
      foreach ($k in $keys.value) {
        Write-Output ("Key: {0} | Attributi: {1} | Stato indice: {2}" -f $k.SchemaName, ($k.KeyAttributes -join ","), $k.EntityKeyIndexStatus)
      }
    }
  } catch {
    Write-Output "Errore nel leggere le key di $table : $($_.Exception.Message)"
  }

  try {
    $attrUrl = "$DataverseUrl/api/data/v9.2/EntityDefinitions(LogicalName='$table')/Attributes(LogicalName='edo_sourceid')?`$select=LogicalName,RequiredLevel"
    $attr = Invoke-RestMethod -Method Get -Uri $attrUrl -Headers $headers
    Write-Output ("Colonna edo_sourceid presente (RequiredLevel: {0})" -f $attr.RequiredLevel.Value)
  } catch {
    Write-Output "Colonna edo_sourceid NON trovata su $table (o errore): $($_.Exception.Message)"
  }
}
