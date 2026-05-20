# Git Workspace Adapter

## Purpose
Bereitet einen lokalen Workspace für Positron-Runs vor. Klont Repositories, erstellt isolierte Branches und stellt Status/Diff-Informationen bereit.

## Supported operations

| Operation | Beschreibung |
|-----------|-------------|
| prepareWorkspace | Klont oder reused Workspace, erstellt Positron-Branch |
| getStatus | Liest Git-Status (staged/unstaged/untracked/conflicted) |
| getDiff | Liest Git-Diff mit File-Count |
| getCurrentBranch | Aktueller Branch-Name |
| getHeadSha | HEAD Commit-SHA |
| validateWorkspacePath | Prüft ob Workspace gültig ist |

## Workspace layout

```
.positron/workspaces/
  <owner>/
    <repo>/
      runs/
        issue-<number>-<runId>/
```

## Branch naming

```
positron/issue-<number>-<slug>
```

- Umlaute normalisiert (ä→ae, ö→oe, ü→ue, ß→ss)
- Nur a-z, 0-9, "-"
- Kein path traversal (../)
- Prefix: `positron/issue-`

## Remote URL validation

| URL | Status |
|-----|--------|
| `https://github.com/owner/repo.git` | ✅ |
| `https://github.com/owner/repo` | ✅ (normalisiert zu .git) |
| `git@github.com:owner/repo.git` | ✅ |
| `https://evil.com/repo.git` | ❌ |
| `file:///etc/passwd` | ❌ |

## Command policy

| Status | Kommandos |
|--------|----------|
| ✅ Erlaubt | clone, fetch, status, diff, branch, switch, checkout, rev-parse, remote, worktree, log, init, add, restore |
| ❌ Verboten | push, commit, reset, clean, merge, rebase |
| ❌ Immer verboten | rm, sudo, bash, curl, wget |

## Dirty workspace behavior

- Workspace auf erwartetem Positron-Branch → Status zurückgeben, Run fortsetzen
- Workspace dirty auf anderem Branch → BLOCKED

## Authentication notes

- MVP: Public Repos ohne Token
- Private Repos: Token in `GITHUB_TOKEN` Env (nicht in URL persistiert)
- SSH: Folge-Issue

## Security notes

- Kein `shell: true` (spawn mit getrennten args)
- Shell-Metacharacters in args geblockt (`; | & $ ( )`)
- Remote-URL nur GitHub (HTTPS/SSH)
- Workspace-Pfade unter POSITRON_WORKSPACE_ROOT
- Path traversal blockiert (`../`)
- Token-Redaction in stdout/stderr

## Known limitations

- Kein Worktree-Support (clone-per-run)
- Kein SSH-Key-Management
- Kein Git-LFS
- Kein Submodule-Handling
