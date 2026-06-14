# Context Engineering Framework

> **US-1** — Context Tier System for Positron Agents
> **Stand:** 2026-06-14

## Übersicht

Das Context Engineering Framework definiert ein **Cold/Warm/Hot-Modell** für
das Laden von Dateien durch Positron-Agenten. Es beantwortet die Frage:

> Welche Dateien muss ein Agent beim Start laden, welche nur bei Bedarf,
> und welche gar nicht?

Die Antwort steuert Ladeverhalten, Cache-Lebensdauer und Speicherbudget pro
Datei — und verhindert, dass Agenten an unnötigem Kontext ersticken.

## Die drei Tiers

### 🔥 Hot — Immer geladen

Dateien, die für **jeden Run** essenziell sind. Sie werden vor dem ersten
Agenten-Befehl in den Kontext geladen und bleiben bis Run-Ende erhalten.

| Kriterium | Wert |
|-----------|------|
| `preload` | `true` |
| `ttl`     | — (unbegrenzt) |
| `maxSize` | 100.000 Bytes |

**Beispiele aus dem Positron-Codebase:**

| Datei | Zweck |
|-------|-------|
| `AGENTS.md` | Agenten-Regeln, Module, Tests |
| `.specify/memory/constitution.md` | Nicht verhandelbare Projektgrundlage |
| `SECURITY.md` | Sicherheitsrichtlinien |
| `.opencode/policies/*.json` | Evidence-Gates, Trust-Tiers, Data-Retention |
| `package.json` | Paket-Metadaten |
| `tsconfig.json` | TypeScript-Konfiguration |

### 🟡 Warm — Bedingt geladen (kurzzeitiger Cache)

Dateien, die **oft, aber nicht immer** benötigt werden. Sie werden nur bei
Bedarf geladen und für 5 Minuten gecached.

| Kriterium | Wert |
|-----------|------|
| `preload` | `false` |
| `ttl`     | 300.000 ms (5 Minuten) |
| `maxSize` | 50.000 Bytes |

**Beispiele aus dem Positron-Codebase:**

| Datei | Zweck |
|-------|-------|
| `packages/shared/src/*.ts` | Zentrale Typen, Utilities |
| `packages/*/src/**/*.ts` | Source-Code aller Packages |
| `apps/*/src/**/*.ts` | Frontend/Backend-Source |
| `docs/architecture/*.md` | Architektur-Dokumentation |

### ❄️ Cold — Lazy-Loaded

Dateien, die **nur bei explizitem Bedarf** geladen werden. Sie belegen keinen
Cache und werden nach der Nutzung sofort freigegeben.

| Kriterium | Wert |
|-----------|------|
| `preload` | `false` |
| `ttl`     | — (kein Cache) |
| `maxSize` | — (kein Budget) |

**Beispiele aus dem Positron-Codebase:**

| Datei | Zweck |
|-------|-------|
| `docs/reference/*.md` | Detaillierte Referenz-Dokumentation |
| `docs/changelog/*.md` | Versions-Changelogs |
| `docs/runbooks/*.md` | Betriebsrunbooks |
| `*.test.ts` | Testdateien (nur bei Test-Phase) |
| `node_modules/**` | Drittanbieter-Code |

## Pfad-basierte Klassifizierung

Die Funktion `classifyContextTier(filePath, role?)` im Modul
`packages/shared/src/context-tier.ts` bestimmt den Tier anhand
einer Liste von Regex-Patterns:

- **Hot-Patterns (Rang 1):** AGENTS.md, SECURITY.md, constitution.md, policies/*.json, package.json, tsconfig.json
- **Rollenbasierte Hot-Patterns (Rang 2):** security-agent, compliance-agent, documentation-agent, issue-orchestrator, review-agent, research-agent
- **Warm-Patterns (Rang 3):** packages/*/src/*.ts, apps/*/src/*.ts, docs/architecture/*.md, docs/workflows/*.md
- **Cold (Rang 4 — Fallback):** Alles andere

Windows-Pfade mit Backslashes (`\`) werden vor dem Pattern-Matching auf
Posix (`/`) normalisiert.

## Ladestrategie pro Tier

| Tier   | `preload` | `ttl`      | `maxSize`  | Verhalten |
|--------|-----------|------------|------------|-----------|
| `hot`  | `true`    | —          | 100.000    | Immer im Kontext, keine Verfallszeit |
| `warm` | `false`   | 300.000 ms | 50.000     | Bei Bedarf laden, 5 Min. cachen |
| `cold` | `false`   | —          | —          | Nur bei explizitem Request laden |

## Referenzen

- [AGENTS.md](../../AGENTS.md) — Agenten-Regeln, Isolation, Trust-Tier-System
- [Constitution](../../.specify/memory/constitution.md) — Nicht verhandelbare Grundlage
- [Architektur](../architecture.md) — Gesamtsystem-Architektur
- `packages/shared/src/context-tier.ts` — Implementierung
