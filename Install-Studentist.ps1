[CmdletBinding()]
param(
    [string]$RepositoryUrl = 'https://github.com/coochill/studentist-scheduler.git',
    [string]$InstallPath = (Join-Path $HOME 'studentist-scheduler')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-Step([string]$Message) {
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Require-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name is required but was not found."
    }
}

function Read-SecretValue([string]$Prompt) {
    $secure = Read-Host $Prompt -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

function Escape-EnvValue([string]$Value) {
    return '"' + $Value.Replace('\', '\\').Replace('"', '\"') + '"'
}

Write-Step 'Checking Docker Desktop'
Require-Command 'docker'
docker compose version | Out-Host
docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw 'Docker Desktop is installed but is not running. Start Docker Desktop, wait until it is ready, then run this script again.'
}

Write-Step 'Getting the application source'
if (Test-Path (Join-Path $InstallPath '.git')) {
    git -C $InstallPath pull --ff-only | Out-Host
} elseif (Test-Path $InstallPath) {
    throw "Install path already exists but is not a Git repository: $InstallPath"
} else {
    $parent = Split-Path -Parent $InstallPath
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
    git clone $RepositoryUrl $InstallPath | Out-Host
}

$composeFile = Join-Path $InstallPath 'docker-compose.prod.yml'
$backendEnv = Join-Path $InstallPath 'patient-scheduler-backend\.env'
$composeEnv = Join-Path $InstallPath '.env'
if (-not (Test-Path $composeFile)) {
    throw "Production Compose file was not found: $composeFile"
}

Write-Step 'Configuring local secrets'
if (-not (Test-Path $composeEnv)) {
    $databasePassword = Read-SecretValue 'Enter a database password'
    $rootDatabasePassword = Read-SecretValue 'Enter a different MySQL root password'
    @(
        'DB_DATABASE=patient_scheduler'
        'DB_USERNAME=schedpx'
        "DB_PASSWORD=$(Escape-EnvValue $databasePassword)"
        "DB_ROOT_PASSWORD=$(Escape-EnvValue $rootDatabasePassword)"
        'VITE_API_URL=http://localhost:8000/api'
    ) | Set-Content -Path $composeEnv -Encoding utf8
}

if (-not (Test-Path $backendEnv)) {
    $loginEmail = Read-Host 'Enter the studentist login email'
    $loginPassword = Read-SecretValue 'Enter the studentist login password'
    $keyBytes = New-Object byte[] 32
    [Security.Cryptography.RandomNumberGenerator]::Fill($keyBytes)
    $applicationKey = [Convert]::ToBase64String($keyBytes)
    $composePasswordLine = Get-Content $composeEnv | Where-Object { $_ -like 'DB_PASSWORD=*' } | Select-Object -First 1
    if (-not $composePasswordLine) {
        throw "DB_PASSWORD is missing from $composeEnv"
    }
    $databasePassword = $composePasswordLine.Substring(13).Trim('"')
    @(
        'APP_NAME=Studentist Scheduler'
        'APP_ENV=production'
        'APP_KEY=base64:' + $applicationKey
        'APP_DEBUG=false'
        'APP_URL=http://localhost:8000'
        'FRONTEND_URL=http://localhost'
        'DB_CONNECTION=mysql'
        'DB_HOST=mysql'
        'DB_PORT=3306'
        'DB_DATABASE=patient_scheduler'
        'DB_USERNAME=schedpx'
        "DB_PASSWORD=$(Escape-EnvValue $databasePassword)"
        "AUTH_USER_EMAIL=$(Escape-EnvValue $loginEmail)"
        "AUTH_USER_PASSWORD=$(Escape-EnvValue $loginPassword)"
        'AUTH_USER_NAME="Studentist Administrator"'
        'SESSION_DRIVER=database'
        'CACHE_STORE=database'
        'QUEUE_CONNECTION=database'
        'LOG_CHANNEL=stack'
        'LOG_STACK=single'
        'LOG_LEVEL=warning'
    ) | Set-Content -Path $backendEnv -Encoding utf8
}

Push-Location $InstallPath
try {
    Write-Step 'Building and starting the database and API'
    docker compose -f docker-compose.prod.yml up -d --build mysql backend api
    if ($LASTEXITCODE -ne 0) { throw 'Docker Compose could not start the database and API.' }

    Write-Step 'Waiting for the database'
    docker compose -f docker-compose.prod.yml up -d mysql
    docker compose -f docker-compose.prod.yml exec -T backend php artisan migrate --force
    if ($LASTEXITCODE -ne 0) { throw 'Database migrations failed.' }

    Write-Step 'Building and starting the frontend'
    docker compose -f docker-compose.prod.yml up -d --build frontend
    if ($LASTEXITCODE -ne 0) { throw 'Docker Compose could not start the frontend.' }

    Write-Step 'Deployment status'
    docker compose -f docker-compose.prod.yml ps
    Write-Host "`nStudentist Scheduler is available at http://localhost" -ForegroundColor Green
    Start-Process 'http://localhost'
} finally {
    Pop-Location
}
