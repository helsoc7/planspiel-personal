#!/bin/sh
# Sichert die Datenbank einmal pro Nacht (gegen 3 Uhr UTC, also 4 Uhr deutscher Winterzeit) nach /backups (BACKUP_DIR)
# und löscht Sicherungen, die älter als BACKUP_TAGE sind. Läuft im Dienst "backup".
set -u
TAGE="${BACKUP_TAGE:-14}"
ZIEL="${BACKUP_DIR:-/backups}"

sichern() {
  datei="$ZIEL/planspiel-$(date +%Y-%m-%d_%H%M).sql.gz"
  # Erst vollständig sichern, dann packen: so fällt ein Fehler von pg_dump auf
  if pg_dump --no-owner --clean --if-exists > "$datei.sql.tmp" && gzip -c "$datei.sql.tmp" > "$datei.tmp"; then
    rm -f "$datei.sql.tmp"
    mv "$datei.tmp" "$datei"
    echo "$(date '+%F %T') Sicherung erstellt: $(basename "$datei") ($(du -h "$datei" | cut -f1))"
  else
    rm -f "$datei.tmp" "$datei.sql.tmp"
    echo "$(date '+%F %T') FEHLER: Sicherung fehlgeschlagen" >&2
  fi
  find "$ZIEL" -name 'planspiel-*.sql.gz' -mtime +"$TAGE" -delete
}

# Direkt beim Start einmal sichern, danach jede Nacht
sichern
while true; do
  jetzt=$(date +%s)
  ziel=$(date -d "$(date +%Y-%m-%d) 03:00" +%s 2>/dev/null || echo $((jetzt + 86400)))
  [ "$ziel" -le "$jetzt" ] && ziel=$((ziel + 86400))
  sleep $((ziel - jetzt))
  sichern
done
