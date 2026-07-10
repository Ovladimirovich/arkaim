param(
    [switch]$NoWait,
    [switch]$NoAdapter,
    [string]$BusinessPack = ""
)

$ErrorActionPreference = "Stop"
$env:HF_HUB_DISABLE_SYMLINKS_WARNING = "1"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$logs = Join-Path $root "logs"

if (-not $BusinessPack -and (Test-Path env:BUSINESS_PACK)) {
    $BusinessPack = $env:BUSINESS_PACK
}
if ($BusinessPack) {
    $env:BUSINESS_PACK = $BusinessPack
    Write-Host "Business pack: $BusinessPack" -ForegroundColor Cyan
}

$coreHost = $env:CORE_HOST; if (-not $coreHost) { $coreHost = "127.0.0.1" }
$corePort = [int]$env:CORE_PORT; if (-not $corePort) { $corePort = 8642 }
$gwHost = $env:GATEWAY_HOST; if (-not $gwHost) { $gwHost = "127.0.0.1" }
$gwPort = [int]$env:GATEWAY_PORT; if (-not $gwPort) { $gwPort = 8080 }

New-Item -ItemType Directory -Path $logs -Force | Out-Null

Write-Host "=== Hermes Runtime :: Start All ===" -ForegroundColor Cyan

Write-Host "[1/3] Starting Core (port $coreHost`:$corePort)..." -ForegroundColor Yellow
$coreJob = Start-Process -FilePath "python" -ArgumentList "-m uvicorn core.main:app --host $coreHost --port $corePort" `
    -WorkingDirectory $root -WindowStyle Normal -PassThru
Write-Host "  Core PID: $($coreJob.Id)" -ForegroundColor Green

if (-not $NoWait) {
    $coreReady = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        try {
            $r = Invoke-WebRequest -Uri "http://$coreHost`:$corePort/health" -UseBasicParsing -ErrorAction Stop
            if ($r.StatusCode -eq 200) { $coreReady = $true; break }
        } catch {}
    }
    if ($coreReady) { Write-Host "  Core: READY" -ForegroundColor Green }
    else { Write-Host "  Core: TIMEOUT" -ForegroundColor Red }
}

Write-Host "[2/3] Starting Gateway (port $gwHost`:$gwPort)..." -ForegroundColor Yellow
$gwJob = Start-Process -FilePath "python" -ArgumentList "-m uvicorn gateway.main:app --host $gwHost --port $gwPort" `
    -WorkingDirectory $root -WindowStyle Normal -PassThru
Write-Host "  Gateway PID: $($gwJob.Id)" -ForegroundColor Green

if (-not $NoWait) {
    $gwReady = $false
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Seconds 1
        try {
            $r = Invoke-WebRequest -Uri "http://$gwHost`:$gwPort/health" -UseBasicParsing -ErrorAction Stop
            if ($r.StatusCode -eq 200) { $gwReady = $true; break }
        } catch {}
    }
    if ($gwReady) { Write-Host "  Gateway: READY" -ForegroundColor Green }
    else { Write-Host "  Gateway: TIMEOUT" -ForegroundColor Red }
}

if (-not $NoAdapter) {
    Write-Host "[3/3] Starting Telegram Adapter..." -ForegroundColor Yellow
    $adapterJob = Start-Process -FilePath "python" -ArgumentList "-m integrations.telegram.run" `
        -WorkingDirectory $root -WindowStyle Normal -PassThru
    Write-Host "  Adapter PID: $($adapterJob.Id)" -ForegroundColor Green
}

Write-Host "`n=== All components launched ===" -ForegroundColor Cyan
Write-Host "  Logs: $logs" -ForegroundColor Gray
