# Track D2a — `noSvgWithoutTitle` Evidence Report

## 1. Reality Refresh

| Check | Wert | Status |
|-------|------|--------|
| Repository | `xxammaxx/Positron` | ✅ |
| origin/main SHA | `ea8aa7f942ba555318e1fc8f7022ccd6f661d6eb` | ✅ |
| PR #376 | MERGED (Merge-Commit `ea8aa7f94`) | ✅ |
| Issue #340 | OPEN | ✅ |
| Workspace | `/media/xxammaxx/projekte/Positron-worktrees/issue-340-d2a-svg-accessibility` | isoliert ✅ |

## 2. Track D1 Post-Merge Clarification

- PR #376 wurde mit Merge-Commit `ea8aa7f942ba555318e1fc8f7022ccd6f661d6eb` gemergt.
- Track D1 behob 51 `useButtonType`-Fälle außerhalb von ArtifactPanel.tsx.
- Die Messung `useButtonType_TOTAL: 0` entstand, weil die Nursery-Regel in der aktuellen Biome-Konfiguration nicht aktiviert ist.
- Zwei manuell bekannte Buttons ohne `type` verbleiben in `ArtifactPanel.tsx`.
- Diese zwei Fälle gehören nicht zu Track D2a oder Track D2b.
- Track D2a bearbeitet ausschließlich `noSvgWithoutTitle`.
- Das Track-D1-Evidence-Dokument wurde nicht geändert.

## 3. Isolierter Worktree

```text
Branch: positron/issue-340-track-d2a-svg-accessibility
Worktree: /media/xxammaxx/projekte/Positron-worktrees/issue-340-d2a-svg-accessibility
Basis: origin/main @ ea8aa7f94
```

## 4. Expliziter Regelaufruf

```bash
npx biome lint . --only=lint/a11y/noSvgWithoutTitle
```

Biome Version: 1.9.4 (`--only` wird unterstützt)

## 5. Baseline

**Vorher: 14 `noSvgWithoutTitle`-Diagnosen**

| # | Datei | Zeile | SVG-Typ | Elternelement | Sichtbarer Text |
|---|-------|-------|---------|---------------|-----------------|
| 1 | ThemeToggle.tsx | 20 | Sonne | `button[aria-label][title]` | — |
| 2 | ThemeToggle.tsx | 42 | Mond | `button[aria-label][title]` | — |
| 3 | VoiceStatusIndicator.tsx | 40 | Lautsprecher+X | `span[aria-label]` + "No Voice" | "No Voice" |
| 4 | VoiceStatusIndicator.tsx | 74 | Lautsprecher+Wellen | `button[aria-label][title]` + "Voice ON/OFF" | "Voice ON/OFF" |
| 5 | DashboardPage.tsx | 90 | Monitor | `h3` "Managed External Projects" | ✅ |
| 6 | VoiceControls.tsx | 157 | Lautsprecher | `h3` "Voice Output" | ✅ |
| 7 | SystemHealth.tsx | 56 | Aktivität | `h3` "System Health" | ✅ |
| 8 | SettingsPage.tsx | 168 | Schild | `h3` "Safety Gates" | ✅ |
| 9 | SettingsPage.tsx | 232 | Server-Rack | `h3` "MCP Servers" | ✅ |
| 10 | SettingsPage.tsx | 350 | Checkmark | `h3` "Test Modes" | ✅ |
| 11 | RunDetail.tsx | 268 | Copy | `button[title="Copy Run ID"]` | — |
| 12 | RunDetail.tsx | 338 | Dokument | `h3` "Live Evidence" | ✅ |
| 13 | RunDetail.tsx | 381 | Dokument | `Link` "Open Evidence" | ✅ |
| 14 | RunDetail.tsx | 400 | Externer Link | `a` "Open Issue #N" | ✅ |

## 6. Semantische Klassifikation

**Alle 14 SVGs sind rein dekorativ.** Die Information wird bereits durch das Elternelement oder sichtbaren Text vermittelt.

- **Klasse A (dekorativ, Text sichtbar):** 8 SVGs (#3, #5, #6, #7, #8, #9, #10, #12)
- **Klasse D (Elternelement benannt):** 6 SVGs (#1, #2, #4, #11, #13, #14)
- **Klasse B (informativ):** 0 SVGs
- **Klasse C (icon-only control):** 0 SVGs
- **Klasse E (unklar):** 0 SVGs

## 7. Implementierung

Einheitliche Lösung für alle 14 SVGs:

```tsx
<svg aria-hidden="true" focusable="false" ...>
```

Keine `<title>`-Elemente hinzugefügt. Keine `role="img"`. Keine `aria-labelledby`. Keine neuen IDs.

### Geänderte Dateien

| Datei | SVGs | Änderung |
|-------|------|----------|
| `apps/web/src/components/ThemeToggle.tsx` | 2 | `aria-hidden="true" focusable="false"` |
| `apps/web/src/components/VoiceStatusIndicator.tsx` | 2 | `aria-hidden="true" focusable="false"` |
| `apps/web/src/components/dashboard/DashboardPage.tsx` | 1 | `aria-hidden="true" focusable="false"` |
| `apps/web/src/components/VoiceControls.tsx` | 1 | `aria-hidden="true" focusable="false"` |
| `apps/web/src/components/dashboard/SystemHealth.tsx` | 1 | `aria-hidden="true" focusable="false"` |
| `apps/web/src/components/settings/SettingsPage.tsx` | 3 | `aria-hidden="true" focusable="false"` |
| `apps/web/src/components/RunDetail.tsx` | 4 | `aria-hidden="true" focusable="false"` |

**7 Dateien, 14 SVGs, 28 neue Attribute (`aria-hidden` + `focusable`), 0 neue `<title>`-Elemente.**

## 8. Regel-Delta

| Metrik | Vorher | Nachher | Delta |
|--------|-------:|--------:|------:|
| `noSvgWithoutTitle` gesamt | 14 | **0** | −14 |
| davon ArtifactPanel | 0 | 0 | 0 |
| in Scope | 14 | **0** | −14 |
| neue Diagnosen | — | **0** | 0 |

```text
noSvgWithoutTitle_IN_SCOPE: 0 ✅
NEW_DIAGNOSTICS: 0 ✅
```

## 9. Tests

| Test-Suite | Ergebnis |
|------------|----------|
| Vitest (root) | 82 Files, 2121 Tests | ✅ |
| Vitest (web) | 11 Files, 272 Tests | ✅ |
| E2E (Playwright) | 26/26 passed | ✅ |
| Mutation (fast) | 83.06% (>60% threshold) | ✅ |
| Mutation (safety) | 84.33% (>0% threshold) | ✅ |
| Observability | Configs valid | ✅ |

### Akzeptanz

```text
PLAYWRIGHT: 26/26 ✅
SKIPS: 0 ✅
UNEXPLAINED_CONSOLE_ERRORS: 0 ✅
PAGE_ERRORS: 0 ✅
EXTERNAL_MUTATIONS: 0 ✅
```

## 10. ArtifactPanel Hard-Stop

```text
ARTIFACT_PANEL_CHANGED: NO ✅
DANGEROUSLY_SET_INNER_HTML_CHANGED: NO ✅
ARTIFACT_PANEL_USE_BUTTON_TYPE_REMAINDER: 2 ✅
```

## 11. Scope

```text
CHANGED_RULES: noSvgWithoutTitle only ✅
NO_LABEL_WITHOUT_CONTROL_CHANGED: NO ✅
USE_BUTTON_TYPE_CHANGED: NO ✅
ARTIFACT_PANEL_CHANGED: NO ✅
WORKFLOW_FILES_CHANGED: NO ✅
DEPENDENCY_FILES_CHANGED: NO ✅
BIOME_CONFIG_CHANGED: NO ✅
```

## 12. Security

- Keine Änderung an `dangerouslySetInnerHTML`
- Keine Änderung an `ArtifactPanel.tsx`
- Keine Auth- oder Admin-Logikänderung
- Keine Real-Mode- oder Stage-3-Ausführung
- Keine Secrets offengelegt

## 13. Verbleibende Issue-#340-Regeln

- `noLabelWithoutControl` — nicht in diesem Lauf
- `useButtonType` in `ArtifactPanel.tsx` (2 Fälle) — nicht in diesem Lauf

## 14. Klassifikation

```text
GREEN_SAFE_TRACK_D2A_READY
```
