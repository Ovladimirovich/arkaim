Write-Host "Stopping Hermes Runtime processes..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.ProcessName -eq "python" } | ForEach-Object {
    $cmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine
    if ($cmdLine -match "hermes") {
        Write-Host "  Killing PID $($_.Id): $($cmdLine.Substring(0, [Math]::Min(80, $cmdLine.Length)))" -ForegroundColor Gray
        Stop-Process -Id $_.Id -Force
    }
}
Write-Host "Done." -ForegroundColor Green
