# ADR-0007: Docs-as-Code Platform Selection (MkDocs)

- **Date:** 2026-06-09
- **Status:** Proposed
- **Deciders:** Positron Issue Orchestrator (AI Agent)
- **Supersedes:** None

---

## Context

Positron v3.0 verfügt über eine umfangreiche, aber fragmentierte Markdown-Dokumentationsbasis (`docs/`). Es fehlen:

1. Ein zentraler Einstiegspunkt (`docs/index.md`)
2. Eine einheitliche Organisationsstruktur (Diátaxis)
3. Automatisierte Qualitätssicherung (Link-Check, Markdown-Lint, Docs-Build)
4. KI/Agent-optimierte Einstiegspunkte (`llms.txt`)
5. Ein Docs-Change-Workflow in `CONTRIBUTING.md`

Das Docs-as-Code-Audit (`docs/audits/DOCS_AS_CODE_AUDIT.md`) hat diese Defizite dokumentiert.

---

## Decision

Wir führen **MkDocs** mit dem **Material-Theme** als Dokumentationsplattform ein.

### Konfiguration

```yaml
# mkdocs.yml
site_name: Positron
theme:
  name: material
  features:
    - navigation.sections
    - navigation.indexes
    - search.suggest
    - search.highlight
plugins:
  - search
markdown_extensions:
  - admonition
  - codehilite
  - footnotes
  - toc:
      permalink: true
  - pymdownx.superfences:
      custom_fences:
        - name: mermaid
          class: mermaid
          format: !!python/name:pymdownx.superfences.fence_code_format
```

### Begründung

| Kriterium | Assessment |
|---|---|
| **Projektsprache Match** | Positron ist 100% TypeScript. MkDocs benötigt nur Python für den Build-Prozess — kein Code-Interop nötig. |
| **Dokumentationsformat** | 100% Markdown. MkDocs ist Markdown-nativ. Keine Migration nötig. |
| **Build-Komplexität** | `mkdocs build --strict` ist ein Einzeiler. Kein npm-Build-Chain-Overhead. |
| **vs. Docusaurus** | Positron hat React, aber interaktive Docs-Komponenten (MDX) sind kein Ziel. Docusaurus würde npm-Abhängigkeiten, Build-Zeit und Wartungskosten erhöhen. |
| **vs. Sphinx** | rST/MyST wäre künstlich für ein reines TypeScript-Projekt. Kein Autodoc-Nutzen. |
| **Diátaxis-Unterstützung** | Navigation + Section-Indexes bilden Diátaxis-Struktur nativ ab. |
| **Suchfunktion** | Built-in (`search` Plugin) ohne externe Dienste. |
| **CI-Integration** | Trivial in GitHub Actions: `pip install -r requirements-docs.txt && mkdocs build --strict`. |
| **Python-Verfügbarkeit** | Python 3.14 ist auf der Entwicklungsmaschine und auf `ubuntu-latest` GitHub Runner verfügbar. |

### Projekt-Abhängigkeiten

Keine Änderungen an `package.json` nötig. Neue Dateien:
- `requirements-docs.txt` (Python-Pakete)
- `mkdocs.yml` (Konfiguration)
- `.github/workflows/docs-quality.yml` (CI)

---

## Alternatives Considered

### Alternative 1: Docusaurus

**Beschreibung:** Node.js/React-basierte Docs-Plattform mit MDX-Unterstützung.

**Evaluation:**
- **Pros:** Integriert mit dem React-Stack, MDX für interaktive Komponenten, Versionierung built-in.
- **Cons:** Fügt erhebliche npm-Abhängigkeiten hinzu (~200+ packages). Build-Zeit deutlich höher. MDX-Komponenten sind für Positron-Docs nicht benötigt. Wartung einer React-Plattform parallel zum Positron-React-Frontend erhöht kognitive Last.

**Ablehnungsgrund:** Overkill. Positron-Docs sind inhaltsgetrieben, nicht interaktiv. Der zusätzliche Wartungsaufwand rechtfertigt nicht den marginalen Nutzen von MDX.

### Alternative 2: Sphinx

**Beschreibung:** Python-basierte Docs-Plattform mit reStructuredText/MyST.

**Evaluation:**
- **Pros:** Mächtiges Autodoc für Python-APIs, etabliertes Ökosystem.
- **Cons:** Positron hat keinen Python-Code. Autodoc ist nutzlos. rST-Syntax ist komplexer als Markdown. Keine bestehenden `.rst`-Dateien.

**Ablehnungsgrund:** Falsches Ökosystem für ein TypeScript-Projekt.

### Alternative 3: Wiki.js

**Beschreibung:** Browser-basierte Wiki-Plattform.

**Evaluation:**
- **Pros:** Nicht-technische Benutzer können direkt im Browser editieren.
- **Cons:** Zweite Source of Truth neben Git. Docs-as-Code-Prinzip verletzt. Server-Abhängigkeit für Build. Kein CI-fähiger Build-Prozess.

**Ablehnungsgrund:** Verletzt das GitHub-Source-of-Truth-Prinzip der Positron-Constitution (Artikel I).

### Alternative 4: Keine Plattform (nur Markdown-Dateien)

**Beschreibung:** Dokumentation als lose Markdown-Dateien ohne Build-, Search- oder Navigationslayer.

**Evaluation:**
- **Pros:** Keine zusätzlichen Abhängigkeiten, keine Build-Zeit.
- **Cons:** Navigation nur über Git-Dateisystem. Keine Suchfunktion. Keine Link-Validierung. Keine konsistente visuelle Präsentation. Erschwert RAG-Indizierung.

**Ablehnungsgrund:** Der Status quo wurde im Audit als fragmentiert bewertet. Ohne Plattform bleiben Docs für Menschen und KI-Agenten schwer navigierbar.

---

## Consequences

### Positive

| Consequence | Description |
|---|---|
| **Konsistente Navigation** | Alle Docs über eine einheitliche, durchsuchbare Oberfläche erreichbar |
| **Docs-as-Code** | Docs werden im selben Git-Repo versioniert, im selben PR-Prozess geändert |
| **CI-Prüfbar** | `mkdocs build --strict` validiert Links, Syntax und Struktur |
| **RAG-freundlich** | llms.txt + strukturierte Navigation verbessern KI-Kontext-Indizierung |
| **Minimale Abhängigkeiten** | Nur Python + 2-3 pip-Pakete zusätzlich |

### Negative

| Consequence | Description |
|---|---|
| **Python-Abhängigkeit** | Entwickler müssen Python + pip-Pakete installieren (einmalig) |
| **Build-Schritt** | `mkdocs build` ist ein zusätzlicher Build-Schritt im Workflow |
| **Lernkurve** | Team muss MkDocs-Material-Konfiguration verstehen |

### Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Python nicht auf allen Dev-Maschinen | Medium | Low | Dokumentiert in `docs/runbooks/development.md` |
| Plugin-Inkompatibilität mit Python 3.14 | Low | Medium | In Phase 9 getestet; Fallback auf minimale Konfiguration |
| CI Runner ohne Python | Low | Medium | `ubuntu-latest` hat Python 3 standardmäßig |
| Theme-Breaking-Changes | Low | Low | `requirements-docs.txt` pinnt Versionen |

---

## Related Documents

- [Docs-as-Code Audit](../../audits/DOCS_AS_CODE_AUDIT.md)
- [Positron Constitution](https://github.com/xxammaxx/Positron/blob/main/.specify/memory/constitution.md) — Article I, II, IV
- [Positron Architecture Overview](../../architecture/README.md)
- [AGENTS.md](https://github.com/xxammaxx/Positron/blob/main/AGENTS.md)
