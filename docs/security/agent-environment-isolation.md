# Agent Environment Isolation

> **4-Level-Isolationsstrategie für Positron-Agenten.**
> Stand: 2026-05-26

## Übersicht

Positron verwendet ein abgestuftes Isolationsmodell, um Agenten je nach Vertrauensstufe und Aufgabe zu isolieren.
Die Strategie folgt dem Prinzip **Least Privilege**: Jeder Agent hat nur die minimal nötigen Berechtigungen.

---

## Level 0: Unrestricted (Keine Isolation)

**Gilt für:** Kernsystem (Server, Datenbank)

| Aspekt | Regel |
|--------|-------|
| Netzwerk | Vollzugriff (localhost + konfigurierte externe APIs) |
| Dateisystem | Vollzugriff auf Projektverzeichnis |
| Ausführung | Keine Einschränkungen |
| Beispiele | Express-Server, SQLite-Datenbank, Run-State-Machine |

---

## Level 1: Workspace-Isolation

**Gilt für:** Positron-eigene Subagenten (Allowed)

| Aspekt | Regel |
|--------|-------|
| Netzwerk | Nur Positron-API + konfigurierte externe Dienste (GitHub, Brave, Context7) |
| Dateisystem | Schreibzugriff nur auf zugewiesenen Workspace (`workspacePath`) |
| Ausführung | Nur via Run-State-Machine — keine Direktausführung |
| Gate | Evidence-Gates vor jeder Phase |
| Beispiele | `review-agent`, `research-agent`, `documentation-agent` |

**Implementierung:**
```typescript
// Jeder Run bekommt isolierten Workspace
const workspacePath = createWorkspacePath(runId);
// Agent hat nur Zugriff auf diesen Pfad
workspaceAdapter.prepareWorkspace(workspacePath, repoUrl);
```

---

## Level 2: Quarantined (Sandbox-Isolation)

**Gilt für:** Externe/ungeprüfte Skills (Quarantined)

| Aspekt | Regel |
|--------|-------|
| Netzwerk | Nur Positron-API (Read-only) — kein externer Netzwerkzugriff |
| Dateisystem | Read-only auf Projektverzeichnis. Schreiben nur in temporären Sandbox-Ordner |
| Ausführung | Nur via OpenCode Policy Gate — blockiert wenn `POSITRON_OPENCODE_MODE=fake` |
| Gate | Manuelles Gate-Approval vor jeder Aktion |
| Timeout | Max 30 Minuten Execution Time |
| Beispiele | `Researcher (Brave)`, `Deep Research`, `MCP Tool Bridge` |

**Implementierung:**
```typescript
// Quarantined-Skills werden durch Policy-Gates geschützt
function validateOpenCodeCommand(command: string): void {
  const mode = process.env['POSITRON_OPENCODE_MODE'] ?? 'fake';
  if (mode === 'fake') {
    throw new OpenCodeCommandPolicyError(
      'OpenCode is in fake mode — no real commands allowed. ' +
      'Set POSITRON_OPENCODE_MODE=real to enable real OpenCode execution.',
    );
  }
  // Nur erlaubte Slash-Kommandos
  if (!ALLOWED_SLASH_COMMANDS.some(cmd => command.includes(cmd))) {
    throw new OpenCodeCommandPolicyError(`Command not allowed`);
  }
}
```

---

## Level 3: Forbidden (Blockiert)

**Gilt für:** Nicht erlaubte externe Frameworks (Forbidden)

| Aspekt | Regel |
|--------|-------|
| Netzwerk | Vollständig blockiert |
| Dateisystem | Kein Zugriff |
| Ausführung | Installationsversuch wird erkannt und gemeldet |
| Beispiele | Paperclip Core, OpenClaw Base, OpenClaw Deploy |

**Durchsetzung:**
- Keine Policy erlaubt diese Skills
- AGENTS.md verbietet explizit deren Nutzung
- Manuelles Review bei Verdacht auf Installation

---

## Isolations-Matrix

| Komponente | L0 Unrestricted | L1 Workspace | L2 Quarantined | L3 Forbidden |
|------------|:-:|:-:|:-:|:-:|
| Positron Server | ✅ | — | — | — |
| SQLite DB | ✅ | — | — | — |
| issue-orchestrator | — | ✅ | — | — |
| review-agent | — | ✅ | — | — |
| research-agent | — | ✅ | — | — |
| compliance-agent | — | ✅ | — | — |
| playwright-agent | — | ✅ | — | — |
| documentation-agent | — | ✅ | — | — |
| architecture-agent | — | ✅ | — | — |
| security-agent | — | ✅ | — | — |
| Researcher (Brave) | — | — | 🟡 | — |
| Deep Research | — | — | 🟡 | — |
| MCP Bridge | — | — | 🟡 | — |
| Paperclip Core | — | — | — | 🔴 |
| OpenClaw Base | — | — | — | 🔴 |
| OpenClaw Deploy | — | — | — | 🔴 |

---

## Durchsetzungs-Mechanismen

1. **Policy Gates** (`speckit-policy.ts`, `opencode-policy.ts`)
2. **Fake/Real Mode** — Default: fake (keine echten Kommandos)
3. **Kill-Switches** — `POSITRON_MERGE_KILL_SWITCH`, `POSITRON_ENABLE_PUSH`
4. **Trust Tiers** — MCP-Tools nach Sicherheit kategorisiert
5. **Evidence Gates** — Keine Phase ohne prüfbare Artefakte
6. **Max Fix Loops** — Automatischer Stopp nach 3 Fehlschlägen
