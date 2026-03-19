param(
    [string]$LogPath = "c:\Users\user\OneDrive\dashboard_user\runtime\radius_telemetry.log",
    [double]$ErrorThreshold = 0.05,
    [int]$WindowMinutes = 5,
    [int]$CooldownSeconds = 60,
    [string]$DraftOutputPath = "c:\Users\user\OneDrive\dashboard_user\Readiness\auto_drafts\ambra_draft_latest.txt",
    [string]$AlertHtmlPath = "c:\Users\user\OneDrive\dashboard_user\scripts\monitoring\watchdog_alert.html"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-RadiusEventType {
    param([string]$Line)

    $u = $Line.ToUpperInvariant()

    if ($u -match "TIMEOUT|TIMED OUT|RADIUS_TIMEOUT") { return "TIMEOUT" }
    if ($u -match "REJECT|ACCESS-REJECT|AUTH_REJECT") { return "REJECT" }
    if ($u -match "ACCEPT|ACCESS-ACCEPT|AUTH_SUCCESS|AUTHORIZED") { return "ACCEPT" }

    return $null
}

function New-AmbraDraft {
    param(
        [double]$ErrorRate,
        [int]$Errors,
        [int]$Total,
        [string]$Path,
        [datetime]$Now
    )

    $pct = [Math]::Round(($ErrorRate * 100), 2)
    $ts = $Now.ToString("yyyy-MM-dd HH:mm:ss")

    $content = @"
[ESCALATION NOTICE] Stato AMBRA — Branch Pilot 802.1X

Timestamp: $ts
Stato corrente: AMBRA

Rilevato superamento soglia AMBRA su autenticazioni 802.1X:
- Error rate (timeout+reject): $pct%
- Errori: $Errors su $Total eventi (finestra ultimi 5 minuti)
- Servizi critici: verificare stato in war-room
- Bridge emergenza: +1 786-781-2573

Azioni in corso:
- Verifica log switch / RADIUS / NAC
- Triage porte o segmenti interessati
- Attivazione MAB selettivo dove necessario
- Monitoraggio intensificato con prossimo update entro 15–30 minuti

Escalation attiva verso Network / NOC / SOC.
Passaggio a ROSSO immediato se l'impatto supera il 15% o coinvolge servizi critici.
"@

    Set-Content -Path $Path -Value $content -Encoding UTF8
}

function Trigger-Alerts {
    param([string]$AlertPage)

    try {
        [console]::Beep(1200, 250)
        [console]::Beep(1400, 250)
        [console]::Beep(1700, 350)
    }
    catch {
        Write-Warning "Beep locale non disponibile: $($_.Exception.Message)"
    }

    if (Test-Path -Path $AlertPage) {
        try {
            Start-Process -FilePath $AlertPage | Out-Null
        }
        catch {
            Write-Warning "Impossibile aprire alert browser: $($_.Exception.Message)"
        }
    }
}

if (-not (Test-Path -Path $LogPath)) {
    New-Item -ItemType File -Path $LogPath -Force | Out-Null
}

if (-not (Test-Path -Path (Split-Path -Path $DraftOutputPath -Parent))) {
    New-Item -ItemType Directory -Path (Split-Path -Path $DraftOutputPath -Parent) -Force | Out-Null
}

$events = New-Object System.Collections.Generic.List[object]
$lastAlert = [datetime]::MinValue

Write-Host "[Watchdog] Avvio monitoraggio RADIUS" -ForegroundColor Cyan
Write-Host "[Watchdog] LogPath=$LogPath | Threshold=$($ErrorThreshold * 100)% | Window=${WindowMinutes}m" -ForegroundColor Cyan

Get-Content -Path $LogPath -Wait -Tail 0 | ForEach-Object {
    $line = $_
    $eventType = Get-RadiusEventType -Line $line

    if (-not $eventType) {
        return
    }

    $now = Get-Date
    $events.Add([pscustomobject]@{
            Time = $now
            Type = $eventType
            Raw  = $line
        })

    $cutoff = $now.AddMinutes(-$WindowMinutes)
    while ($events.Count -gt 0 -and $events[0].Time -lt $cutoff) {
        $events.RemoveAt(0)
    }

    $total = $events.Count
    if ($total -le 0) {
        return
    }

    $errors = @($events | Where-Object { $_.Type -in @("TIMEOUT", "REJECT") }).Count
    $errorRate = $errors / $total

    $ratePct = [Math]::Round(($errorRate * 100), 2)
    Write-Host "[Watchdog] Window=$total events | errors=$errors | rate=$ratePct%" -ForegroundColor DarkGray

    if ($errorRate -gt $ErrorThreshold -and (($now - $lastAlert).TotalSeconds -ge $CooldownSeconds)) {
        Write-Warning "[Watchdog] SOGLIA AMBRA SUPERATA: $ratePct% (> $($ErrorThreshold * 100)%)"

        New-AmbraDraft -ErrorRate $errorRate -Errors $errors -Total $total -Path $DraftOutputPath -Now $now
        Trigger-Alerts -AlertPage $AlertHtmlPath

        $lastAlert = $now
        Write-Host "[Watchdog] Draft AMBRA aggiornato: $DraftOutputPath" -ForegroundColor Yellow
    }
}