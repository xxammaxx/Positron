# Positron MVP Validation

**Datum:** 2026-05-20
**Status:** Best Practices validiert, APIs bestätigt

## 1. GitHub REST API (Stand Mai 2026)

| Endpoint | Status | Quelle |
|----------|--------|--------|
| `GET /repos/{owner}/{repo}/issues` | ✅ `since`, `sort`, `labels`, `per_page` aktiv | GitHub Docs |
| `POST /repos/{owner}/{repo}/issues/{num}/comments` | ✅ `body` Pflichtfeld | GitHub Docs |
| `POST /repos/{owner}/{repo}/issues/{num}/labels` | ✅ Array `labels` | GitHub Docs |
| `POST /repos/{owner}/{repo}/pulls` | ✅ `head`, `base`, `title` | GitHub Docs |
| Rate Limits | ✅ 5.000/h PAT, 1.000/h GITHUB_TOKEN | GitHub Docs |
| API-Version | ✅ `X-GitHub-Api-Version: 2026-03-10` | GitHub Docs |

**Relevanz für Positron:**
- Issue-Polling mit `since` stabil
- PR-Erstellung benötigt Branch + Title
- API-Version explizit setzen für Stabilität

## 2. GitHub Spec Kit (v0.8.11)

| Befehl | Status | Artefakt |
|--------|--------|----------|
| `specify init --integration opencode` | ✅ | `.specify/` |
| `/speckit.constitution` | ✅ | `constitution.md` |
| `/speckit.specify` | ✅ | `spec.md` |
| `/speckit.plan` | ✅ | `plan.md` |
| `/speckit.tasks` | ✅ | `tasks.md` |
| `/speckit.implement` | ✅ | Implementierung |

**Relevanz:** Spec Kit ist Agent-basiert, nicht reine CLI. Positron sollte `/speckit.*` über den Agenten ausführen, nicht über rohe Shell-Kommandos.

## 3. OpenCode (Stand Mai 2026)

| Feature | Erkenntnis |
|---------|-----------|
| Agenten | `build` (alle Tools), `plan` (Ask für Edits/Bash), `explore` (read-only) |
| Permissions | `allow`, `ask`, `deny` pro Tool/Pattern |
| Bash-Kontrolle | Wildcard-Patterns, letzter Match gewinnt |
| Sicherheit | `--dangerously-skip-permissions` nie in Automatisierung |

**Relevanz:** Positron muss Permission-Gates für Bash, Git Push setzen. MVP-Level 2 (Supervised) nutzt `ask` für kritische Kommandos.

## 4. Agentic Software Engineering

| Quelle | Kern-Erkenntnis |
|--------|----------------|
| SWE-bench | Issues + Codebase → Patch → Evaluation (nicht Textplausibilität) |
| SWE-bench Verified | 500 human-gefilterte lösbare Instanzen |
| Evidence-Gates | Testlogs, Buildlogs, Diff-Zusammenfassung erforderlich |

**Relevanz:** Plausible Patches ohne reproduzierbaren Testlauf sind nicht ausreichend. Positron muss Evidence-Gates durchsetzen.
