# Repository Risk Classification

> Stand: 2026-05-24 · Positron v0.1.0-rc.1
> Gilt für alle Positron-Repos

## 4 Risikoklassen

### 🟢 Level 1 — Test Repository (no risk)

**Merkmale:** Dediziertes Testrepo, kein Produktivcode, keine echten Daten.

| Kriterium | Anforderung |
|-----------|------------|
| Inhalt | Nur Test-Fixtures, Markdown, Dummy-Code |
| Nutzer | Nur Positron-Operator |
| Daten | Keine echten Daten |
| Abhängigkeiten | Keine externen Abhängigkeiten |
| Ausfallrisiko | Keins — Repo ist entbehrlich |

**Erlaubte Positron-Features:**
- ✅ Push
- ✅ Merge (mit Dry-Run zuerst)
- ✅ Fix-Loop
- ✅ Fixture-Change-Provider

**Beispiel:** `xxammaxx/positron-external-test`

---

### 🟡 Level 2 — Low-Risk Personal Repository

**Merkmale:** Persönliches Projekt, geringe Auswirkungen bei Fehlern.

| Kriterium | Anforderung |
|-----------|------------|
| Inhalt | Persönlicher Code, kein Kunden-Code |
| Nutzer | Nur Besitzer + Positron-Operator |
| Daten | Keine PII, keine Secrets |
| CI/CD | Optional — minimales CI |
| Ausfallrisiko | Gering — manuell behebbar |

**Erlaubte Positron-Features:**
- ✅ Push (kontrolliert)
- ⚠️ Merge (nur mit Operator-Überwachung)
- ❌ Fix-Loop (erst nach Validierung)
- ✅ Fixture-Change-Provider

**Beispiel:** `xxammaxx/mein-blog`, `xxammaxx/dotfiles`

---

### 🟠 Level 3 — Production Repository

**Merkmale:** Echter Produktivcode, mehrere Contributors, CI/CD-Pipeline.

| Kriterium | Anforderung |
|-----------|------------|
| Inhalt | Produktivcode |
| Nutzer | Team + Positron |
| Branch Protection | ✅ Erforderlich |
| Required Status Checks | ✅ Erforderlich |
| CODEOWNERS | ✅ Erforderlich |
| CI/CD | ✅ Muss grün sein vor Merge |
| Reviewer | ✅ Mindestens 1 Approval |
| Ausfallrisiko | Mittel — braucht Rollback-Prozess |

**Erlaubte Positron-Features:**
- ✅ Push (nur `positron/issue-*`)
- ⚠️ Merge (nur nach WOULD_MERGE + Operator-Freigabe)
- ❌ Fix-Loop (deaktiviert)
- ❌ Fixture-Change-Provider

**Beispiel:** `xxammaxx/Positron` (das Projekt selbst)

---

### 🔴 Level 4 — Critical Production Repository

**Merkmale:** Business-kritisch, viele Nutzer, hohe Ausfallkosten.

| Kriterium | Anforderung |
|-----------|------------|
| Inhalt | Business-kritischer Code |
| Nutzer | Team + Kunden |
| Branch Protection | ✅ Strict |
| Required Status Checks | ✅ Alle checks |
| CODEOWNERS | ✅ Multi-Level |
| CI/CD | ✅ Full pipeline |
| Reviewer | ✅ ≥2 Approvals |
| Ausfallrisiko | Hoch — sofortiger Rollback nötig |

**Erlaubte Positron-Features:**
- ❌ Push (nur manuell)
- ❌ Merge (nur manuell)
- ❌ Fix-Loop
- ❌ Fixture-Change-Provider

**Positron-Modus:** Nur Observe (Level 0). Positron kann Issues analysieren und kommentieren, aber niemals Code pushen oder mergen.

---

## Entscheidungsmatrix

| Frage | Level 1 | Level 2 | Level 3 | Level 4 |
|-------|---------|---------|---------|---------|
| Push erlaubt? | ✅ | ✅ | ✅ | ❌ |
| Merge erlaubt? | ✅ | ⚠️ | ⚠️ | ❌ |
| Auto-Merge? | ✅ | ⚠️ | ❌ | ❌ |
| Fix-Loop? | ✅ | ❌ | ❌ | ❌ |
| Dry-Run vor Merge? | Optional | ✅ Pflicht | ✅ Pflicht | N/A |
| Operator-Review? | Optional | ✅ Pflicht | ✅ Pflicht | ✅ Pflicht |
| Kill-Switch? | Optional | ✅ Aktiv | ✅ Aktiv | ✅ Aktiv |
| Branch Protection? | Optional | Empfohlen | ✅ Pflicht | ✅ Strict |
| Required Checks? | Optional | Empfohlen | ✅ Pflicht | ✅ Alle |
