# Planspiel-Plattform

Probeversion der Planspiel-App mit getrennten Bausteinen: Frontend, Backend und Datenbank sind
eigenständig, der Spielinhalt steckt in einem austauschbaren Spielpaket.

```
packages/core       Verträge: Spielpaket-Format, Regelwerk, PlanspielFabrik, SpielRegistry, DTOs
packages/engine     Standardfabrik "personal-standard" (rechnet Personal-Planspiele)
games/nordbyte      Spielpaket NordByte (paket.json) + 120 Referenzfälle aus der Excel-Tabelle
apps/api            Backend: Hono (Node), Auth, Rundenablauf, Berechnung auf dem Server
apps/api/migrations Datenbankschema (PostgreSQL)
apps/web            Frontend: React, Tailwind, Komponenten im CloudHelden-Foliendesign
```

Die Oberfläche kennt kein konkretes Spiel. Spalten, Formate und Farben der Übersicht kommen aus den
Kennzahl-Definitionen im Paket. Ein neues Personal-Planspiel braucht nur eine neue `paket.json`;
ein Spiel mit ganz anderen Regeln bekommt eine eigene Fabrik in `packages/engine`.

## Mit Docker starten (empfohlen)

Drei getrennte Container: `db` (PostgreSQL), `api` (Backend) und `web` (Frontend, leitet `/api` an das Backend weiter).

```bash
cp .env.example .env          # JWT_SECRET ändern
docker compose up --build     # danach http://localhost:8080
```

Beim ersten Start legt das Backend das Schema an, spielt das Spielpaket ein und (bei `DEMO_DATEN=1`)
den Demo-Kurs. Die Daten liegen im Volume `pgdata` und überstehen Neustarts.
`docker compose down -v` löscht sie.

Für einen Server: `DEMO_DATEN=0` setzen, den Port 5432 der Datenbank in `docker-compose.yml`
entfernen und einen Reverse Proxy mit HTTPS (z. B. Caddy oder Traefik) vor Port 8080 schalten.

## Ohne Docker starten (Entwicklung)

Voraussetzungen: Node 20+, pnpm 9, Docker (oder ein eigenes PostgreSQL 14+).

```bash
docker compose up -d db          # PostgreSQL auf Port 5432
pnpm install
cp apps/api/.env.example apps/api/.env   # bei eigenem Postgres DATABASE_URL anpassen
pnpm db:seed                     # Schema, Spielpaket und Demo-Kurs anlegen
pnpm dev                         # API auf :8787, Frontend auf http://localhost:5173
```

Die API liest `DATABASE_URL`, `JWT_SECRET` und `PORT` aus `apps/api/.env`.

**Demo-Zugänge** (Passwort jeweils `planspiel`):

- `helen@demo.de`: Spielleitung
- `sara@demo.de`, `lena@demo.de`, `daniel@demo.de` und weitere: Teilnehmende in vier Gruppen
- Kurscode zum Beitreten: `NB2026`

## Tests

```bash
pnpm --filter @planspiel/game-nordbyte test   # Engine gegen 120 Referenzfälle (1.320 Runden)
DATABASE_URL=postgres://…/planspiel_test pnpm --filter @planspiel/api test   # Durchlauf gegen echte DB
```

Der API-Test spielt Runde 0 und 1 mit Team Delta aus dem Foliensatz durch und prüft die Teamwerte
75,0 und 79,4, die Rechte (Teilnehmende sehen keine Wirkungen, keine fremden Abgaben), die Rotation
mit Partnerabteilung und den Rundenablauf. **Achtung:** Der Test leert die angegebene Datenbank.

## Rundenablauf

1. Spielleitung gibt eine Runde frei.
2. Gruppen speichern Entwürfe und geben ab. Das Backend prüft Optionen, Partner und Ressourcen.
3. Spielleitung schließt die Abgabe, gibt Abgaben frei oder zurück, vergibt Punkte und würfelt.
4. Spielleitung wertet aus. Das Backend rechnet alle Gruppen neu, die Übersicht aktualisiert sich.

## API (Auszug)

| Methode | Pfad | Wer |
| --- | --- | --- |
| POST | `/api/auth/registrieren`, `/api/auth/anmelden` | alle |
| GET | `/api/spiele` | angemeldet |
| GET/POST | `/api/kurse`, `/api/kurse/beitreten` | angemeldet |
| GET | `/api/kurse/:id`, `/api/kurse/:id/spiel`, `/api/kurse/:id/ergebnisse` | Mitglieder |
| PUT | `/api/kurse/:id/runden/:nr/abgabe` | Teilnehmende |
| POST | `/api/kurse/:id/runden/:nr/status`, `…/wuerfeln` | Spielleitung |
| PUT | `/api/kurse/:id/runden/:nr/bewertungen/:gruppe` | Spielleitung |
| POST/DELETE/PATCH | `/api/kurse/:id/gruppen`, `/api/kurse/:id/mitglieder/:uid` | Spielleitung |

## Bewusst noch offen

- Echtzeit: Das Frontend fragt alle 5 Sekunden nach (kein WebSocket).
- Paket-Editor und Upload neuer Pakete über die Oberfläche
- Passwort vergessen, E-Mail-Bestätigung
