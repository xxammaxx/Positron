# Evidence: Managed Target Project Registry — PR-Readiness Report

**Dokument-ID:** `POSITRON-EVIDENCE-308-002`
**Status:** `GREEN_SAFE_PR_READY`
**Datum:** 2026-07-04
**Autor:** Positron Issue Orchestrator
**Branch:** `chore/managed-target-project-registry-decoupling`
**Commit:** `b07d526` (rebased onto `origin/main` at `66ce42c`)

---

## 1. Ausgangslage

Positron hatte keine generische Registry fuer externe Zielprojekte. `origin/main` enthielt
`voicewiki-seed.ts` — eine produkt-spezifische Seed-Datei mit VoiceWiki-Businesslogik in
Positron. Der Branch ersetzt diese durch eine generische `managed-target-projects.ts`-Registry.

---

## 2. Branch-Info

| Feld | Wert |
|------|------|
| Branch | `chore/managed-target-project-registry-decoupling` |
| HEAD Commit | `b07d526` |
| Basis | `origin/main` (`66ce42c`) |
| Rebase | Ja — auf `origin/main` rebased |
| Alter Branch | `docs/issue-308-phase-d-readiness-after-322` |
| Push | NEIN |

---

## 3. voicewiki-seed.ts Behandlung

| Frage | Antwort |
|-------|---------|
| Existiert auf `origin/main`? | Ja |
| Existiert auf Branch-HEAD? | Nein (geloescht via `git rm`) |
| PR-Auswirkung | `voicewiki-seed.ts` wird geloescht (`D`) |
| Ersatz | `managed-target-projects.ts` (generische Registry) |
| Route-Konflikt | Gelöst: `/api/projects` verwendet `managed-target-projects.ts` |

Keine doppelte Runtime-Datenquelle. VoiceWiki ist als `proof_project`-Eintrag in
der generischen Registry erhalten — ohne VoiceWiki-spezifische Typen oder Logik.

---

## 4. KleinPilot / Produktnamen-Bereinigung

| Suche | Treffer in Source-Code (ausserhalb docs/) |
|-------|-------------------------------------------|
| `git grep -i "KleinPilot" -- ':!docs/'` | 0 |
| `git grep -i "Kleinanzeigen" -- ':!docs/'` | 0 |
| `git grep -i "Inserat" -- ':!docs/'` | 0 |

Alle Produktnamen wurden aus dem Source-Code entfernt. Die Registry ist generisch erweiterbar.

---

## 5. Gate-Ergebnisse

| Gate | Ergebnis |
|------|----------|
| `git diff --check` | ✅ Clean |
| `npm run build` | ✅ Erfolgreich (keine Fehler) |
| `npm run typecheck` | ✅ Alle Projekte up-to-date |
| `npm test` | ✅ 1888 Tests passed (1692 server + 196 web) |

---

## 6. Datei-Änderungen (vs `origin/main`)

```
A  apps/server/src/data/managed-target-projects.ts    (+151 Zeilen)
D  apps/server/src/data/voicewiki-seed.ts             (-121 Zeilen)
M  apps/server/src/index.ts                           (Route-Ersatz)
M  apps/web/src/App.tsx                               (Projects-Route)
M  apps/web/src/api.ts                                (getManagedTargetProjects)
M  apps/web/src/components/projects/ProjectsPage.tsx  (generische UI)
M  apps/web/src/types.ts                              (ManagedTargetProject-Typen)
M  apps/web/src/components/layout/Sidebar.tsx         (Projects-Nav)
A  docs/evidence/...                                  (dieser Report)
```

8 Dateien, +751/-414 Zeilen.

---

## 7. ManagedTargetProject Typ (generisch)

```typescript
interface ManagedTargetProject {
  id: string;
  name: string;
  role: 'external_target_project' | 'proof_project' | 'candidate_project';
  repoUrl: string;
  defaultBranch: string;
  status: 'LOCAL_GATES_REPRODUCIBLE' | 'LOCAL_GATES_BLOCKED' | 'NOT_YET_EVALUATED' | 'DEPLOYED' | 'ARCHIVED';
  description: string;
  techStack: string[];
  safetyChecks: SafetyCheck[];
  // ... weitere generische Felder
}
```

VoiceWiki ist als `proof_project` mit Rolle `proof_project` registriert. Keine
VoiceWiki-spezifischen Typen (kein `ManagedProject`, kein `safetyStatus` mit
STT-Feldern).

---

## 8. Entscheidung

**STATUS: `GREEN_SAFE_PR_READY`**

| Kriterium | Status |
|-----------|--------|
| Branch korrekt (`chore/...`) | ✅ |
| Rebased auf `origin/main` | ✅ |
| `voicewiki-seed.ts` geloescht | ✅ |
| Keine Produktnamen in Source-Code | ✅ |
| Build gruen | ✅ |
| Typecheck gruen | ✅ |
| Tests gruen (1888) | ✅ |
| `git diff --check` clean | ✅ |
| Keine App-spezifische Logik in Positron | ✅ |
| Registry generisch erweiterbar | ✅ |

---

## 9. Risiken

- **Keine.** Der PR ist ein reiner Refactor: generische Registry ersetzt produkt-spezifischen Seed.
  Keine neue Produktlogik. Keine Build-Änderungen. Keine Dependency-Änderungen.

---

## 10. Empfehlung

**Push/PR erlauben: JA**

Der Branch ist PR-ready. Empfohlener PR-Titel:
```
chore: replace voicewiki-seed with generic managed target project registry
```
