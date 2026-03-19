param(
    [string]$LogPath = "c:\Users\user\OneDrive\dashboard_user\runtime\radius_telemetry.log",
    [double]$ErrorThreshold = 0.05,
    [double]$RedThreshold = 0.15,
    [int]$WindowMinutes = 5,
    [int]$UpdateIntervalMinutes = 30,
    [int]$UpdateAnchorMinute = 20,
    [int]$PollSeconds = 2,
    [string]$DraftOutputPath = "c:\Users\user\OneDrive\dashboard_user\Readiness\auto_drafts\ambra_draft_latest.txt",
    [string]$UpdateOutputPath = "c:\Users\user\OneDrive\dashboard_user\Readiness\auto_drafts\status_update_latest.txt",
    [string]$UpdateHistoryPath = "c:\Users\user\OneDrive\dashboard_user\Readiness\auto_drafts\status_update_history.log",
    [string]$AlertHtmlPath = "c:\Users\user\OneDrive\dashboard_user\scripts\monitoring\watchdog_alert.html",
    [string]$PreCheckScriptPath = "c:\Users\user\OneDrive\dashboard_user\scripts\monitoring\precheck_porta.ps1",
    [string]$ActiveRemediationPath = "c:\Users\user\OneDrive\dashboard_user\Readiness\active_remediation.txt",
    [string]$WebhookUrl = "",
    [ValidateSet("auto", "teams", "slack")]
    [string]$WebhookType = "auto",
    [string]$WebhookChannel = "#all-cybersecurity-engineering-data",
    [switch]$StopOnAmber = $false,

    # ── Level 4 Incident Mode ──────────────────────────────────────────────────
    [switch]$IncidentLevel4,
    [string]$RichardDraftPath = "c:\Users\user\OneDrive\dashboard_user\Readiness\auto_drafts\richard_escalation_latest.txt",
    [string]$AuditLogPath = "c:\Users\user\OneDrive\dashboard_user\Readiness\morning_audit.txt",
    [int]$TrendWindowSamples = 5,
    [double]$TrendMinRatePercent = 8.0
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
    if ($total -gt 0) { $rate = $errors / $total }

    [pscustomobject]@{
        Total     = $total
        Errors    = $errors
        ErrorRate = $rate
        State     = Get-StateFromRate -Rate $rate -Amber $Amber -Red $Red
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

function New-RichardEscalationDraft {
    param(
        [double]$ErrorRate,
        [int]$Errors,
        [int]$Total,
        [double]$RedThreshold,
        [string]$Path,
        [datetime]$Now
    )

    $pct = [Math]::Round(($ErrorRate * 100), 2)
    $redPct = [Math]::Round(($RedThreshold * 100), 2)
    $ts = $Now.ToString("yyyy-MM-dd HH:mm:ss")

    $content = @"
[CRITICAL ESCALATION — FOR: Richard] Branch Pilot 802.1X

Timestamp: $ts
Priorità: CRITICA — Trend verso ROSSO

Richard,

il sistema di monitoraggio automatico ha rilevato un trend di crescita 
del tasso di errore RADIUS in direzione della soglia ROSSO ($redPct%):

  Error rate attuale: $pct%
  Errori: $Errors su $Total eventi (finestra ultimi 5 minuti)
  Soglia ROSSO: $redPct%
  Bridge emergenza: +1 786-781-2573

Azioni già avviate in autonomia:
  1. Pre-check Porta eseguito — comandi MAB generati in Readiness/active_remediation.txt
  2. Notifica CRITICAL TREND inviata al canale ops
  3. Draft di escalation AMBRA disponibile in Readiness/auto_drafts/ambra_draft_latest.txt

Raccomandazione:
  → Attivare conference bridge SUBITO
  → Verificare Readiness/active_remediation.txt e autorizzare applicazione MAB
  → Se il rate supera $redPct%, passare a procedura ROSSO (runbook: docs/runbooks/)

In attesa di istruzioni. Il sistema continua il monitoraggio automatico.
"@

    $outDir = Split-Path -Path $Path -Parent
    if (-not (Test-Path -Path $outDir)) {
        New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    }
    Set-Content -Path $Path -Value $content -Encoding UTF8
}

function Add-AuditLogEntry {
    param(
        [string]$LogPath,
        [string]$Level,
        [string]$Message,
        [datetime]$Now
    )

    $ts = $Now.ToString("yyyy-MM-dd HH:mm:ss")
    $entry = "[{0}] [{1}] {2}" -f $ts, $Level.ToUpper(), $Message

    $dir = Split-Path -Path $LogPath -Parent
    if (-not (Test-Path -Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    Add-Content -Path $LogPath -Value $entry -Encoding UTF8
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

function Invoke-PreCheckPorta {
    param(
        [string]$ScriptPath,
        [string]$Log,
        [int]$Window,
        [datetime]$Now,
        [string]$Output
    )

    if (-not (Test-Path -Path $ScriptPath)) {
        Write-Warning "[Watchdog] Pre-check script non trovato: $ScriptPath"
        return
    }

    try {
        & $ScriptPath -LogPath $Log -WindowMinutes $Window -ReferenceTime $Now -OutputPath $Output
        Write-Host "[Watchdog] Pre-check porta completato: $Output" -ForegroundColor Magenta
    }
    catch {
        Write-Warning "[Watchdog] Errore durante Pre-check porta: $($_.Exception.Message)"
    }
}

function Get-ResolvedWebhookUrl {
    param([string]$Explicit)

    if (-not [string]::IsNullOrWhiteSpace($Explicit)) { return $Explicit }
    if (-not [string]::IsNullOrWhiteSpace($env:WATCHDOG_WEBHOOK_URL)) { return $env:WATCHDOG_WEBHOOK_URL }
    if (-not [string]::IsNullOrWhiteSpace($env:TEAMS_WEBHOOK_URL)) { return $env:TEAMS_WEBHOOK_URL }
    if (-not [string]::IsNullOrWhiteSpace($env:SLACK_WEBHOOK_URL)) { return $env:SLACK_WEBHOOK_URL }
    return ""
}

function Get-ResolvedWebhookType {
    param(
        [string]$Type,
        [string]$Url
    )

    if ($Type -ne "auto") { return $Type }
    if ([string]::IsNullOrWhiteSpace($Url)) { return "auto" }

    $u = $Url.ToLowerInvariant()
    if ($u -match "slack") { return "slack" }
    if ($u -match "teams|office\.com|logic\.azure") { return "teams" }
    return "teams"
}

function Send-WebhookAlert {
    param(
        [string]$Url,
        [string]$Type,
        [string]$Channel,
        [datetime]$Now,
        [double]$ErrorRate,
        [int]$Errors,
        [int]$Total,
        [string]$DraftPath,
        [string]$RemediationPath,
        [string]$AlertKind = "AMBRA"   # "AMBRA" | "CRITICAL_TREND"
    )

    if ([string]::IsNullOrWhiteSpace($Url)) {
        Write-Warning "[Watchdog] Webhook URL non configurato: salto push notifica."
        return
    }

    $ratePct = [Math]::Round(($ErrorRate * 100), 2)
    $ts = $Now.ToString("yyyy-MM-dd HH:mm:ss")

    if ($AlertKind -eq "CRITICAL_TREND") {
        $text = "[CRITICAL TREND] Trend ROSSO rilevato alle $ts | error-rate=${ratePct}% (${Errors}/${Total}) | SOGLIA ROSSO=15% | bridge=+1 786-781-2573 | draft-richard=$DraftPath | remediation=$RemediationPath | AZIONE IMMEDIATA RICHIESTA"
    }
    else {
        $text = "[AMBRA] Trigger rilevato alle $ts | error-rate=${ratePct}% (${Errors}/${Total}) | bridge=+1 786-781-2573 | draft=$DraftPath | remediation=$RemediationPath"
    }

    $payload = @{
        text    = $text
        channel = $Channel
    }

    try {
        Invoke-RestMethod -Method Post -Uri $Url -ContentType "application/json" -Body ($payload | ConvertTo-Json -Depth 5) | Out-Null
        Write-Host "[Watchdog] Notifica webhook inviata [$AlertKind] ($Type)." -ForegroundColor Cyan
    }
    catch {
        Write-Warning "[Watchdog] Invio webhook fallito: $($_.Exception.Message)"
    }
}

function Get-NextUpdateAt {
    param(
        [datetime]$Now,
        [int]$AnchorMinute,
        [int]$IntervalMinutes
    )

    $startOfHour = Get-Date -Year $Now.Year -Month $Now.Month -Day $Now.Day -Hour $Now.Hour -Minute 0 -Second 0
    $candidate = $startOfHour.AddMinutes($AnchorMinute)

    while ($candidate -le $Now) {
        $candidate = $candidate.AddMinutes($IntervalMinutes)
    }

    return $candidate
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

if (-not (Test-Path -Path (Split-Path -Path $ActiveRemediationPath -Parent))) {
    New-Item -ItemType Directory -Path (Split-Path -Path $ActiveRemediationPath -Parent) -Force | Out-Null
}

if (-not (Test-Path -Path $UpdateHistoryPath)) {
    New-Item -ItemType File -Path $UpdateHistoryPath -Force | Out-Null
}

$events = New-Object System.Collections.Generic.List[object]
$nextUpdateAt = Get-NextUpdateAt -Now (Get-Date) -AnchorMinute $UpdateAnchorMinute -IntervalMinutes $UpdateIntervalMinutes
$lastPosition = (Get-Item -Path $LogPath).Length
$resolvedWebhookUrl = Get-ResolvedWebhookUrl -Explicit $WebhookUrl
$resolvedWebhookType = Get-ResolvedWebhookType -Type $WebhookType -Url $resolvedWebhookUrl

# ── Level 4 state ─────────────────────────────────────────────────────────────
$rateHistory = New-Object System.Collections.Generic.List[double]
$criticalTrendSent = $false
$lastAmbraTriggeredAt = [datetime]::MinValue

Write-Host "[Watchdog] Avvio monitoraggio RADIUS" -ForegroundColor Cyan
if ($IncidentLevel4) {
    Write-Host "[Watchdog] === MODALITÀ INCIDENT LEVEL 4 ATTIVA ===" -ForegroundColor Red
    Add-AuditLogEntry -LogPath $AuditLogPath -Level "INFO" -Message "WATCHDOG Level 4 avviato — AMBRA=$($ErrorThreshold*100)% ROSSO=$($RedThreshold*100)% finestra=${WindowMinutes}m" -Now (Get-Date)
}
Write-Host "[Watchdog] LogPath=$LogPath | Amber=$($ErrorThreshold * 100)% | Red=$($RedThreshold * 100)% | Window=${WindowMinutes}m | UpdateEvery=${UpdateIntervalMinutes}m (anchor :$UpdateAnchorMinute) | NextUpdate=$($nextUpdateAt.ToString('HH:mm:ss'))" -ForegroundColor Cyan
if (-not [string]::IsNullOrWhiteSpace($resolvedWebhookUrl)) {
    Write-Host "[Watchdog] Webhook attivo: type=$resolvedWebhookType" -ForegroundColor Cyan
}
else {
    Write-Warning "[Watchdog] Nessun webhook configurato (usa -WebhookUrl o env WATCHDOG_WEBHOOK_URL/TEAMS_WEBHOOK_URL/SLACK_WEBHOOK_URL)."
}

while ($true) {
    $fileInfo = Get-Item -Path $LogPath
    if ($fileInfo.Length -lt $lastPosition) {
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

    # ── Level 4: registra rate history per trend detection ───────────────────
    if ($IncidentLevel4 -and $metrics.Total -gt 0) {
        $rateHistory.Add($metrics.ErrorRate)
        if ($rateHistory.Count -gt $TrendWindowSamples) {
            $rateHistory.RemoveAt(0)
        }
    }

    if ($now -ge $nextUpdateAt) {
        New-PeriodicUpdateDraft -Metrics $metrics -Now $now -OutputPath $UpdateOutputPath -HistoryPath $UpdateHistoryPath -WindowMins $WindowMinutes
        Write-Host "[Watchdog] Update 30-min generato: $UpdateOutputPath" -ForegroundColor Green
        if ($IncidentLevel4) {
            Add-AuditLogEntry -LogPath $AuditLogPath -Level "STATUS" -Message "30-min update: state=$($metrics.State) rate=$ratePct% errors=$($metrics.Errors)/$($metrics.Total)" -Now $now
        }
        $nextUpdateAt = Get-NextUpdateAt -Now $now -AnchorMinute $UpdateAnchorMinute -IntervalMinutes $UpdateIntervalMinutes
    }

    if ($metrics.ErrorRate -gt $ErrorThreshold) {
        # ── AMBRA: pre-check + draft + webhook ───────────────────────────────
        $sinceLastAmber = ($now - $lastAmbraTriggeredAt).TotalSeconds
        if ($sinceLastAmber -gt 120) {
            $lastAmbraTriggeredAt = $now
            Write-Warning "[Watchdog] SOGLIA AMBRA SUPERATA: $ratePct% (> $($ErrorThreshold * 100)%)"
            New-AmbraDraft -ErrorRate $metrics.ErrorRate -Errors $metrics.Errors -Total $metrics.Total -Path $DraftOutputPath -Now $now
            Invoke-PreCheckPorta -ScriptPath $PreCheckScriptPath -Log $LogPath -Window $WindowMinutes -Now $now -Output $ActiveRemediationPath
            Send-WebhookAlert -Url $resolvedWebhookUrl -Type $resolvedWebhookType -Channel $WebhookChannel -Now $now `
                -ErrorRate $metrics.ErrorRate -Errors $metrics.Errors -Total $metrics.Total `
                -DraftPath $DraftOutputPath -RemediationPath $ActiveRemediationPath -AlertKind "AMBRA"
            Trigger-Alerts -AlertPage $AlertHtmlPath
            Write-Host "[Watchdog] Draft AMBRA aggiornato: $DraftOutputPath" -ForegroundColor Yellow

            if ($IncidentLevel4) {
                Add-AuditLogEntry -LogPath $AuditLogPath -Level "AMBRA" -Message "Soglia superata: rate=$ratePct% errors=$($metrics.Errors)/$($metrics.Total) | pre-check eseguito | draft=$DraftOutputPath | remediation=$ActiveRemediationPath" -Now $now
            }
        }

        # ── Level 4: trend detection verso ROSSO ─────────────────────────────
        if ($IncidentLevel4 -and (-not $criticalTrendSent) -and $rateHistory.Count -ge 3) {
            $last3 = $rateHistory | Select-Object -Last 3
            $isAscending = ($last3[1] -gt $last3[0]) -and ($last3[2] -gt $last3[1])
            $nearRosso = $metrics.ErrorRate -gt ($TrendMinRatePercent / 100.0)

            if ($isAscending -and $nearRosso) {
                $criticalTrendSent = $true
                Write-Warning "[Watchdog] CRITICAL TREND ROSSO: rate=$ratePct% in crescita verso $($RedThreshold*100)%"

                # Draft escalation Richard
                New-RichardEscalationDraft -ErrorRate $metrics.ErrorRate -Errors $metrics.Errors -Total $metrics.Total `
                    -RedThreshold $RedThreshold -Path $RichardDraftPath -Now $now

                # Webhook CRITICAL TREND
                Send-WebhookAlert -Url $resolvedWebhookUrl -Type $resolvedWebhookType -Channel $WebhookChannel -Now $now `
                    -ErrorRate $metrics.ErrorRate -Errors $metrics.Errors -Total $metrics.Total `
                    -DraftPath $RichardDraftPath -RemediationPath $ActiveRemediationPath -AlertKind "CRITICAL_TREND"

                $r0 = [Math]::Round($last3[0] * 100, 2)
                $r1 = [Math]::Round($last3[1] * 100, 2)
                $r2 = [Math]::Round($last3[2] * 100, 2)
                Add-AuditLogEntry -LogPath $AuditLogPath -Level "CRITICAL_TREND" -Message "Trend ROSSO: rate=$ratePct% (${r0}%->${r1}%->${r2}%) | draft-richard=$RichardDraftPath" -Now $now
                Write-Host "[Watchdog] Draft escalation Richard: $RichardDraftPath" -ForegroundColor Red
            }
        }

        # Reset flag trend se il rate scende sotto AMBRA
        if ($metrics.ErrorRate -le $ErrorThreshold) {
            $criticalTrendSent = $false
        }

        if ($StopOnAmber.IsPresent -and (-not $IncidentLevel4)) {
            Write-Warning "[Watchdog] StopOnAmber attivo: ciclo interrotto dopo alert/escalation draft."
            exit 2
        }
    }
    else {
        # Rate sotto soglia — reset flag trend
        $criticalTrendSent = $false
    }

    Start-Sleep -Seconds $PollSeconds
}