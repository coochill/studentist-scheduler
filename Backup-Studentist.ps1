[CmdletBinding()]
param(
    [string]$InstallPath = (Join-Path $HOME 'studentist-scheduler')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$composeFile = Join-Path $InstallPath 'docker-compose.prod.yml'
$backupDirectory = Join-Path $InstallPath 'backups'

if (-not (Test-Path $composeFile)) {
    throw "Studentist Scheduler was not found at $InstallPath."
}

New-Item -ItemType Directory -Force -Path $backupDirectory | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupPath = Join-Path $backupDirectory "patient_scheduler_backup_$timestamp.sql"

Push-Location $InstallPath
try {
    $mysqlContainer = docker compose -f $composeFile ps -q mysql
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($mysqlContainer)) {
        throw 'The MySQL container is not running. Start Studentist Scheduler before creating a backup.'
    }

    docker compose -f $composeFile exec -T mysql sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' |
        Set-Content -Path $backupPath -Encoding utf8

    if ($LASTEXITCODE -ne 0) {
        Remove-Item -LiteralPath $backupPath -Force -ErrorAction SilentlyContinue
        throw 'MySQL backup failed.'
    }

    Write-Host "Database backup created: $backupPath" -ForegroundColor Green
} finally {
    Pop-Location
}
