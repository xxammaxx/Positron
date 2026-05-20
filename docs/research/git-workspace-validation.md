# Git Workspace Validation

**Datum:** 2026-05-20

## Sources
- Git Documentation: https://git-scm.com/docs
- Node.js child_process: https://nodejs.org/api/child_process.html
- Git Worktree: https://git-scm.com/docs/git-worktree

## Git strategy decision

**Use clone-per-run** (nicht Worktree).

Begründung:
- Positron-MVP hat einen Run pro Issue
- Worktrees sind komplexer (shared objects, locking)
- Clone-per-run ist einfacher zu testen (eigenständige Repos)
- Kein shared state zwischen Runs
- Bei späterem Skalierungsbedarf: auf Worktree migrieren

## Command execution decision

**Use `node:child_process spawn`** (nicht simple-git).

Begründung:
- Keine zusätzliche Dependency
- Volle Kontrolle über args (kein Shell-Injection-Risiko)
- `simple-git` ist ein Wrapper um spawn, gleiche Basis
- Timeout, stdout/stderr Capture nativ in Node.js

## Auth decision

**HTTPS mit Token** (für private Repos). MVP: Public Repos ohne Token.

Begründung:
- Token in Env, nicht in Remote-URL
- Kein Token-Persist in `.git/config`
- SSH erfordert Key-Management (Folge-Issue)

## Security implications

- Kein `shell: true` → verhindert Shell-Injection
- CommandPolicy: Nur erlaubte Git-Kommandos
- Remote-URL muss GitHub sein (blockiert file://, ssh://evil)
- Workspace-Pfad muss unter POSITRON_WORKSPACE_ROOT liegen
- Pfade aus User-Input sanitisieren (owner, repo, issue-title)
- Token-Redaction in stdout/stderr

## Consequences for implementation

- CommandRunner muss `spawn()` mit getrennten args verwenden
- `git clone` akzeptiert `--branch` und `--single-branch`
- `git status --porcelain=v1` für parsebares Output
- `git diff --stat` für Diff-Zusammenfassung
- `git rev-parse HEAD` für SHA
