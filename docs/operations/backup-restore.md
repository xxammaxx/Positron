# Backup and Restore Strategy

> Stand: 2026-05-24
> Version: v0.1.0-rc.1

## Datenbestand

Positron speichert Daten an folgenden Orten:

| Daten | Ort | Typ | Größe (geschätzt) |
|-------|-----|-----|-------------------|
| SQLite Datenbank | `./data/positron.db` (MVP) | Strukturiert | < 100 MB |
| Run-Artefakte | `./positron/runs/` | Dateien | < 1 GB |
| Logs | `./opencode/logs/` | JSONL | < 100 MB |
| Evidence Cache | `./opencode/memory/evidence-cache.json` | JSON | < 1 MB |
| Workspace | `/tmp/positron-*` | Temporär | < 500 MB |

**Wichtig:** Aktuell (MVP) läuft Positron mit **In-Memory-Runs**. Die SQLite-Datenbank ist für Repository-Konfiguration und persistente Artefakte vorgesehen, wird aber von der aktuellen Run-Logik noch nicht vollständig genutzt. Ein Server-Neustart führt zum Verlust aller laufenden Runs.

## Backup-Strategie

### Für täglichen Betrieb (CRON-empfohlen)

```bash
#!/bin/bash
# /etc/cron.daily/positron-backup

BACKUP_DIR="/var/backups/positron"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
POSITRON_DIR="/opt/positron"

mkdir -p "$BACKUP_DIR"

# 1. SQLite-Datenbank
if [ -f "$POSITRON_DIR/data/positron.db" ]; then
  sqlite3 "$POSITRON_DIR/data/positron.db" ".backup '$BACKUP_DIR/positron-$TIMESTAMP.db'"
  gzip "$BACKUP_DIR/positron-$TIMESTAMP.db"
fi

# 2. Run-Artefakte
if [ -d "$POSITRON_DIR/.positron/runs" ]; then
  tar czf "$BACKUP_DIR/runs-$TIMESTAMP.tar.gz" -C "$POSITRON_DIR" .positron/runs
fi

# 3. Logs
if [ -d "$POSITRON_DIR/.opencode/logs" ]; then
  tar czf "$BACKUP_DIR/logs-$TIMESTAMP.tar.gz" -C "$POSITRON_DIR" .opencode/logs
fi

# 4. Konfiguration
cp "$POSITRON_DIR/.env" "$BACKUP_DIR/env-$TIMESTAMP.txt"

# 5. Alte Backups bereinigen (> 30 Tage)
find "$BACKUP_DIR" -name "positron-*" -mtime +30 -delete
find "$BACKUP_DIR" -name "runs-*" -mtime +30 -delete
find "$BACKUP_DIR" -name "logs-*" -mtime +30 -delete
find "$BACKUP_DIR" -name "env-*" -mtime +30 -delete

echo "Backup completed: $TIMESTAMP"
```

### Retention Policy
| Datentyp | Aufbewahrung | Begründung |
|----------|--------------|-----------|
| SQLite DB | 30 Tage | Projektkonfiguration + Metadaten |
| Run-Artefakte | 30 Tage | Nachvollziehbarkeit abgeschlossener Runs |
| Logs | 30 Tage | Debugging, Audit |
| Audit-Logs | 10 Jahre (DSGVO) | Compliance (separate Retention) |
| Evidence Cache | 7 Tage | Temporärer Cache |

## Restore-Strategie

### Vollständige Wiederherstellung

```bash
# 1. Backup identifizieren
ls -la /var/backups/positron/

# 2. Positron stoppen
# → Server beenden (Ctrl+C)

# 3. SQLite-Datenbank wiederherstellen
gunzip -c /var/backups/positron/positron-20260524-120000.db.gz > data/positron.db

# 4. Run-Artefakte wiederherstellen
tar xzf /var/backups/positron/runs-20260524-120000.tar.gz -C .

# 5. Logs wiederherstellen
tar xzf /var/backups/positron/logs-20260524-120000.tar.gz -C .

# 6. Konfiguration prüfen
diff .env /var/backups/positron/env-20260524-120000.txt

# 7. Positron starten
cd apps/server && npx tsx src/index.ts
```

### Teilweise Wiederherstellung (nur DB)
```bash
sqlite3 data/positron.db ".restore '/var/backups/positron/positron-20260524-120000.db'"
```

## Disaster Recovery

### Szenario: Server-Neustart (alle Runs verloren)
1. Dashboard zeigt leere Run-Liste
2. Prüfe ob SQLite-DB vorhanden und aktuell
3. Starte neuen Run über Issue Queue
4. Alte Runs sind nicht wiederherstellbar (In-Memory-Limit)

### Szenario: Korrupte SQLite-Datenbank
```bash
# Integritätsprüfung
sqlite3 data/positron.db "PRAGMA integrity_check;"

# Reparatur-Versuch
sqlite3 data/positron.db ".clone data/positron-repaired.db"
sqlite3 data/positron-repaired.db "PRAGMA integrity_check;"

# Falls fehlgeschlagen: Restore aus Backup
```

### Szenario: Git-Workspace beschädigt
```bash
# Temporäre Workspaces liegen in /tmp/positron-*
# Einfach löschen — Positron klont beim nächsten Run neu
rm -rf /tmp/positron-*
```

## Empfehlungen

1. **Vor erstem Dogfood-Run:** Backup-Verzeichnis anlegen und ersten Backup-Test durchführen
2. **Regelmäßig:** Automatisiertes Backup via CRON einrichten
3. **Nach jedem erfolgreichen Run:** .positron/runs/ Inhalt prüfen (sollte Artefakte enthalten)
4. **Vor Server-Updates:** Immer Backup von DB und Konfiguration
5. **Für Production:** SQLite → PostgreSQL Migration planen (späteres Issue)
