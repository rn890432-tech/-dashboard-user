param(
    [string]$LogPath = "c:\Users\user\OneDrive\dashboard_user\runtime\radius_telemetry.log",
    [int]$WindowMinutes = 5,
    [datetime]$ReferenceTime = (Get-Date),
    [string]$OutputPath = "c:\Users\user\OneDrive\dashboard_user\Readiness\active_remediation.txt",
    [string]$BridgeNumber = "+1 786-781-2573"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-Field {
    param(
        [string]$Line,
        [string[]]$Keys
    )

    foreach ($key in $Keys) {
        $pattern = "(?i)\b" + [regex]::Escape($key) + "\s*[:=]\s*([^,;\s]+)"
        $m = [regex]::Match($Line, $pattern)
        if ($m.Success) { return $m.Groups[1].Value }
    }

    return $null
}

if (-not (Test-Path -Path $LogPath)) {
    throw "Log file non trovato: $LogPath"
}

$cutoff = $ReferenceTime.AddMinutes(-$WindowMinutes)
$errorLines = New-Object System.Collections.Generic.List[object]

$allLines = Get-Content -Path $LogPath -ErrorAction Stop
foreach ($line in $allLines) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }

    $u = $line.ToUpperInvariant()
    if (-not ($u -match "TIMEOUT|TIMED OUT|RADIUS_TIMEOUT|REJECT|ACCESS-REJECT|AUTH_REJECT")) {
        continue
    }

    $ts = $null
    $dateMatch = [regex]::Match($line, "\b\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}")
    if ($dateMatch.Success) {
        try { $ts = [datetime]::Parse($dateMatch.Value) } catch { $ts = $null }
    }

    if ($ts -and $ts -lt $cutoff) { continue }

    $switch = Get-Field -Line $line -Keys @("switch", "switch_ip", "device", "nas", "nas-ip", "nas_ip_address")
    $iface = Get-Field -Line $line -Keys @("interface", "port", "ifname", "if", "nas-port-id", "nas_port_id")
    $user = Get-Field -Line $line -Keys @("user", "username", "identity")
    $mac = Get-Field -Line $line -Keys @("mac", "calling-station-id", "calling_station_id", "endpoint")

    if (-not $switch) { $switch = "<SWITCH_DA_VERIFICARE>" }
    if (-not $iface) { $iface = "<PORTA_DA_VERIFICARE>" }
    if (-not $user) { $user = "<USER_DA_VERIFICARE>" }
    if (-not $mac) { $mac = "<MAC_DA_VERIFICARE>" }

    $errorLines.Add([pscustomobject]@{
            Timestamp = if ($ts) { $ts } else { $ReferenceTime }
            Switch    = $switch
            Interface = $iface
            User      = $user
            Mac       = $mac
            Raw       = $line
        })
}

$grouped = $errorLines |
Group-Object -Property Switch, Interface, User, Mac |
Sort-Object -Property Count -Descending

$outDir = Split-Path -Path $OutputPath -Parent
if (-not (Test-Path -Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

$tsOut = $ReferenceTime.ToString("yyyy-MM-dd HH:mm:ss")
$header = @"
[ACTIVE REMEDIATION] — AMBRA PRE-CHECK PORTA
Timestamp: $tsOut
Window: ultimi $WindowMinutes minuti
Bridge emergenza: $BridgeNumber

Obiettivo:
- Identificare switch/porte/utenti impattati da TIMEOUT/REJECT
- Preparare comandi MAB specifici per triage immediato
"@

if ($grouped.Count -eq 0) {
    $noData = @"

Nessun evento TIMEOUT/REJECT trovato nella finestra analizzata.
Verificare che i log RADIUS includano metadata (switch/interface/user/mac).
"@

    Set-Content -Path $OutputPath -Value ($header + $noData) -Encoding UTF8
    Write-Host "[Pre-check Porta] Nessun evento errore nella finestra." -ForegroundColor DarkYellow
    exit 0
}

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add($header)
$lines.Add("")
$lines.Add("Target identificati (ordinati per numero eventi):")

$idx = 1
foreach ($g in $grouped) {
    $sample = $g.Group[0]
    $lines.Add(("{0}) switch={1} | interface={2} | user={3} | mac={4} | eventi={5}" -f $idx, $sample.Switch, $sample.Interface, $sample.User, $sample.Mac, $g.Count))
    $idx++
}

$lines.Add("")
$lines.Add("Comandi PRE-CHECK per target:")
$idx = 1
foreach ($g in $grouped) {
    $sample = $g.Group[0]
    $lines.Add("")
    $lines.Add(("### Target {0} — {1} / {2} / {3}" -f $idx, $sample.Switch, $sample.Interface, $sample.User))
    $lines.Add(("ssh admin@{0}" -f $sample.Switch))
    $lines.Add(("show authentication sessions interface {0} detail" -f $sample.Interface))
    $lines.Add(("show interfaces {0} status" -f $sample.Interface))
    $lines.Add(("show mac address-table | include {0}" -f $sample.Mac))
    $lines.Add("show radius statistics")
    $lines.Add("show logging | include DOT1X|RADIUS|AUTH|MAB")
    $idx++
}

$lines.Add("")
$lines.Add("Comandi MAB suggeriti per target (da applicare se confermato impatto):")
$idx = 1
foreach ($g in $grouped) {
    $sample = $g.Group[0]
    $lines.Add("")
    $lines.Add(("### MAB Target {0} — user={1} mac={2}" -f $idx, $sample.User, $sample.Mac))
    $lines.Add("configure terminal")
    $lines.Add(("interface {0}" -f $sample.Interface))
    $lines.Add(" authentication order dot1x mab")
    $lines.Add(" authentication priority dot1x mab")
    $lines.Add(" mab")
    $lines.Add(" authentication timer restart 1")
    $lines.Add("end")
    $lines.Add("write memory")
    $idx++
}

$lines.Add("")
$lines.Add("Nota: validare sempre l'autorizzazione operativa prima dell'applicazione in produzione.")

Set-Content -Path $OutputPath -Value $lines -Encoding UTF8
Write-Host "[Pre-check Porta] Remediation file aggiornato: $OutputPath" -ForegroundColor Green