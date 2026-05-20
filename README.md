# Positron

Positron ist ein lokales GitHub-Issue-Ausführungssystem für agentische Softwareentwicklung.

Es überwacht GitHub-Issues, verwandelt jedes Issue in recherchierte und spezifizierte Entwicklungsartefakte, nutzt Spec Kit für die Planung, OpenCode für die kontrollierte Implementierung, führt Tests und Review-Schleifen aus, dokumentiert jeden Schritt in GitHub und liefert Pull Requests statt unsichtbarer Agentenausgaben.

## Kernprinzipien

1. **Kein Code ohne Spec.**
2. **Kein Fortschritt ohne GitHub-Kommentare.**
3. **Kein Erfolg ohne Testbeweis.**
4. **Keine Vollautonomie außerhalb einer Sandbox.**
5. **Kein neues Issue, bevor das aktuelle abgeschlossen oder blockiert ist.**

## Architektur

```
Web UI (React/Vite/Tailwind)
      ↕ WebSocket/SSE
Positron Orchestrator (Node.js/Express/TS)
  ├── GitHub API Adapter
  ├── Spec Kit Adapter
  ├── OpenCode Adapter
  └── Sandbox (Git Worktrees)
      ↕
SQLite (Runs, Events, Artifacts, Metriken)
```

## Schnellstart

```bash
git clone https://github.com/xxammaxx/Positron.git
cd positron
npm install
npm run build
npm start
```

## Dokumentation

- [Blueprint-Analyse](docs/blueprint-analysis.md)
- [Architektur](docs/architecture.md)
- [Modul-Karte](docs/module-map.md)
- [Abhängigkeitsgraph](docs/dependency-graph.md)
- [Constitution](.specify/memory/constitution.md)

## Autonomie-Level

| Level | Name | Code | Tests | Push |
|-------|------|------|-------|------|
| 0 | Observer | ❌ | ❌ | ❌ |
| 1 | Research & Spec | ❌ | ❌ | ❌ |
| 2 | Supervised Build | ✅ (mit Gates) | ✅ | ✅ (mit Freigabe) |
| 3 | Autonomous Sandbox | ✅ | ✅ | ✅ (isoliert) |
| 4 | CI Auto-PR | ✅ | ✅ | ✅ |

## Lizenz

[MIT](LICENSE)
