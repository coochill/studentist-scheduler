[CmdletBinding()]
param(
    [string]$InstallPath = (Join-Path $HOME 'studentist-scheduler')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

try {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw 'Docker Desktop is not installed. Install Docker Desktop before starting Studentist Scheduler.'
    }

    docker info *> $null
    if ($LASTEXITCODE -ne 0) {
        throw 'Docker Desktop is not running. Open Docker Desktop, wait until it is ready, then run this file again.'
    }

    $composeFile = Join-Path $InstallPath 'docker-compose.prod.yml'
    if (-not (Test-Path $composeFile)) {
        throw "Studentist Scheduler was not found at $InstallPath. Run Install-Studentist.ps1 first."
    }

    Push-Location $InstallPath
    try {
        Write-Host 'Starting Studentist Scheduler...' -ForegroundColor Cyan
        docker compose -f docker-compose.prod.yml up -d
        if ($LASTEXITCODE -ne 0) {
            throw 'Docker could not start Studentist Scheduler.'
        }

        Write-Host 'Waiting for the application...' -ForegroundColor Cyan
        $ready = $false
        for ($attempt = 1; $attempt -le 30; $attempt++) {
            try {
                $response = Invoke-WebRequest -Uri 'http://localhost' -UseBasicParsing -TimeoutSec 3
                if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                    $ready = $true
                    break
                }
            } catch {
                Start-Sleep -Seconds 2
            }
        }

        if (-not $ready) {
            throw 'The application did not become available. Check Docker Desktop or run: docker compose -f docker-compose.prod.yml logs --tail=100'
        }

        Start-Process 'http://localhost'
        Write-Host 'Studentist Scheduler is open at http://localhost' -ForegroundColor Green
    } finally {
        Pop-Location
    }
} catch {
    Write-Host "`nUnable to start Studentist Scheduler:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Read-Host 'Press Enter to close'
    exit 1
}
