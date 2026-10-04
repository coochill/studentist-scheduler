# Studentist Scheduler

## Instructions for the studentist

This application runs on your Windows laptop through Docker Desktop. You only
need to install Docker once. After that, open the application in your browser
at:

```text
http://localhost
```

### One-time installation

1. Install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/).
2. Open Docker Desktop and wait until it says that Docker is running.
3. Open **PowerShell** from the Windows Start menu.
4. Copy and run these commands:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
irm https://raw.githubusercontent.com/coochill/studentist-scheduler/main/Install-Studentist.ps1 -OutFile Install-Studentist.ps1
.\Install-Studentist.ps1
```

5. The installer will ask you to create:
   - A database password
   - A MySQL root password
   - Your login email
   - Your login password

   These passwords are private. Do not send them to anyone.

6. When installation finishes, the browser will open automatically. If it does
   not, open [http://localhost](http://localhost) yourself.

The first installation can take several minutes because Docker needs to
download the application images and build the frontend.

### Daily startup

1. Open Docker Desktop and wait until it is running.
2. Open PowerShell.
3. Run:

```powershell
cd "$HOME\studentist-scheduler"
docker compose -f docker-compose.prod.yml up -d
Start-Process "http://localhost"
```

4. Sign in using the email and password created during installation.

Keep Docker Desktop running while using the application. You may minimize
Docker Desktop; it does not need to remain visible.

### Daily shutdown

When finished, close the browser. You may leave Docker running, or stop the
application to free memory:

```powershell
cd "$HOME\studentist-scheduler"
docker compose -f docker-compose.prod.yml stop
```

Stopping the application does **not** delete patient records.

### Updating the application

When you are told that an update is available:

```powershell
cd "$HOME\studentist-scheduler"
git pull --ff-only
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend php artisan migrate --force
```

Then open [http://localhost](http://localhost) again. Normal updates preserve
the database volume and do not delete patient records.

### Backing up patient records

Create a backup regularly, especially before updating the application or the
computer:

```powershell
cd "$HOME\studentist-scheduler"
docker compose -f docker-compose.prod.yml exec -T mysql `
  mysqldump -u schedpx -p patient_scheduler > "backup-$(Get-Date -Format yyyyMMdd-HHmm).sql"
```

The command will ask for the database password. Store the resulting `.sql`
file somewhere separate from the laptop, preferably on an encrypted drive or
approved private storage. A backup stored only on the same laptop will not
protect against laptop failure.

### If something goes wrong

First check that Docker Desktop is running, then run:

```powershell
cd "$HOME\studentist-scheduler"
docker compose -f docker-compose.prod.yml ps
```

All services should be running, with `mysql`, `api`, and `frontend` showing
`healthy` where a health check is available.

To view recent errors:

```powershell
docker compose -f docker-compose.prod.yml logs --tail=100
```

Do **not** run `docker compose down -v` unless specifically instructed. The
`-v` option deletes the database volume and can permanently delete patient
records.

For support, send the output of the `ps` command and the relevant error
message. Never send `.env` files, passwords, or database backup files.

### Important privacy reminder

This application contains patient information. Keep the laptop protected with
a Windows password, install Windows and Docker updates, do not share the login
credentials, and do not use the application on a public or shared computer.
