param(
    [string]$LogPath = "c:\Users\user\OneDrive\dashboard_user\runtime\radius_telemetry.log",
    [datetime]$StartTime = (Get-Date).Date.AddHours(5),
    [datetime]$EndTime = (Get-Date).Date.AddHours(9),
    [int]$BucketMinutes = 5,
    [double]$SevereThreshold = 0.10,
    [int]$CurrentWindowMinutes = 60,
    [string]$OutputPath = "c:\Users\user\OneDrive\dashboard_user\Readiness\morning_audit.txt",
    [string]$ExecutiveOutputPath = "c:\Users\user\OneDrive\dashboard_user\Readiness\morning_audit_executive.txt",
    [string]$WebhookUrl = "",
    [ValidateSet("auto", "teams", "slack")]
    [string]$WebhookType = "auto",
    [string]$WebhookChannel = "#all-cybersecurity-engineering-data"
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
        [string]$Text
    )

    if ([string]::IsNullOrWhiteSpace($Url)) {
        Write-Warning "[Morning Audit] Nessun webhook configurato: notifica saltata."
        return
    }

    $payload = @{ text = $Text; channel = $Channel }
    try {
        Invoke-RestMethod -Method Post -Uri $Url -ContentType "application/json" -Body ($payload | ConvertTo-Json -Depth 5) | Out-Null
        Write-Host "[Morning Audit] Notifica webhook inviata ($Type)." -ForegroundColor Cyan
    }
    catch {
        Write-Warning "[Morning Audit] Invio webhook fallito: $($_.Exception.Message)"
    }
}

function Get-ParsedRadiusEvents {
    param([string]$Path)

    $parsed = New-Object System.Collections.Generic.List[object]
    $rawLines = Get-Content -Path $Path -ErrorAction Stop
    foreach ($line in $rawLines) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }

        $eventType = Get-RadiusEventType -Line $line
        if (-not $eventType) { continue }

        $dateMatch = [regex]::Match($line, "\b\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}")
        if (-not $dateMatch.Success) { continue }

        try {
            $ts = [datetime]::Parse($dateMatch.Value)
        }
        catch {
            continue
        }

        $parsed.Add([pscustomobject]@{
            Time = $ts
            Type = $eventType
            Raw  = $line
        })
    }

    return @($parsed | Sort-Object -Property Time)
}

function Get-WindowSummary {
    param(
        [object[]]$Events,
        [datetime]$WindowStart,
        [datetime]$WindowEnd,
        [int]$MinutesPerBucket
    )

    $windowEvents = @($Events | Where-Object { $_.Time -ge $WindowStart -and $_.Time -le $WindowEnd })
    $bucketMap = @{}
    $lastEventTime = $null

    foreach ($event in $windowEvents) {
        $lastEventTime = $event.Time
        $minuteFloor = [math]::Floor($event.Time.Minute / $MinutesPerBucket) * $MinutesPerBucket
        $bucketStart = Get-Date -Year $event.Time.Year -Month $event.Time.Month -Day $event.Time.Day -Hour $event.Time.Hour -Minute $minuteFloor -Second 0
        $bucketKey = $bucketStart.ToString("yyyy-MM-dd HH:mm")

        if (-not $bucketMap.ContainsKey($bucketKey)) {
            $bucketMap[$bucketKey] = [ordered]@{
                Start  = $bucketStart
                Total  = 0
                Errors = 0
            }
        }

        $bucketMap[$bucketKey].Total++
        if ($event.Type -in @("TIMEOUT", "REJECT")) {
            $bucketMap[$bucketKey].Errors++
        }
    }

    $sortedBuckets = $bucketMap.GetEnumerator() |
        ForEach-Object {
            $rate = 0.0
            if ($_.Value.Total -gt 0) {
                $rate = $_.Value.Errors / $_.Value.Total
            }

            [pscustomobject]@{
                Start     = $_.Value.Start
                Total     = $_.Value.Total
                Errors    = $_.Value.Errors
                ErrorRate = $rate
            }
        } |
        Sort-Object -Property Start

    $peak = $null
    if ($sortedBuckets) {
        $peak = $sortedBuckets | Sort-Object -Property ErrorRate, Errors -Descending | Select-Object -First 1
    }

    $total = $windowEvents.Count
    $errors = @($windowEvents | Where-Object { $_.Type -in @("TIMEOUT", "REJECT") }).Count
    $rate = 0.0
    if ($total -gt 0) { $rate = $errors / $total }

    $state = "VERDE"
    if ($rate -gt 0.15) { $state = "ROSSO" }
    elseif ($rate -gt 0.05) { $state = "AMBRA" }

    [pscustomobject]@{
        WindowStart   = $WindowStart
        WindowEnd     = $WindowEnd
        Total         = $total
        Errors        = $errors
        ErrorRate     = $rate
        State         = $state
        LastEventTime = $lastEventTime
        Peak          = $peak
        Buckets       = @($sortedBuckets)
    }
}

function Format-Percent {
    param([double]$Value)
    return [Math]::Round(($Value * 100), 2)
}

if (-not (Test-Path -Path $LogPath)) {
    throw "Log non trovato: $LogPath"
}

foreach ($path in @($OutputPath, $ExecutiveOutputPath)) {
    $dir = Split-Path -Path $path -Parent
    if (-not (Test-Path -Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

$events = Get-ParsedRadiusEvents -Path $LogPath
$now = Get-Date
$overnight = Get-WindowSummary -Events $events -WindowStart $StartTime -WindowEnd $EndTime -MinutesPerBucket $BucketMinutes
$currentStart = $now.AddMinutes(-$CurrentWindowMinutes)
$current = Get-WindowSummary -Events $events -WindowStart $currentStart -WindowEnd $now -MinutesPerBucket $BucketMinutes
$currentMode = "rolling"

if ($current.Total -eq 0 -and $events.Count -gt 0) {
    $fallbackStart = ($events | Select-Object -First 1).Time
    $fallbackEnd = ($events | Select-Object -Last 1).Time
    $current = Get-WindowSummary -Events $events -WindowStart $fallbackStart -WindowEnd $fallbackEnd -MinutesPerBucket $BucketMinutes
    $currentMode = "full-log-fallback"
}

$deltaErrors = $current.Errors - $overnight.Errors
$deltaTotal = $current.Total - $overnight.Total
$deltaRatePct = [Math]::Round((($current.ErrorRate - $overnight.ErrorRate) * 100), 2)
$trendText = if ($deltaRatePct -gt 0) { "Peggioramento" } elseif ($deltaRatePct -lt 0) { "Miglioramento" } else { "Stabile" }

$reportLines = New-Object System.Collections.Generic.List[string]
$reportLines.Add("[DELTA REPORT] — Overnight Audit RADIUS")
$reportLines.Add(("Generated: {0}" -f $now.ToString("yyyy-MM-dd HH:mm:ss")))
$reportLines.Add(("Confronto: overnight {0} -> {1} VS current snapshot {2}" -f $StartTime.ToString("yyyy-MM-dd HH:mm:ss"), $EndTime.ToString("yyyy-MM-dd HH:mm:ss"), $currentMode))
$reportLines.Add("")
$reportLines.Add("1. Overnight window (05:00–09:00)")
$reportLines.Add(("- Stato: {0}" -f $overnight.State))
$reportLines.Add(("- Eventi totali: {0}" -f $overnight.Total))
$reportLines.Add(("- Errori totali: {0}" -f $overnight.Errors))
$reportLines.Add(("- Error rate: {0}%" -f (Format-Percent -Value $overnight.ErrorRate)))
$reportLines.Add(("- Ultimo evento osservato: {0}" -f $(if ($overnight.LastEventTime) { $overnight.LastEventTime.ToString("yyyy-MM-dd HH:mm:ss") } else { "N/D" })))
if ($overnight.Peak) {
    $reportLines.Add(("- Picco massimo: {0}% ({1}/{2}) alle {3}" -f (Format-Percent -Value $overnight.Peak.ErrorRate), $overnight.Peak.Errors, $overnight.Peak.Total, $overnight.Peak.Start.ToString("HH:mm")))
}
else {
    $reportLines.Add("- Picco massimo: N/D")
}

$reportLines.Add("")
$reportLines.Add(("2. Current snapshot ({0})" -f $currentMode))
$reportLines.Add(("- Finestra attuale: {0} -> {1}" -f $current.WindowStart.ToString("yyyy-MM-dd HH:mm:ss"), $current.WindowEnd.ToString("yyyy-MM-dd HH:mm:ss")))
$reportLines.Add(("- Stato: {0}" -f $current.State))
$reportLines.Add(("- Eventi totali: {0}" -f $current.Total))
$reportLines.Add(("- Errori totali: {0}" -f $current.Errors))
$reportLines.Add(("- Error rate: {0}%" -f (Format-Percent -Value $current.ErrorRate)))
$reportLines.Add(("- Ultimo evento osservato: {0}" -f $(if ($current.LastEventTime) { $current.LastEventTime.ToString("yyyy-MM-dd HH:mm:ss") } else { "N/D" })))
if ($current.Peak) {
    $reportLines.Add(("- Picco massimo: {0}% ({1}/{2}) alle {3}" -f (Format-Percent -Value $current.Peak.ErrorRate), $current.Peak.Errors, $current.Peak.Total, $current.Peak.Start.ToString("HH:mm")))
}
else {
    $reportLines.Add("- Picco massimo: N/D")
}

$reportLines.Add("")
$reportLines.Add("3. Delta comparativo")
$reportLines.Add(("- Trend complessivo: {0}" -f $trendText))
$reportLines.Add(("- Delta error rate: {0}%" -f $deltaRatePct))
$reportLines.Add(("- Delta errori: {0}" -f $deltaErrors))
$reportLines.Add(("- Delta eventi totali: {0}" -f $deltaTotal))
$reportLines.Add(("- Interpretazione: overnight={0}, current={1}" -f $overnight.State, $current.State))

$reportLines.Add("")
$reportLines.Add("4. Executive takeaway")
$reportLines.Add(("- Stato di rischio corrente: {0}" -f $current.State))
$reportLines.Add(("- Overnight state: {0}" -f $overnight.State))
$reportLines.Add("- Se current >= AMBRA, mantenere triage e pre-check MAB attivi.")
$reportLines.Add("- Se current = VERDE, mantenere Continuous Ops con heartbeat Slack ogni 4 ore.")

Set-Content -Path $OutputPath -Value $reportLines -Encoding UTF8
Write-Host "[Morning Audit] Report comparativo scritto in $OutputPath" -ForegroundColor Green

$execLines = @(
    "Oggetto: Morning Audit comparativo — Branch Pilot 802.1X",
    "",
    "Richard/Board,",
    "",
    ("l'audit comparativo completato il {0} evidenzia un confronto tra la finestra overnight (05:00–09:00) e lo snapshot attuale dei log RADIUS." -f $now.ToString("yyyy-MM-dd HH:mm:ss")),
    "",
    ("Sintesi overnight: stato {0}, error rate {1}%, errori {2}/{3}." -f $overnight.State, (Format-Percent -Value $overnight.ErrorRate), $overnight.Errors, $overnight.Total),
    ("Sintesi attuale: stato {0}, error rate {1}%, errori {2}/{3}." -f $current.State, (Format-Percent -Value $current.ErrorRate), $current.Errors, $current.Total),
    ("Delta complessivo: {0} ({1}% di variazione error rate)." -f $trendText, $deltaRatePct),
    "",
    ("Valutazione esecutiva: rischio corrente {0}." -f $current.State),
    "Raccomandazione: mantenere Continuous Ops attivo; se il rate torna sopra AMBRA, applicare immediatamente pre-check porta, MAB selettivo e bridge operativo.",
    "",
    "Cordiali saluti,",
    "Network Security Operations"
)
Set-Content -Path $ExecutiveOutputPath -Value $execLines -Encoding UTF8
Write-Host "[Morning Audit] Executive report scritto in $ExecutiveOutputPath" -ForegroundColor Green

$peakForAlert = @($overnight.Peak, $current.Peak) | Where-Object { $null -ne $_ } | Sort-Object -Property ErrorRate -Descending | Select-Object -First 1
if ($peakForAlert -and $peakForAlert.ErrorRate -gt $SevereThreshold) {
    $peakPct = [math]::Round(($peakForAlert.ErrorRate * 100), 2)
    $resolvedType = Get-ResolvedWebhookType -Type $WebhookType -Url $WebhookUrl
    $text = "[OVERNIGHT AUDIT ALERT] Confronto completato | overnight=$($overnight.State) current=$($current.State) | peak=${peakPct}% | delta=${deltaRatePct}% | report=$OutputPath"
    Send-WebhookAlert -Url $WebhookUrl -Type $resolvedType -Channel $WebhookChannel -Text $text
}
