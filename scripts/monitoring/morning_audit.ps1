param(
    [string]$LogPath = "c:\Users\user\OneDrive\dashboard_user\runtime\radius_telemetry.log",
    [datetime]$StartTime = (Get-Date).Date.AddHours(5),
    [datetime]$EndTime = (Get-Date).Date.AddHours(9),
    [int]$BucketMinutes = 5,
    [double]$SevereThreshold = 0.10,
    [string]$OutputPath = "c:\Users\user\OneDrive\dashboard_user\Readiness\morning_audit.txt",
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

if (-not (Test-Path -Path $LogPath)) {
    throw "Log non trovato: $LogPath"
}

$outDir = Split-Path -Path $OutputPath -Parent
if (-not (Test-Path -Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

$bucketMap = @{}
$eventsInWindow = 0
$errorsInWindow = 0
$lastEventTime = $null

$lines = Get-Content -Path $LogPath -ErrorAction Stop
foreach ($line in $lines) {
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

    if ($ts -lt $StartTime -or $ts -gt $EndTime) { continue }

    $eventsInWindow++
    if ($eventType -in @("TIMEOUT", "REJECT")) { $errorsInWindow++ }
    $lastEventTime = $ts

    $minuteFloor = [math]::Floor($ts.Minute / $BucketMinutes) * $BucketMinutes
    $bucketStart = Get-Date -Year $ts.Year -Month $ts.Month -Day $ts.Day -Hour $ts.Hour -Minute $minuteFloor -Second 0
    $bucketKey = $bucketStart.ToString("yyyy-MM-dd HH:mm")

    if (-not $bucketMap.ContainsKey($bucketKey)) {
        $bucketMap[$bucketKey] = [ordered]@{
            Start  = $bucketStart
            Total  = 0
            Errors = 0
        }
    }

    $bucketMap[$bucketKey].Total++
    if ($eventType -in @("TIMEOUT", "REJECT")) {
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

$finalState = "VERDE"
if ($peak) {
    if ($peak.ErrorRate -gt 0.15) { $finalState = "ROSSO" }
    elseif ($peak.ErrorRate -gt 0.05) { $finalState = "AMBRA" }
}

$severeFound = $false
if ($peak -and $peak.ErrorRate -gt $SevereThreshold) {
    $severeFound = $true
}

$reportLines = New-Object System.Collections.Generic.List[string]
$reportLines.Add("[DELTA REPORT] — Overnight Audit RADIUS")
$reportLines.Add(("Generated: {0}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")))
$reportLines.Add(("Analisi finestra: {0} -> {1}" -f $StartTime.ToString("yyyy-MM-dd HH:mm:ss"), $EndTime.ToString("yyyy-MM-dd HH:mm:ss")))
$reportLines.Add("")
$reportLines.Add("1. Eventuali picchi di errore")

if (-not $peak) {
    $reportLines.Add("- Nessun evento telemetria rilevato nella finestra analizzata.")
}
else {
    $peakPct = [math]::Round(($peak.ErrorRate * 100), 2)
    $reportLines.Add(("- Picco massimo errori: {0}% ({1}/{2}) su bucket {3}" -f $peakPct, $peak.Errors, $peak.Total, $peak.Start.ToString("HH:mm")))
    $topAbnormal = $sortedBuckets | Where-Object { $_.ErrorRate -gt 0.05 }
    if ($topAbnormal) {
        foreach ($b in $topAbnormal) {
            $bPct = [math]::Round(($b.ErrorRate * 100), 2)
            $reportLines.Add(("  • {0} -> {1}% ({2}/{3})" -f $b.Start.ToString("HH:mm"), $bPct, $b.Errors, $b.Total))
        }
    }
    else {
        $reportLines.Add("- Nessun bucket oltre soglia AMBRA.")
    }
}

$reportLines.Add("")
$reportLines.Add("2. Orario del picco massimo")
if ($peak) {
    $reportLines.Add(("- {0}" -f $peak.Start.ToString("yyyy-MM-dd HH:mm:ss")))
}
else {
    $reportLines.Add("- N/D (nessun evento nel periodo)")
}

$reportLines.Add("")
$reportLines.Add("3. Stato finale del sistema")
$reportLines.Add(("- Stato finale: {0}" -f $finalState))
$reportLines.Add(("- Eventi totali nella finestra: {0}" -f $eventsInWindow))
$reportLines.Add(("- Errori totali nella finestra: {0}" -f $errorsInWindow))
$reportLines.Add(("- Ultimo evento osservato: {0}" -f $(if ($lastEventTime) { $lastEventTime.ToString("yyyy-MM-dd HH:mm:ss") } else { "N/D" })))

Set-Content -Path $OutputPath -Value $reportLines -Encoding UTF8
Write-Host "[Morning Audit] Report scritto in $OutputPath" -ForegroundColor Green

if ($severeFound) {
    $peakPct = [math]::Round(($peak.ErrorRate * 100), 2)
    $resolvedType = Get-ResolvedWebhookType -Type $WebhookType -Url $WebhookUrl
    $text = "[OVERNIGHT AUDIT ALERT] Picco grave rilevato tra 05:00 e 09:00 | peak=${peakPct}% | time=$($peak.Start.ToString('HH:mm')) | finalState=$finalState | report=$OutputPath"
    Send-WebhookAlert -Url $WebhookUrl -Type $resolvedType -Channel $WebhookChannel -Text $text
}