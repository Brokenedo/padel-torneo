<#
.SYNOPSIS
  Replica lo schema del database dell'app "Torneo Padel" come tabelle custom in
  Microsoft Dataverse (Dynamics 365 / Power Platform), con prefisso "edo_".

.DESCRIPTION
  Dataverse NON ammette trattini nei nomi logici (solo lettere minuscole, numeri e
  underscore), quindi il prefisso richiesto "edo-" diventa "edo_" (es. edo_tournament).

  Lo script usa le API di metadata di Dataverse (Web API v9.2) per creare, in modo
  idempotente (ri-eseguibile senza errori se le tabelle esistono gia'):
    1. Le tabelle (EntityDefinitions) con la colonna "nome primario" obbligatoria.
    2. Le colonne semplici (testo, numero, data, booleano, scelta/choice).
    3. Le relazioni 1:N (lookup) tra le tabelle, con comportamento di cancellazione
       equivalente a `onDelete` dello schema Prisma originale.
    4. Le chiavi alternative (vincoli di unicita') che replicano i `@@unique` di Prisma.
    5. La pubblicazione finale delle personalizzazioni.

  Mappatura dal modello Prisma originale (prisma/schema.prisma):
    AdminUser -> edo_adminuser
    Player -> edo_player
    Tournament -> edo_tournament
    TournamentPlayer -> edo_tournamentplayer
    Round -> edo_round
    Match -> edo_match
    MatchSet -> edo_matchset

  Le colonne Int[] di Prisma (restingNumbers, team1Numbers, team2Numbers, che
  contengono sempre numeri 1-7) sono replicate come colonne "Choice a selezione
  multipla" (MultiSelectPicklist) con opzioni 1-7, perche' Dataverse non ha un tipo
  nativo "array di interi".

.NOTES
  SICUREZZA: la tabella AdminUser include per completezza la colonna edo_passwordhash.
  Replicare hash di password (anche se bcrypt) in un secondo sistema e' una decisione
  sensibile dal punto di vista della sicurezza/compliance: valuta se escluderla
  (basta rimuoverla dall'array $Tables sotto) o se cifrarla ulteriormente a livello di
  integrazione. Lo script la crea solo perche' presente nello schema originale.

.PARAMETER DataverseUrl
  URL dell'ambiente Dataverse, es. https://orgXXXXXXXX.crm4.dynamics.com

.PARAMETER TenantId
  Tenant ID di Microsoft Entra ID (Azure AD).

.PARAMETER ClientId
  App ID della App Registration (Application User) con permessi su Dataverse
  (System Administrator o ruolo custom con privilegi di creazione metadata).

.PARAMETER ClientSecret
  Client secret della App Registration.

.NOTES
  SICUREZZA: non passare mai -ClientSecret come argomento letterale su una riga di
  comando condivisa/salvata (finisce nella cronologia della shell in chiaro). Imposta
  invece le variabili d'ambiente DATAVERSE_URL / DATAVERSE_TENANT_ID /
  DATAVERSE_CLIENT_ID / DATAVERSE_CLIENT_SECRET prima di lanciare lo script (i
  parametri, se omessi, vengono letti automaticamente da li'). Se hai gia' passato un
  client secret in chiaro nel terminale, considéralo compromesso e rigeneralo subito
  dall'App Registration in Microsoft Entra ID.

.EXAMPLE
  $env:DATAVERSE_URL = "https://org12345.crm4.dynamics.com"
  $env:DATAVERSE_TENANT_ID = "11111111-1111-1111-1111-111111111111"
  $env:DATAVERSE_CLIENT_ID = "22222222-2222-2222-2222-222222222222"
  $env:DATAVERSE_CLIENT_SECRET = Read-Host "Client secret" -AsSecureString | ConvertFrom-SecureString -AsPlainText
  ./Create-DataverseSchema.ps1
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)][string]$DataverseUrl = $env:DATAVERSE_URL,
    [Parameter(Mandatory = $false)][string]$TenantId = $env:DATAVERSE_TENANT_ID,
    [Parameter(Mandatory = $false)][string]$ClientId = $env:DATAVERSE_CLIENT_ID,
    [Parameter(Mandatory = $false)][string]$ClientSecret = $env:DATAVERSE_CLIENT_SECRET,
    [string]$Prefix = "edo_",
    [int]$LanguageCode = 1033
)

if (-not $DataverseUrl -or -not $TenantId -or -not $ClientId -or -not $ClientSecret) {
    throw "Credenziali mancanti: imposta DATAVERSE_URL/DATAVERSE_TENANT_ID/DATAVERSE_CLIENT_ID/DATAVERSE_CLIENT_SECRET (variabili d'ambiente) oppure passa i parametri -DataverseUrl/-TenantId/-ClientId/-ClientSecret."
}

$ErrorActionPreference = "Stop"
$ApiVersion = "v9.2"
$DataverseUrl = $DataverseUrl.TrimEnd("/")
$ApiUrl = "$DataverseUrl/api/data/$ApiVersion"

# ---------------------------------------------------------------------------
# 1. Autenticazione (OAuth2 client credentials contro Microsoft Entra ID)
# ---------------------------------------------------------------------------
function Get-DataverseToken {
    $tokenUrl = "https://login.microsoftonline.com/$TenantId/oauth2/v2.0/token"
    $body = @{
        client_id     = $ClientId
        client_secret = $ClientSecret
        grant_type    = "client_credentials"
        scope         = "$DataverseUrl/.default"
    }
    $response = Invoke-RestMethod -Uri $tokenUrl -Method Post -Body $body -ContentType "application/x-www-form-urlencoded"
    return $response.access_token
}

$script:Token = Get-DataverseToken
$script:TokenIssuedAt = Get-Date

function Get-AuthHeaders {
    # Rinnova il token se vicino alla scadenza (i token Entra ID durano ~1 ora)
    if ((Get-Date) -gt $script:TokenIssuedAt.AddMinutes(50)) {
        $script:Token = Get-DataverseToken
        $script:TokenIssuedAt = Get-Date
    }
    return @{
        Authorization    = "Bearer $script:Token"
        "OData-MaxVersion" = "4.0"
        "OData-Version"    = "4.0"
        Accept             = "application/json"
        "Content-Type"     = "application/json; charset=utf-8"
    }
}

function Invoke-Dataverse {
    param(
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Path,
        [object]$Body = $null,
        [switch]$AllowNotFound
    )
    $uri = "$ApiUrl/$Path"
    $headers = Get-AuthHeaders
    try {
        if ($null -ne $Body) {
            $json = $Body | ConvertTo-Json -Depth 12
            return Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers -Body $json
        }
        return Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($AllowNotFound -and $statusCode -eq 404) { return $null }
        Write-Host "Errore chiamando $Method $Path" -ForegroundColor Red
        if ($_.ErrorDetails) { Write-Host $_.ErrorDetails.Message -ForegroundColor Red }
        throw
    }
}

function New-Label([string]$Text) {
    return @{
        "@odata.type"    = "Microsoft.Dynamics.CRM.Label"
        LocalizedLabels  = @(@{ "@odata.type" = "Microsoft.Dynamics.CRM.LocalizedLabel"; Label = $Text; LanguageCode = $LanguageCode })
    }
}

function Test-TableExists([string]$LogicalName) {
    $result = Invoke-Dataverse -Method GET -Path "EntityDefinitions(LogicalName='$LogicalName')?`$select=LogicalName" -AllowNotFound
    return $null -ne $result
}

function Test-AttributeExists([string]$EntityLogicalName, [string]$AttributeLogicalName) {
    $result = Invoke-Dataverse -Method GET `
        -Path "EntityDefinitions(LogicalName='$EntityLogicalName')/Attributes(LogicalName='$AttributeLogicalName')?`$select=LogicalName" `
        -AllowNotFound
    return $null -ne $result
}

# ---------------------------------------------------------------------------
# 2. Definizione dello schema (dati -> replica 1:1 di prisma/schema.prisma)
# ---------------------------------------------------------------------------

# Colonne "semplici" per tabella (senza lookup, aggiunte dopo la creazione della tabella).
# Type: Text | Integer | DateTime | Boolean | Choice | MultiChoice
$Tables = @(
    @{
        Name          = "adminuser"
        DisplayName   = "Admin User"
        PrimaryColumn = "name"
        PrimaryMax    = 200
        Columns       = @(
            @{ Name = "sourceid";     Type = "Text";     Max = 100; Required = $true } # id Postgres, chiave di sincronizzazione
            @{ Name = "username";     Type = "Text";     Max = 100 }
            @{ Name = "email";        Type = "Text";     Max = 150; Required = $true }
            @{ Name = "passwordhash"; Type = "Text";     Max = 500 } # vedi nota di sicurezza in testa al file
            @{ Name = "isadmin";      Type = "Boolean" }
            @{ Name = "createdat";    Type = "DateTime" }
        )
        AlternateKeys = @(
            @{ Name = "sourceid_key"; Attributes = @("sourceid") }
            @{ Name = "username_key"; Attributes = @("username") }
            @{ Name = "email_key";    Attributes = @("email") }
        )
    },
    @{
        Name          = "player"
        DisplayName   = "Player"
        PrimaryColumn = "name"
        PrimaryMax    = 200
        Columns       = @(
            @{ Name = "sourceid"; Type = "Text"; Max = 100; Required = $true }
            @{ Name = "email";     Type = "Text"; Max = 150 }
            @{ Name = "createdat"; Type = "DateTime" }
        )
        AlternateKeys = @(
            @{ Name = "sourceid_key"; Attributes = @("sourceid") }
        )
    },
    @{
        Name          = "tournament"
        DisplayName   = "Tournament"
        PrimaryColumn = "name"
        PrimaryMax    = 200
        Columns       = @(
            @{ Name = "sourceid";           Type = "Text"; Max = 100; Required = $true }
            @{ Name = "startdate";          Type = "DateTime" }
            @{ Name = "status";             Type = "Choice"; Options = @("ACTIVE", "COMPLETED") }
            @{ Name = "scoringmode";        Type = "Choice"; Options = @("VOLLEYBALL", "WIN_ONLY", "SETS_WON") }
            @{ Name = "currentroundnumber"; Type = "Integer" }
            @{ Name = "totalrounds";        Type = "Integer" }
            @{ Name = "createdat";          Type = "DateTime" }
        )
        AlternateKeys = @(
            @{ Name = "sourceid_key"; Attributes = @("sourceid") }
        )
    },
    @{
        Name          = "tournamentplayer"
        DisplayName   = "Tournament Player"
        PrimaryColumn = "name" # etichetta sintetica, es. "Torneo X - #3"
        PrimaryMax    = 200
        Columns       = @(
            @{ Name = "sourceid"; Type = "Text"; Max = 100; Required = $true }
            @{ Name = "number"; Type = "Integer"; Required = $true }
        )
        AlternateKeys = @(
            @{ Name = "sourceid_key";          Attributes = @("sourceid") }
            @{ Name = "tournament_number_key"; Attributes = @("tournament", "number") }
            @{ Name = "tournament_player_key"; Attributes = @("tournament", "player") }
        )
    },
    @{
        Name          = "round"
        DisplayName   = "Round"
        PrimaryColumn = "name" # es. "Turno 3"
        PrimaryMax    = 200
        Columns       = @(
            @{ Name = "sourceid";        Type = "Text"; Max = 100; Required = $true }
            @{ Name = "roundnumber";     Type = "Integer"; Required = $true }
            @{ Name = "weekstartat";     Type = "DateTime" }
            @{ Name = "status";          Type = "Choice"; Options = @("PENDING", "VALIDATED") }
            @{ Name = "restingnumbers";  Type = "MultiChoice"; Options = @("1", "2", "3", "4", "5", "6", "7") }
        )
        AlternateKeys = @(
            @{ Name = "sourceid_key"; Attributes = @("sourceid") }
            @{ Name = "tournament_roundnumber_key"; Attributes = @("tournament", "roundnumber") }
        )
    },
    @{
        Name          = "match"
        DisplayName   = "Match"
        PrimaryColumn = "name"
        PrimaryMax    = 200
        Columns       = @(
            @{ Name = "sourceid";     Type = "Text"; Max = 100; Required = $true }
            @{ Name = "team1numbers"; Type = "MultiChoice"; Options = @("1", "2", "3", "4", "5", "6", "7") }
            @{ Name = "team2numbers"; Type = "MultiChoice"; Options = @("1", "2", "3", "4", "5", "6", "7") }
            @{ Name = "winnerteam";   Type = "Choice"; Options = @("1", "2") }
        )
        AlternateKeys = @(
            @{ Name = "sourceid_key"; Attributes = @("sourceid") }
            @{ Name = "round_key"; Attributes = @("round") } # round e' 1:1, l'alternate key lo rende univoco
        )
    },
    @{
        Name          = "matchset"
        DisplayName   = "Match Set"
        PrimaryColumn = "name"
        PrimaryMax    = 200
        Columns       = @(
            # sourceid = "{matchId}_{setNumber}", NON l'id della riga MatchSet (che viene ricreata ad ogni nuovo inserimento risultato)
            @{ Name = "sourceid";    Type = "Text"; Max = 100; Required = $true }
            @{ Name = "setnumber";   Type = "Integer"; Required = $true }
            @{ Name = "team1games";  Type = "Integer"; Required = $true }
            @{ Name = "team2games";  Type = "Integer"; Required = $true }
        )
        AlternateKeys = @(
            @{ Name = "sourceid_key"; Attributes = @("sourceid") }
            @{ Name = "match_setnumber_key"; Attributes = @("match", "setnumber") }
        )
    }
)

# Relazioni 1:N (lookup). Delete: Cascade | RemoveLink | Restrict (equivalenti a
# onDelete Cascade / SetNull / (default) Restrict in Prisma).
$Relationships = @(
    @{ Child = "tournament";        Parent = "adminuser";   LookupName = "createdby";   Required = $false; Delete = "RemoveLink" }
    @{ Child = "tournamentplayer";  Parent = "tournament";   LookupName = "tournament";  Required = $true;  Delete = "Cascade" }
    @{ Child = "tournamentplayer";  Parent = "player";       LookupName = "player";      Required = $true;  Delete = "Restrict" }
    @{ Child = "round";             Parent = "tournament";   LookupName = "tournament";  Required = $true;  Delete = "Cascade" }
    @{ Child = "match";             Parent = "round";        LookupName = "round";       Required = $true;  Delete = "Cascade" }
    @{ Child = "matchset";          Parent = "match";        LookupName = "match";       Required = $true;  Delete = "Cascade" }
)

# ---------------------------------------------------------------------------
# 3. Funzioni di creazione (tabelle, colonne, relazioni, chiavi)
# ---------------------------------------------------------------------------

function New-RequiredLevel([bool]$Required) {
    return @{ Value = if ($Required) { "ApplicationRequired" } else { "None" } }
}

function New-SimpleAttributeBody([hashtable]$Column, [string]$Prefix) {
    $logicalName = "$Prefix$($Column.Name)"
    $required = New-RequiredLevel([bool]($Column.Required))
    $display = New-Label($Column.Name)

    switch ($Column.Type) {
        "Text" {
            $maxLength = if ($Column.Max) { $Column.Max } else { 200 }
            return @{
                "@odata.type"  = "Microsoft.Dynamics.CRM.StringAttributeMetadata"
                SchemaName     = $logicalName
                DisplayName    = $display
                RequiredLevel  = $required
                MaxLength      = $maxLength
            }
        }
        "Integer" {
            # Dataverse non supporta un valore di default a livello di metadata colonna:
            # i default (es. totalRounds=11) li imposta l'app quando sincronizza il record.
            return @{
                "@odata.type"  = "Microsoft.Dynamics.CRM.IntegerAttributeMetadata"
                SchemaName     = $logicalName
                DisplayName    = $display
                RequiredLevel  = $required
                Format         = "None"
                MinValue       = -2147483648
                MaxValue       = 2147483647
            }
        }
        "DateTime" {
            return @{
                "@odata.type"  = "Microsoft.Dynamics.CRM.DateTimeAttributeMetadata"
                SchemaName     = $logicalName
                DisplayName    = $display
                RequiredLevel  = $required
                Format         = "DateAndTime"
            }
        }
        "Boolean" {
            return @{
                "@odata.type"  = "Microsoft.Dynamics.CRM.BooleanAttributeMetadata"
                SchemaName     = $logicalName
                DisplayName    = $display
                RequiredLevel  = $required
                OptionSet      = @{
                    "@odata.type" = "Microsoft.Dynamics.CRM.BooleanOptionSetMetadata"
                    TrueOption    = @{ Value = 1; Label = (New-Label "True") }
                    FalseOption   = @{ Value = 0; Label = (New-Label "False") }
                }
            }
        }
        "Choice" {
            $options = @()
            for ($i = 0; $i -lt $Column.Options.Count; $i++) {
                $options += @{ Value = (100000000 + $i); Label = (New-Label $Column.Options[$i]) }
            }
            return @{
                "@odata.type"  = "Microsoft.Dynamics.CRM.PicklistAttributeMetadata"
                SchemaName     = $logicalName
                DisplayName    = $display
                RequiredLevel  = $required
                OptionSet      = @{
                    "@odata.type"  = "Microsoft.Dynamics.CRM.OptionSetMetadata"
                    IsGlobal       = $false
                    OptionSetType  = "Picklist"
                    Options        = $options
                }
            }
        }
        "MultiChoice" {
            $options = @()
            for ($i = 0; $i -lt $Column.Options.Count; $i++) {
                $options += @{ Value = (100000000 + $i); Label = (New-Label $Column.Options[$i]) }
            }
            return @{
                "@odata.type"  = "Microsoft.Dynamics.CRM.MultiSelectPicklistAttributeMetadata"
                SchemaName     = $logicalName
                DisplayName    = $display
                RequiredLevel  = $required
                OptionSet      = @{
                    "@odata.type"  = "Microsoft.Dynamics.CRM.OptionSetMetadata"
                    IsGlobal       = $false
                    OptionSetType  = "Picklist"
                    Options        = $options
                }
            }
        }
        default { throw "Tipo colonna non gestito: $($Column.Type)" }
    }
}

function New-DataverseTable([hashtable]$Table, [string]$Prefix) {
    $logicalName = "$Prefix$($Table.Name)"
    if (Test-TableExists $logicalName) {
        Write-Host "  [=] Tabella $logicalName gia' presente, salto la creazione" -ForegroundColor DarkGray
        return
    }
    Write-Host "  [+] Creo tabella $logicalName" -ForegroundColor Cyan

    $primaryLogicalName = "$Prefix$($Table.PrimaryColumn)"
    $body = @{
        "@odata.type"         = "Microsoft.Dynamics.CRM.EntityMetadata"
        SchemaName            = $logicalName
        DisplayName           = New-Label $Table.DisplayName
        DisplayCollectionName = New-Label "$($Table.DisplayName)s"
        OwnershipType         = "UserOwned"
        HasNotes              = $false
        HasActivities         = $false
        Attributes            = @(
            @{
                "@odata.type" = "Microsoft.Dynamics.CRM.StringAttributeMetadata"
                SchemaName    = $primaryLogicalName
                DisplayName   = New-Label $Table.PrimaryColumn
                RequiredLevel = New-RequiredLevel $true
                MaxLength     = $Table.PrimaryMax
                IsPrimaryName = $true
            }
        )
    }
    Invoke-Dataverse -Method POST -Path "EntityDefinitions" -Body $body | Out-Null
}

function Add-DataverseColumns([hashtable]$Table, [string]$Prefix) {
    $entityLogicalName = "$Prefix$($Table.Name)"
    foreach ($column in $Table.Columns) {
        $columnLogicalName = "$Prefix$($column.Name)"
        if (Test-AttributeExists $entityLogicalName $columnLogicalName) {
            Write-Host "    [=] Colonna $columnLogicalName gia' presente" -ForegroundColor DarkGray
            continue
        }
        Write-Host "    [+] Aggiungo colonna $columnLogicalName ($($column.Type))" -ForegroundColor Cyan
        $attrBody = New-SimpleAttributeBody -Column $column -Prefix $Prefix
        Invoke-Dataverse -Method POST -Path "EntityDefinitions(LogicalName='$entityLogicalName')/Attributes" -Body $attrBody | Out-Null
    }
}

function Add-DataverseRelationship([hashtable]$Relationship, [string]$Prefix) {
    $childLogical  = "$Prefix$($Relationship.Child)"
    $parentLogical = "$Prefix$($Relationship.Parent)"
    $lookupLogical = "$Prefix$($Relationship.LookupName)"
    $schemaName    = "$Prefix$($Relationship.Child)_$($Relationship.LookupName)"

    if (Test-AttributeExists $childLogical $lookupLogical) {
        Write-Host "    [=] Relazione/lookup $lookupLogical su $childLogical gia' presente" -ForegroundColor DarkGray
        return
    }
    Write-Host "    [+] Creo relazione $childLogical -> $parentLogical (lookup $lookupLogical)" -ForegroundColor Cyan

    $body = @{
        "@odata.type"       = "Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata"
        SchemaName          = $schemaName
        ReferencedEntity    = $parentLogical
        ReferencingEntity   = $childLogical
        Lookup              = @{
            "@odata.type" = "Microsoft.Dynamics.CRM.LookupAttributeMetadata"
            SchemaName    = $lookupLogical
            DisplayName   = New-Label $Relationship.LookupName
            RequiredLevel = New-RequiredLevel $Relationship.Required
        }
        CascadeConfiguration = @{
            Assign   = "NoCascade"
            Delete   = $Relationship.Delete
            Merge    = "NoCascade"
            Reparent = "NoCascade"
            Share    = "NoCascade"
            Unshare  = "NoCascade"
        }
    }
    Invoke-Dataverse -Method POST -Path "RelationshipDefinitions" -Body $body | Out-Null
}

function Add-DataverseAlternateKeys([hashtable]$Table, [string]$Prefix) {
    if (-not $Table.AlternateKeys) { return }
    $entityLogicalName = "$Prefix$($Table.Name)"
    foreach ($key in $Table.AlternateKeys) {
        $keySchemaName = "$Prefix$($key.Name)"
        # Le singole Key non si possono indirizzare per SchemaName tra parentesi (non e' una
        # chiave valida per EntityKeyMetadata): bisogna filtrare sulla collection.
        $existing = Invoke-Dataverse -Method GET `
            -Path "EntityDefinitions(LogicalName='$entityLogicalName')/Keys?`$filter=SchemaName eq '$keySchemaName'&`$select=SchemaName" `
            -AllowNotFound
        if ($null -ne $existing -and $existing.value.Count -gt 0) {
            Write-Host "    [=] Chiave alternativa $keySchemaName gia' presente" -ForegroundColor DarkGray
            continue
        }
        Write-Host "    [+] Creo chiave alternativa $keySchemaName ($($key.Attributes -join ', '))" -ForegroundColor Cyan
        $body = @{
            SchemaName    = $keySchemaName
            DisplayName   = New-Label $key.Name
            KeyAttributes = @($key.Attributes | ForEach-Object { "$Prefix$_" })
        }
        # La creazione di una chiave alternativa e' asincrona: l'indice viene costruito in background.
        Invoke-Dataverse -Method POST -Path "EntityDefinitions(LogicalName='$entityLogicalName')/Keys" -Body $body | Out-Null
    }
}

# ---------------------------------------------------------------------------
# 4. Esecuzione
# ---------------------------------------------------------------------------

Write-Host "`n=== 1. Creazione tabelle ===" -ForegroundColor Yellow
foreach ($table in $Tables) { New-DataverseTable -Table $table -Prefix $Prefix }

Write-Host "`n=== 2. Creazione colonne semplici ===" -ForegroundColor Yellow
foreach ($table in $Tables) {
    Write-Host "  Tabella: $Prefix$($table.Name)"
    Add-DataverseColumns -Table $table -Prefix $Prefix
}

Write-Host "`n=== 3. Creazione relazioni (lookup) ===" -ForegroundColor Yellow
foreach ($relationship in $Relationships) {
    Add-DataverseRelationship -Relationship $relationship -Prefix $Prefix
}

Write-Host "`n=== 4. Creazione chiavi alternative (vincoli di unicita') ===" -ForegroundColor Yellow
foreach ($table in $Tables) {
    if ($table.AlternateKeys) {
        Write-Host "  Tabella: $Prefix$($table.Name)"
        Add-DataverseAlternateKeys -Table $table -Prefix $Prefix
    }
}

Write-Host "`n=== 5. Pubblicazione personalizzazioni ===" -ForegroundColor Yellow
Invoke-Dataverse -Method POST -Path "PublishAllXml" -Body @{} | Out-Null

Write-Host "`nCompletato. Tabelle create con prefisso '$Prefix':" -ForegroundColor Green
$Tables | ForEach-Object { Write-Host "  - $Prefix$($_.Name)" -ForegroundColor Green }
Write-Host "`nNota: le chiavi alternative vengono indicizzate in modo asincrono da Dataverse;" -ForegroundColor DarkYellow
Write-Host "se l'app di destinazione le usa subito dopo questo script, attendi qualche minuto" -ForegroundColor DarkYellow
Write-Host "o verifica lo stato da Impostazioni > Personalizzazioni > Tabella > Chiavi." -ForegroundColor DarkYellow
