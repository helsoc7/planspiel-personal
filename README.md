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
cp .env.example .env          # Werte eintragen, siehe Kommentare in der Datei
docker compose up --build     # danach http://localhost:8080
```

Beim ersten Start legt das Backend das Schema an, spielt das Spielpaket ein und (bei `DEMO_DATEN=1`)
den Demo-Kurs. Die Daten liegen im Volume `pgdata` und überstehen Neustarts.
`docker compose down -v` löscht sie.

**Für einen eigenen Server** gibt es `docker-compose.prod.yml` mit Caddy (HTTPS), nächtlichem
Datenbank-Backup und ohne Demodaten. Die Schritt-für-Schritt-Anleitung steht in [DEPLOY.md](DEPLOY.md).

## Ohne Docker starten (Entwicklung)

Voraussetzungen: Node 20+, pnpm 9, Docker (oder ein eigenes PostgreSQL 14+).

```bash
docker compose up -d db          # PostgreSQL auf Port 5432
pnpm install
cp apps/api/.env.example apps/api/.env   # bei eigenem Postgres DATABASE_URL anpassen
pnpm db:seed                     # Schema, Spielpaket und Demo-Kurs anlegen
pnpm dev                         # API auf :8787, Frontend auf http://localhost:5173
```

Die API liest `DATABASE_URL`, `JWT_SECRET`, `PORT`, `DEMO_DATEN` und die `ADMIN_*`-Werte aus `apps/api/.env`.

**Demo-Zugänge** (Passwort jeweils `planspiel`):

- `helen@demo.de`: Admin und Spielleitung im Demo-Kurs
- `sara@demo.de`, `lena@demo.de`, `daniel@demo.de` und weitere: Teilnehmende in vier Gruppen
- Teilnehmer-Code: `NB2026`, Spielleiter-Code: `SL-NB2026`

## Konten und Rollen

- **Admin:** wird beim Start aus `ADMIN_EMAIL`, `ADMIN_NAME` und `ADMIN_PASSWORT` angelegt. Nur der Admin legt Kurse an.
- **Jeder Kurs hat zwei Codes:** einen Teilnehmer-Code (6 Zeichen) und einen Spielleiter-Code (`SL-` und 8 Zeichen).
- **Registrieren geht nur mit einem dieser Codes.** Der Code bestimmt die Rolle im Kurs. Wer schon ein Konto hat,
  tritt unter „Kurs beitreten“ mit dem Code bei. Ein Spielleiter-Code macht Teilnehmende zur Spielleitung, nie umgekehrt.
- **Codes verwalten** (Seite „Gruppen“): Den Teilnehmer-Code erneuern oder sperren kann die Spielleitung,
  den Spielleiter-Code nur der Admin. Ein neuer Code macht den alten ungültig.
- **Passwort vergessen:** Die Spielleitung setzt auf der Seite „Gruppen“ über das Schlüssel-Symbol ein
  Einmalpasswort für Teilnehmende, der Admin auch für Spielleitungen. Die Person wird überall abgemeldet und muss bei
  der nächsten Anmeldung ein eigenes Passwort festlegen. Das eigene Passwort ändert jede Person über das
  Schlüssel-Symbol in der Kopfzeile. Das Admin-Konto lässt sich hier nicht zurücksetzen.
- Nach 20 fehlgeschlagenen Versuchen (falscher Code, falsches Passwort) sperrt die API eine IP-Adresse für 10 Minuten.

## Tests

```bash
pnpm --filter @planspiel/game-nordbyte test   # Engine gegen 120 Referenzfälle (1.320 Runden)
DATABASE_URL=postgres://…/planspiel_test pnpm --filter @planspiel/api test   # Durchlauf gegen echte DB
```

Der API-Test prüft Registrierung und Rollen über die Codes, spielt Runde 0 und 1 mit Team Delta aus dem Foliensatz durch und prüft die Teamwerte
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
| POST | `/api/auth/registrieren` (nur mit Kurscode), `/api/auth/anmelden` | alle |
| GET | `/api/spiele`, `/api/kurse` | angemeldet |
| POST | `/api/kurse/beitreten` | angemeldet, mit Kurscode |
| POST | `/api/kurse` | Admin |
| POST | `/api/kurse/:id/codes` | Spielleitung (Teilnehmer-Code), Admin (beide) |
| POST | `/api/kurse/:id/mitglieder/:uid/passwort` | Spielleitung (Teilnehmende), Admin (auch Spielleitung) |
| POST | `/api/auth/passwort` | angemeldet (eigenes Passwort) |
| GET | `/api/kurse/:id`, `/api/kurse/:id/spiel`, `/api/kurse/:id/ergebnisse` | Mitglieder |
| PUT | `/api/kurse/:id/runden/:nr/abgabe` | Teilnehmende |
| POST | `/api/kurse/:id/runden/:nr/status`, `…/wuerfeln` | Spielleitung |
| PUT | `/api/kurse/:id/runden/:nr/bewertungen/:gruppe` | Spielleitung |
| POST/DELETE/PATCH | `/api/kurse/:id/gruppen`, `/api/kurse/:id/mitglieder/:uid` | Spielleitung |

## Ein weiteres Planspiel hinzufügen

Die Plattform kennt kein konkretes Spiel. Jedes Planspiel ist ein Paket (JSON), das eine Fabrik ausführt (abstrakte Fabrik).

1. **Gleiche Spiellogik, neuer Inhalt** (z. B. ein anderes Unternehmen oder Thema mit Kennzahlen, Runden und Optionen):
   neues Paket unter `games/<name>/` nach dem Muster von `games/nordbyte`, mit `"fabrik": "personal-standard"`.
   In `apps/api/src/db/seed.ts` in `PAKETE` eintragen. Beim nächsten Start erscheint es in der Auswahl „Kurs anlegen“,
   gruppiert nach `thema`.
2. **Neue Spiellogik** (andere Regeln oder Berechnung): zusätzlich eine Fabrik in `packages/engine` bauen,
   die `PlanspielFabrik` umsetzt, und in `standardRegistry()` registrieren. Pakete ohne passende Fabrik
   erscheinen in der Auswahl als „nicht startbar“.

Ein Kurs bleibt auf der Paketversion, mit der er angelegt wurde. Neue Versionen ändern laufende Kurse nicht.

## Bewusst noch offen

- Echtzeit: Das Frontend fragt alle 5 Sekunden nach (kein WebSocket).
- Paket-Editor und Upload neuer Pakete über die Oberfläche
- E-Mail-Versand (Passwort selbst zurücksetzen, E-Mail-Bestätigung)
