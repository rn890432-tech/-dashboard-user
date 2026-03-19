param(
    [string]$LogPath = "c:\Users\user\OneDrive\dashboard_user\runtime\radius_telemetry.log",
    [double]$ErrorThreshold = 0.05,
    [double]$RedThreshold = 0.15,
    [int]$WindowMinutes = 5,
    [int]$UpdateIntervalMinutes = 30,
    [int]$PollSeconds = 2,
    [string]$DraftOutputPath = "c:\Users\user\OneDrive\dashboard_user\Readiness\auto_drafts\ambra_draft_latest.txt",
    [string]$UpdateOutputPath = "c:\Users\user\OneDrive\dashboard_user\Readiness\auto_drafts\status_update_latest.txt",
    [string]$UpdateHistoryPath = "c:\Users\user\OneDrive\dashboard_user\Readiness\auto_drafts\status_update_history.log",
    [string]$AlertHtmlPath = "c:\Users\user\OneDrive\dashboard_user\scripts\monitoring\watchdog_alert.html",
    [switch]$StopOnAmber = $true
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

function Get-StateFromRate {
    param(
        [double]$Rate,
        [double]$Amber,
        [double]$Red
    )

    if ($Rate -gt $Red) { return "ROSSO" }
    if ($Rate -gt $Amber) { return "AMBRA" }
    return "VERDE"
}

function Get-Metrics {
    param(
        [System.Collections.Generic.List[object]]$EventList,
        [double]$Amber,
        [double]$Red
    )

    $total = $EventList.Count
    $errors = @($EventList | Where-Object { $_.Type -in @("TIMEOUT", "REJECT") }).Count

    $rate = 0.0
    if ($total -gt 0) {
        $rate = $errors / $total
    }

    $state = Get-StateFromRate -Rate $rate -Amber $Amber -Red $Red

    return [pscustomobject]@{
        Total     = $total
        Errors    = $errors
        ErrorRate = $rate
        State     = $state
    }
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

function New-PeriodicUpdateDraft {
    param(
        [pscustomobject]$Metrics,
        [datetime]$Now,
        [string]$OutputPath,
        [string]$HistoryPath,
        [int]$WindowMins
    )

    $pct = [Math]::Round(($Metrics.ErrorRate * 100), 2)
    $ts = $Now.ToString("yyyy-MM-dd HH:mm:ss")

    $body = @"
[30-MIN STATUS UPDATE] — Branch Pilot 802.1X
Timestamp: $ts
Stato corrente: $($Metrics.State)

Sintesi telemetria (finestra ultimi $WindowMins minuti):
- Eventi totali: $($Metrics.Total)
- Errori (TIMEOUT+REJECT): $($Metrics.Errors)
- Error rate: $pct%
- Bridge emergenza: +1 786-781-2573

Decisione operativa:
- VERDE: monitoraggio standard
- AMBRA: triage immediato + MAB selettivo
- ROSSO: escalation immediata + bridge attivo
"@

    Set-Content -Path $OutputPath -Value $body -Encoding UTF8
    Add-Content -Path $HistoryPath -Value ("[{0}] STATE={1} RATE={2}% ERRORS={3}/{4}" -f $ts, $Metrics.State, $pct, $Metrics.Errors, $Metrics.Total)
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

if (-not (Test-Path -Path (Split-Path -Path $UpdateOutputPath -Parent))) {
    New-Item -ItemType Directory -Path (Split-Path -Path $UpdateOutputPath -Parent) -Force | Out-Null
}

if (-not (Test-Path -Path $UpdateHistoryPath)) {
    New-Item -ItemType File -Path $UpdateHistoryPath -Force | Out-Null
}

$events = New-Object System.Collections.Generic.List[object]
$nextUpdateAt = (Get-Date).AddMinutes($UpdateIntervalMinutes)
$lastPosition = (Get-Item -Path $LogPath).Length

Write-Host "[Watchdog] Avvio monitoraggio RADIUS" -ForegroundColor Cyan
Write-Host "[Watchdog] LogPath=$LogPath | Amber=$($ErrorThreshold * 100)% | Red=$($RedThreshold * 100)% | Window=${WindowMinutes}m | UpdateEvery=${UpdateIntervalMinutes}m" -ForegroundColor Cyan

while ($true) {
    $fileInfo = Get-Item -Path $LogPath
    if ($fileInfo.Length -lt $lastPosition) {
        # Log rotation/truncate
        $lastPosition = 0
        $events.Clear()
        Write-Host "[Watchdog] Rilevato truncate/rotation log, stato finestra azzerato." -ForegroundColor DarkYellow
    }

    if ($fileInfo.Length -gt $lastPosition) {
        $fs = [System.IO.File]::Open($LogPath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
        try {
            $fs.Seek($lastPosition, [System.IO.SeekOrigin]::Begin) | Out-Null
            $sr = New-Object System.IO.StreamReader($fs)
            while (-not $sr.EndOfStream) {
                $line = $sr.ReadLine()
                $eventType = Get-RadiusEventType -Line $line
                if (-not $eventType) { continue }

                $events.Add([pscustomobject]@{
                        Time = Get-Date
                        Type = $eventType
                        Raw  = $line
                    })
            }
            $lastPosition = $fs.Position
        }
        finally {
            if ($sr) { $sr.Dispose() }
            $fs.Dispose()
        }
    }

    $now = Get-Date
    $cutoff = $now.AddMinutes(-$WindowMinutes)
    while ($events.Count -gt 0 -and $events[0].Time -lt $cutoff) {
        $events.RemoveAt(0)
    }

    $metrics = Get-Metrics -EventList $events -Amber $ErrorThreshold -Red $RedThreshold
    $ratePct = [Math]::Round(($metrics.ErrorRate * 100), 2)

    if ($metrics.Total -gt 0) {
        Write-Host "[Watchdog] Window=$($metrics.Total) events | errors=$($metrics.Errors) | rate=$ratePct% | state=$($metrics.State)" -ForegroundColor DarkGray
    }

    if ($now -ge $nextUpdateAt) {
        New-PeriodicUpdateDraft -Metrics $metrics -Now $now -OutputPath $UpdateOutputPath -HistoryPath $UpdateHistoryPath -WindowMins $WindowMinutes
        Write-Host "[Watchdog] Update 30-min generato: $UpdateOutputPath" -ForegroundColor Green
        $nextUpdateAt = $now.AddMinutes($UpdateIntervalMinutes)
    }

    if ($metrics.ErrorRate -gt $ErrorThreshold) {
        Write-Warning "[Watchdog] SOGLIA AMBRA SUPERATA: $ratePct% (> $($ErrorThreshold * 100)%)"
        New-AmbraDraft -ErrorRate $metrics.ErrorRate -Errors $metrics.Errors -Total $metrics.Total -Path $DraftOutputPath -Now $now
        Trigger-Alerts -AlertPage $AlertHtmlPath
        Write-Host "[Watchdog] Draft AMBRA aggiornato: $DraftOutputPath" -ForegroundColor Yellow

        if ($StopOnAmber.IsPresent) {
            Write-Warning "[Watchdog] StopOnAmber attivo: ciclo interrotto dopo alert/escalation draft."
            exit 2
        }
    }

    Start-Sleep -Seconds $PollSeconds
}