# Phase 9 — GitHub Actions Billing/Quota Owner Checklist

**Generated**: 2026-06-27T06:45:00Z  
**Session**: Phase 9 — Infrastructure Tracker Finalization  

---

## 1. Warum CI weiterhin advisory-only ist

GitHub Actions CI ist NICHT als zwingender Gate in diesem Projekt konfiguriert. Lokale Gates sind Source of Truth. Der Remote-CI-Status aus Phase 8 zeigt:

| Workflow | Status | Ursache |
|----------|--------|---------|
| `mutation-fast` | ✅ PASS | Fix D (Build vor Stryker) wirkt |
| `mutation-safety` | ✅ PASS | Fix D wirkt |
| `observability-config-check` | ✅ PASS | Unabhängig von Workflow-Fixes |
| `build-and-test` | ❌ FAIL | Zero-Step-/Runner-/Quota-/Billing-Problem |
| `e2e-playwright` | ❌ FAIL | Zero-Step-/Runner-/Quota-/Billing-Problem |
| `tool-gateway-windows` | ❌ FAIL | Windows Runner nicht verfügbar |

## 2. Wahrscheinliche Ursache: Plattform-/Runner-/Quota-/Billing

Die Zero-Step-Failures (Jobs starten, produzieren 0 Steps, 0 Logs) deuten stark auf ein Plattform-Problem hin, nicht auf Workflow-Fehler:

- GitHub Actions Free Tier: 2000 Minuten/Monat für private Repos (Stand 2026)
- Wenn das Kontingent erschöpft ist, werden Jobs nicht mehr ausgeführt
- Windows Runner sind auf Free Tier nicht verfügbar (nur Ubuntu)
- Organizations können Actions für Repos deaktivieren

## 3. Was der Owner im GitHub UI prüfen soll

1. **Repository öffnen**: https://github.com/xxammaxx/Positron
2. **Settings öffnen**: Tab `Settings` in der Repository-Navigation
3. **Billing / Plans / Actions usage prüfen**:
   - Links in der Navigation: `Billing & plans` (oder unter Account Settings)
   - Abschnitt `Actions` → Minutenverbrauch diesen Monat
4. **Prüfen, ob GitHub Actions Minuten/Quota erschöpft sind**:
   - Wenn `0 remaining minutes` → Quota ausgeschöpft
   - Wenn Limit fast erreicht → bald erschöpft
5. **Prüfen, ob Actions für das Repo erlaubt sind**:
   - Repository `Settings` → `Actions` → `General`
   - `Actions permissions`: Sollte auf `Allow all actions and reusable workflows` stehen
6. **Prüfen, ob Windows Runner verfügbar sind**:
   - Windows Runner sind auf dem Free Tier NICHT enthalten
   - Nur verfügbar auf GitHub Team/Enterprise oder mit GitHub-Hosted Larger Runners
   - `tool-gateway-windows` wird daher immer fehlschlagen
7. **Prüfen, ob Organization-/Account-Limits greifen**:
   - Unter Account `Settings` → `Billing & plans` → `Actions`
   - Gibt es ein Spending Limit / Hard Limit?

## 4. Nach erfolgreicher Prüfung

Wenn Billing/Quota/Runner im GitHub UI geprüft wurden und OK sind, kann der Owner folgende Freigabe geben:

```text
APPROVE USE GITHUB CI FOR THIS RUN
```

Erst dann darf manuelle CI ausgelöst werden (`gh workflow run`).

## 5. Wenn Quota erschöpft ist

Optionen:
- Warten bis zum Monatswechsel (Quota-Reset)
- GitHub Team Plan upgraden (kostet Geld)
- Lokale Gates als alleinigen Gate behalten (aktueller Modus)

## 6. Classification

```text
GITHUB_ACTIONS_OWNER_CHECK_STATUS: DOCUMENTED
```

Checkliste ist vollständig. Owner muss im GitHub UI prüfen. Keine automatisierte CI-Auslösung.
