# Starts both the FastAPI Python backend and the Next.js frontend on Windows

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Starting DermaAgent (Backend + Frontend)   " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$backendJob = Start-Job -ScriptBlock {
    Set-Location (Join-Path $using:PSScriptRoot "backend")
    python -m uvicorn app:app --host 127.0.0.1 --port 8000
}

Write-Host "[1/2] Backend started on http://127.0.0.1:8000" -ForegroundColor Green

Write-Host "[2/2] Starting Next.js frontend on http://localhost:3000 ..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop both servers.`n" -ForegroundColor DarkGray

try {
    npm run dev
}
finally {
    Write-Host "`nStopping backend..." -ForegroundColor Red
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    # Clean up uvicorn process if still listening on 8000
    Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}
