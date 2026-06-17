# Agentic Coding Security Gates

> Version: 1.0.0-draft | Status: PROPOSED | Date: 2026-06-10
> Related: SECURITY.md, security-model.md, external-skills-inventory.md

---

## Purpose

Definiert Security-Gates spezifisch für Vibe-Coding/Agentic-Coding-Workflows. Ergänzt das bestehende Positron-Sicherheitsmodell um Agent-spezifische Bedrohungen und Gegenmaßnahmen.

---

## Threat Model (Agentic Coding specific)

### T1: Agent Hallucination
- **Beschreibung:** Agent erfindet nicht existierende APIs, Funktionen oder Dependencies
- **Gegenmaßnahme:** Red Tests + Compile-Gate + Typecheck
- **Detection:** Build-Fehler, Type-Fehler, Test-Fehler

### T2: Agent Secret Leakage
- **Beschreibung:** Agent sendet Secrets (Tokens, Keys) an externe LLM-APIs
- **Gegenmaßnahme:** Secret Redaction vor Agent-Prompt, Allowlist-basierte Prompt-Filterung
- **Detection:** Secret Scan (Semgrep), Audit-Logs

### T3: Agent Command Injection
- **Beschreibung:** Agent konstruiert unsichere Shell-Befehle
- **Gegenmaßnahme:** Command Allowlist (sandbox/opencode-policy.ts)
- **Detection:** Policy-Gate blockiert nicht erlaubte Kommandos

### T4: Agent Workspace Escape
- **Beschreibung:** Agent greift außerhalb des Worktrees auf Dateien zu
- **Gegenmaßnahme:** Worktree-Isolation, Pfad-Validierung (sandbox/paths.ts)
- **Detection:** Pfad-Validierung wirft Error bei unerlaubten Pfaden

### T5: Agent Main-Branch Corruption
- **Beschreibung:** Agent pusht direkt auf `main` oder `master`
- **Gegenmaßnahme:** Branch Policy (sandbox/commit-policy.ts), Push-Kill-Switch
- **Detection:** Push-Policy blockiert geschützte Branches

### T6: Agent Supply Chain Attack
- **Beschreibung:** Agent fügt bösartige Dependencies hinzu
- **Gegenmaßnahme:** Dependency Audit (npm audit), Package Allowlist
- **Detection:** CI Dependency Audit Gate

### T7: Agent Data Exfiltration
- **Beschreibung:** Agent exfiltriert Quellcode oder Secrets über Netzwerk
- **Gegenmaßnahme:** Netzwerk-Isolation (Docker/Container), Egress-Filterung
- **Detection:** Netzwerk-Monitoring, Sentinel-Alerts

### T8: Agent Prompt Injection
- **Beschreibung:** Schadcode im Issue-Text manipuliert Agenten-Verhalten
- **Gegenmaßnahme:** Prompt-Sanitization, Context-Isolation, Constitution-Bindung
- **Detection:** Unerwartetes Agenten-Verhalten, Scope-Verlassung

---

## Security Gate Matrix (Vibe-Coding specific)

| Gate | Phase | Blocking | Tool | Evidence |
|------|-------|----------|------|----------|
| **Secret Scan** | Pre-IMPLEMENT, Post-IMPLEMENT | Yes | Semgrep (`generic.secrets`) | Scan report |
| **Dependency Audit** | Post-IMPLEMENT | Yes | `npm audit` | Audit report |
| **SAST** | Post-IMPLEMENT | No | Semgrep, CodeQL | Scan report |
| **Command Allowlist** | IMPLEMENT (runtime) | Yes | `opencode-policy.ts` | Policy log |
| **Branch Protection** | COMMIT, PUSH | Yes | `commit-policy.ts` | Branch check |
| **Path Validation** | IMPLEMENT (runtime) | Yes | `paths.ts` | Path log |
| **Prompt Sanitization** | Pre-IMPLEMENT | Yes | Secret Redaction | Sanitized prompt |
| **Agent Isolation** | IMPLEMENT (runtime) | Yes | Worktree/Container | Workspace path |
| **Evidence Integrity** | Post-VERIFY | Yes | SHA-256 Hashes | Hash manifest |

---

## Agent Risk Classification

| Agent Type | Risk Level | Trust Tier | Human Approval | Max Autonomy | Private Repos |
|------------|------------|------------|----------------|--------------|---------------|
| **OpenCode (local)** | medium | 1 | Required for merge | Level 3 | Yes (local) |
| **Codex CLI (local)** | medium | 1 | Required for merge | Level 3 | Yes (local) |
| **Claude Code (local)** | medium | 1 | Required for merge | Level 3 | Yes (local) |
| **Cursor (local/IDE)** | medium | 1 | Required for merge | Level 2 | Yes (local) |
| **Windsurf (local/IDE)** | medium | 1 | Required for merge | Level 2 | Yes (local) |
| **Devin (cloud)** | high | 2 | Required for ALL changes | Level 2 | ⚠️ Review needed |
| **GitHub Copilot (cloud)** | medium | 1 | Required for merge | Level 2 | ⚠️ Review needed |
| **Generic MCP Agent** | variable | 1-2 | Based on trust tier | Level 1-3 | Depends on agent |
| **Human Operator** | low | 2 | Self-approving | N/A | Yes |

---

## Prompt Sanitization Rules

Vor dem Senden an einen externen Agenten:

1. **Secret Redaction:** `ghp_*`, `sk-*`, `anthropic_*`, `AIza*`, `github_pat_*`
2. **Path Sanitization:** Absolute Pfade durch Workspace-relative Pfade ersetzen
3. **Token Removal:** `GITHUB_TOKEN`, `NPM_TOKEN`, `DOCKER_TOKEN`
4. **IP/Hostname Removal:** Interne IPs, Hostnames
5. **Scope Limitation:** Issue-Kontext auf relevante Teile beschränken

---

## Command Allowlist (erweitert für Multi-Agent)

### Always Allowed (Level 3+)
```typescript
const SAFE_COMMANDS = [
  'npm test', 'npm run test', 'npm run build', 'npm run lint',
  'npx vitest run', 'npx tsc --noEmit',
  'git status', 'git diff', 'git add', 'git commit',
  'git log', 'git branch', 'git checkout',
];
```

### Always Denied
```typescript
const BLOCKED_COMMANDS = [
  'sudo', 'rm -rf /', 'git push --force', 'git push -f',
  'git push origin main', 'git push origin master',
  'docker system prune', 'chmod 777', ':(){ :|:& };:',  // fork bomb
  '> /dev/sda', 'dd if=', 'mkfs.',
];
```

### Agent-Specific Allowlists
- **OpenCode:** Standard Allowlist
- **Codex CLI:** Standard Allowlist + `npx create-*` (scaffolding)
- **Claude Code:** Standard Allowlist + `npm install` (mit Audit-Gate)
- **Devin:** RESTRICTED — keine Shell-Befehle; nur API-basierte Änderungen

---

## Evidence Integrity Gates

### Hash Verification
Jedes Evidence-Artefakt MUSS einen SHA-256-Hash haben:

```typescript
interface EvidenceIntegrityCheck {
  artifactPath: string;
  recordedHash: string;
  actualHash: string;
  matches: boolean;
  tampered: boolean;
}
```

### Tamper Detection
- Artifact-Hash wird bei Erstellung gespeichert
- Vor Verwendung wird Hash verifiziert
- Hash-Mismatch → `FAILED_UNSAFE` (keine automatische Wiederholung)

---

## Audit Requirements (DSGVO/GDPR)

Für agentische Coding-Läufe mit personenbezogenen Daten:

1. **Data Minimization:** Agent bekommt nur notwendigen Kontext
2. **Processing Log:** Jeder Agentenzugriff wird geloggt
3. **Retention:** Agent-Artefakte nach definierter Frist löschen
4. **Consent:** Explizite Freigabe für Cloud-Agenten (Devin, Copilot)
5. **Right to Erasure:** Agenten-generierte Daten müssen löschbar sein

---

## Emergency Kill Switches

| Switch | Env Var | Default | Effect |
|--------|---------|---------|--------|
| Merge Kill | `POSITRON_MERGE_KILL_SWITCH` | `true` | Blocks ALL merges |
| Push Kill | `POSITRON_ENABLE_PUSH` | `false` | Blocks ALL pushes |
| Agent Kill | `POSITRON_DISABLE_AGENTS` (neu) | `false` | Blocks ALL agent runs |
| Cloud Agent Kill | `POSITRON_DISABLE_CLOUD_AGENTS` (neu) | `true` | Blocks Devin, Copilot |
| Network Kill | `POSITRON_AGENT_NO_NETWORK` (neu) | `false` | Blocks agent network access |

---

## Integration with Existing Security Model

Das bestehende `security-model.md` definiert:
- Environment-Variable Gates (PUSH, MERGE, FIX_LOOP, etc.)
- Fake/Real Mode Architecture
- Branch Policy
- Secret Redaction
- SQLite Security

Diese Datei ERGÄNZT um:
- Agent-spezifische Bedrohungen (T1-T8)
- Agent Risk Classification
- Prompt Sanitization
- Command Allowlist für Multi-Agent
- Evidence Integrity Gates
- Cloud-Agent-Kill-Switches
- DSGVO-Audit-Anforderungen für Agenten

Keine Überschneidung oder Widerspruch zu bestehenden Policies.
