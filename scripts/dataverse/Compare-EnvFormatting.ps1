param(
  [string]$VercelEnvFile = ".env.vercel.diag",
  [string]$LocalEnvFile = ".env.local"
)
$ErrorActionPreference = "Stop"

function Get-RawValue($line) {
  if ($line -match '^[A-Z_][A-Z0-9_]*\s*=\s*(.*)$') { return $Matches[1] }
  return $null
}

function Analyze($filePath, $varNames) {
  $lines = Get-Content $filePath
  $result = @{}
  foreach ($name in $varNames) {
    $line = $lines | Where-Object { $_ -match "^$name\s*=" } | Select-Object -First 1
    if (-not $line) { $result[$name] = "ASSENTE"; continue }
    $raw = Get-RawValue $line
    $hasQuotes = $raw.StartsWith('"') -and $raw.EndsWith('"')
    $inner = if ($hasQuotes) { $raw.Substring(1, $raw.Length - 2) } else { $raw }
    $leadingSpace = $inner -ne $inner.TrimStart()
    $trailingSpace = $inner -ne $inner.TrimEnd()
    $result[$name] = "len=$($inner.Length) quotes=$hasQuotes leadingSpace=$leadingSpace trailingSpace=$trailingSpace"
  }
  return $result
}

$vars = @("DATAVERSE_URL","DATAVERSE_TENANT_ID","DATAVERSE_CLIENT_ID","DATAVERSE_CLIENT_SECRET")

Write-Output "--- Vercel (production, pulled) ---"
$vercelResult = Analyze $VercelEnvFile $vars
$vercelResult.GetEnumerator() | ForEach-Object { Write-Output "$($_.Key): $($_.Value)" }

Write-Output "`n--- Locale (.env.local) ---"
$localResult = Analyze $LocalEnvFile $vars
$localResult.GetEnumerator() | ForEach-Object { Write-Output "$($_.Key): $($_.Value)" }
