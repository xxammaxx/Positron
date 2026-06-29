# Issue #325 Dist Artifact Hygiene Report

## 1. Kurzfazit
- **Status**: GREEN
- **Confidence**: HIGH

## 2. Reality Refresh

| Feld | Erwartet | Aktuell | Status |
|---|---|---|---|
| main HEAD | 0dce278 or later | 0dce278 | ✅ |
| Issue #325 | open | OPEN | ✅ |
| Working tree | 10 dist artifacts or clean | 10 dist artifacts (pre-fix) | ✅ |
| Build host | Linux Mint | Linux Mint 22.1 (xia) | ✅ |
| Node/npm | v22.22.0 / 10.9.4 | v22.22.0 / 10.9.4 | ✅ |
| PR #329 merged | yes | 0dce278 = merge commit | ✅ |
| Issue #322 | closed | closed | ✅ |
| PR #313 | closed | closed (obsolete) | ✅ |
| Open PRs | none | [] | ✅ |
| Only shared/dist dirty | yes | 10 files in shared, others clean | ✅ |

## 3. Root Cause

**Betroffene Dateien** (10 files in `packages/shared/dist/`):

| Datei | Änderungstyp | Ursache | Risiko |
|---|---|---|---|
| `types.d.ts` | Semantisch/additiv | Committed source #246 GateType | None |
| `types.d.ts.map` | Sourcemap | Mirror von types.d.ts | None |
| `types.js` | Semantisch/additiv | Committed source #246 GateType | None |
| `types.js.map` | Sourcemap | Mirror von types.js | None |
| `interfaces.d.ts` | Semantisch/additiv | Committed source #244 workspace cleanup | None |
| `interfaces.d.ts.map` | Sourcemap | Mirror von interfaces.d.ts | None |
| `__tests__/smoke.test.js` | Import-Reihenfolge | Import aus types.ts hat sich geändert | None |
| `__tests__/smoke.test.js.map` | Sourcemap | Mirror von smoke.test.js | None |
| `__tests__/secret-manager.test.js` | String-Literal | Minimale Änderung | None |
| `__tests__/secret-manager.test.js.map` | Sourcemap | Mirror von secret-manager.test.js | None |

**Ursachenkette**:
1. Commits `8daf695` (Issue #246 — GateType enforcement) und `5cc1dda` (Issue #244 — workspace cleanup) modifizierten `packages/shared/src/types.ts` und `packages/shared/src/interfaces.ts`
2. Diese Commits fügten neue Typen, Interfaces und Konstanten hinzu
3. Der letzte dist-Commit (`2f200bc`) war ANCESTOR dieser Commits — dist wurde danach nie neu gebaut und committed
4. TypeScript-Build regeneriert dist deterministisch aus aktuellem Source → 10 dirty files

**Kein Plattform-Drift**: Alle Änderungen sind semantisch/additiv. Keine CRLF/LF-Probleme, keine Timestamp-Diffs, keine Node-Version-Effekte. Build-Ausgabe ist deterministisch auf Linux Mint (wie bestätigt durch zweimaliges `npm run build` mit identischem Output).

## 4. Decision Manifest

**GREEN_SAFE**:
- Option A: Dist aus committed Source neu bauen und committen (gewählt)
- Build ist deterministisch
- Nur additive Änderungen
- Keine Source-Änderungen nötig

**YELLOW_VALIDATE**:
- `.gitignore` enthält `dist/` — Policy-Tension zwischen Versionierung und Gitignore
- Keine Änderung nötig (tracked files bleiben tracked)

**RED_BLOCK**:
- Option B (Dist unversionieren): würde Workspace-Resolution für 6 Consumer-Packages brechen (`@positron/shared` → `main: ./dist/index.js`)
- Option C (Build darf dist nicht verändern): nicht anwendbar — Änderungen sind korrekt

**OWNER_ACTION_REQUIRED**:
- Keine. Option A ist eindeutig GREEN_SAFE und selbsttragend.

**Recommended Fix**: Option A — deterministic rebuild + commit.

**Not in Scope**:
- Real Mode
- Phase D
- Issue #308
- Issue #215 / PR #218
- Unrelated docs
- `.gitignore` Policy-Änderung (kann separat in eigenem Issue adressiert werden)

## 5. Implementierung

- **Mutation executed**: YES
- **Branch**: `chore/issue-325-dist-artifact-hygiene`
- **Commit**: `6190304`
- **PR**: (to be created)
- **Files changed**: 10 files in `packages/shared/dist/`
- **Changes**: 80 insertions, 10 deletions (purely additive)

## 6. Local Gates

| Gate | Command | Exit | Result |
|---|---|---|---|
| Whitespace | `git diff --check` | 0 | ✅ PASS |
| Working tree | `git status --short` | clean | ✅ PASS |
| Build | `npm run build` | 0 | ✅ PASS |
| Typecheck | `npm run typecheck` | 0 | ✅ PASS |
| Tests (root) | `npm test` (vitest) | 0 | ✅ 72 files, 1662 tests |
| Tests (web) | `npm test --workspace apps/web` | 0 | ✅ 8 files, 196 tests |
| **Total tests** | | | ✅ **1858/1858** |

## 7. Issue #325 Closure Readiness

**ISSUE_325_CLOSE_READY**: OWNER_APPROVAL_REQUIRED

Closure-Freigabe liegt im aktuellen Lauf NICHT vor. Recommendation:
- PR reviewen und mergen
- Danach als completed schließen

## 8. Nicht angefasst
- Real Mode
- Phase-D-Probe
- Issue #308
- PR #218 / Issue #215
- Branch deletion
- Auto/Squash/Rebase/Admin merge
- Secrets
- Remote CI
- `.gitignore` Policy
- `.env`-Dateien

## 9. Risiken

| Risiko | Status | Empfehlung |
|---|---|---|
| `.gitignore` `dist/` vs versionierte dist-Dateien | Policy-Tension | Separates Issue für Policy-Klärung |
| Dist-Drift bei zukünftigen Source-Änderungen | Erwartet | Build als CI-Gate / Pre-Commit-Hook |
| Consumer-Packages brechen bei dist-Entfernung | Besteht | Dist versioniert lassen |

## 10. Was kann Positron jetzt?
- Working tree ist nach Merge dieses PRs clean
- `git status` zeigt keine pre-existing dist artifacts mehr
- Zukünftige Agent/Real-Mode/GATE_APPROVE-Runs sind besser auditierbar

## 11. Next-Step-Handoff
Empfohlener nächster Lauf:
1. Review und Merge PR `chore/issue-325-dist-artifact-hygiene`
2. Issue #325 als completed schließen (nach Owner-Freigabe)
3. Danach #218 / #215 GATE_APPROVE
4. Danach #244 Workspace Cleanup
5. Danach #246 GateType Enforcement
6. Erst danach Issue #308 Phase-D Approval Package
