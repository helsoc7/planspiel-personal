# Planspiel auf einem eigenen Server

Schritt für Schritt vom leeren VPS bis zur laufenden App mit HTTPS. Geschrieben für einen
one.com Cloud Server S mit Ubuntu 24.04, passt aber für jeden Linux-Server mit Root-Zugang
(netcup, IONOS, Hetzner).

Am Ende laufen fünf Container: `db` (PostgreSQL), `api`, `web`, `caddy` (HTTPS) und `backup`
(nächtliche Datenbanksicherung). Nach außen offen sind nur die Ports 80 und 443.

Platzhalter in den Befehlen:

- `SERVER-IP` – die IPv4-Adresse aus der Bestätigung von one.com
- `planspiel.example.de` – deine Adresse für die App

## 1. DNS-Eintrag anlegen

Bei deinem Domain-Anbieter einen **A-Eintrag** anlegen: `planspiel.example.de` → `SERVER-IP`.
Das kann bis zu einer Stunde dauern. Prüfen vom eigenen Rechner:

```bash
dig +short planspiel.example.de     # muss SERVER-IP zeigen
```

Ohne diesen Eintrag bekommt Caddy später kein Zertifikat.

## 2. Erster Login und SSH-Key

one.com schickt das Root-Passwort per E-Mail. Vom eigenen Rechner:

```bash
ssh-copy-id root@SERVER-IP          # einmal mit Passwort, danach per Key
ssh root@SERVER-IP                  # muss jetzt ohne Passwort gehen
```

Erst wenn der Login per Key klappt, den Passwort-Login abschalten (auf dem Server):

```bash
printf 'PasswordAuthentication no\nPermitRootLogin prohibit-password\n' > /etc/ssh/sshd_config.d/10-nur-key.conf
sshd -t && systemctl reload ssh
```

In einem **zweiten** Terminal testen, ob der Login noch geht, bevor du das erste schließt.

## 3. Updates, Firewall und Docker

```bash
apt update && apt -y full-upgrade
apt -y install docker.io docker-compose-v2 git unattended-upgrades ufw
systemctl enable --now docker
dpkg-reconfigure -f noninteractive unattended-upgrades   # Sicherheitsupdates automatisch
timedatectl set-timezone Europe/Berlin

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable
```

Hinweis: Docker umgeht `ufw` für veröffentlichte Ports. Deshalb veröffentlicht
`docker-compose.prod.yml` nur 80 und 443, alles andere bleibt im internen Docker-Netz.

Falls ein Neustart nötig ist (`/var/run/reboot-required` existiert): `reboot`, dann neu einloggen.

## 4. Code holen

```bash
git clone https://github.com/helsoc7/planspiel-personal.git /opt/planspiel
cd /opt/planspiel
```

Ist das Repository privat, fragt git nach Benutzername und Passwort. Als Passwort dient ein
GitHub-Token mit Leserecht auf dieses eine Repository (GitHub → Settings → Developer settings →
Fine-grained tokens). Alternativ einen Deploy-Key einrichten.

## 5. Einstellungen in der `.env`

```bash
cp .env.example .env
openssl rand -hex 32                 # Ausgabe als JWT_SECRET eintragen
openssl rand -hex 16                 # Ausgabe als POSTGRES_PASSWORT eintragen
nano .env
chmod 600 .env
```

Diese Werte müssen gesetzt sein:

| Variable | Wert |
| --- | --- |
| `DOMAIN` | `planspiel.example.de` |
| `ACME_EMAIL` | deine E-Mail (optional, für Zertifikatshinweise) |
| `JWT_SECRET` | Ausgabe von `openssl rand -hex 32` |
| `POSTGRES_PASSWORT` | Ausgabe von `openssl rand -hex 16` |
| `ADMIN_EMAIL`, `ADMIN_NAME` | dein Admin-Konto |
| `ADMIN_PASSWORT` | mindestens 12 Zeichen, nur fürs erste Anlegen |

`DEMO_DATEN` spielt auf dem Server keine Rolle: Die Produktiv-Konfiguration startet immer ohne
Demokonten. Fehlt `DOMAIN`, `JWT_SECRET` oder `POSTGRES_PASSWORT`, bricht der Start mit einer
klaren Meldung ab.

## 6. Starten

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps        # alle Dienste "running" bzw. "healthy"
docker compose -f docker-compose.prod.yml logs -f caddy api
```

Der erste Build dauert einige Minuten. In den Logs von `api` steht danach
„Admin-Konto … angelegt“ und „API läuft“, in den Logs von `caddy` „certificate obtained successfully“.

Dann `https://planspiel.example.de` öffnen, mit dem Admin-Konto anmelden und das eigene Passwort
über das Schlüssel-Symbol oben ändern. Danach `ADMIN_PASSWORT` aus der `.env` löschen.

## 7. Updates einspielen

Nachdem du lokal committet und gepusht hast:

```bash
cd /opt/planspiel
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker image prune -f                                # alte Images aufräumen
```

Datenbank-Migrationen laufen beim Start der API automatisch. Laufende Kurse bleiben erhalten.

## 8. Backups

Der Dienst `backup` sichert die Datenbank beim Start und danach jede Nacht gegen 3 Uhr UTC
nach `/opt/planspiel/backups/` und löscht Sicherungen, die älter als `BACKUP_TAGE` (Standard 14) sind.

```bash
ls -lh /opt/planspiel/backups/
docker compose -f docker-compose.prod.yml logs backup        # "Sicherung erstellt" oder "FEHLER"
```

Die Sicherungen liegen auf demselben Server. Ab und zu eine Kopie auf den eigenen Rechner holen:

```bash
scp root@SERVER-IP:/opt/planspiel/backups/planspiel-*.sql.gz ~/Backups/planspiel/
```

Wiederherstellen (überschreibt den aktuellen Stand der Datenbank):

```bash
cd /opt/planspiel
docker compose -f docker-compose.prod.yml stop api
gunzip -c backups/planspiel-2026-11-20_0300.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U planspiel -d planspiel
docker compose -f docker-compose.prod.yml start api
```

## Wenn etwas nicht klappt

| Problem | Ursache und Lösung |
| --- | --- |
| Browser meldet unsicheres Zertifikat | DNS zeigt noch nicht auf den Server (`dig +short …`). Nach der Korrektur `docker compose -f docker-compose.prod.yml restart caddy`. |
| `api` startet nicht, Log: „JWT_SECRET fehlt oder ist unsicher“ | `JWT_SECRET` in der `.env` setzen (mindestens 32 Zeichen). |
| `api` startet nicht, Log: „password authentication failed“ | `POSTGRES_PASSWORT` wurde nach dem ersten Start geändert. Das Passwort gilt nur beim allerersten Start. Alten Wert wieder eintragen. |
| Seite lädt, aber „Backend nicht erreichbar“ | `docker compose -f docker-compose.prod.yml logs api` ansehen. |
| Build bricht mit „killed“ ab | Zu wenig Speicher. Swap anlegen: `fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile`, dauerhaft mit `echo '/swapfile none swap sw 0 0' >> /etc/fstab`. |
| Admin-Passwort vergessen | `ADMIN_PASSWORT` hilft nicht, es setzt kein bestehendes Passwort zurück. Neues Admin-Konto über eine andere `ADMIN_EMAIL` anlegen lassen oder per SQL ein neues Passwort setzen. |
