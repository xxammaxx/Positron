# Issue #59: Post-Revocation Verification and Secret Hygiene Gate

**Scope:** Verification, Secret-Scan, Hygiene (kein GitHub-Write, kein Dogfood, kein Release, kein Issue #58-Fix)  
**Priority:** P0 (Gate vor #58)  
**Status:** Wartet auf Human Confirmation (Token Revocation)

---

## Human Confirmation (ausstehend)

- [ ] Alter Token auf GitHub revoked
- [ ] Neuer Fine-grained PAT erstellt
- [ ] Neuer Token nur lokal in `.env` eingetragen

---

## Prüfungen (Agent Task — nach Human Confirmation)

### Secret Scan

```bash
grep -R "ghp_" . --exclude-dir=node_modules --exclude-dir=.git
grep -R "github_pat_" . --exclude-dir=node_modules --exclude-dir=.git
grep -R "GITHUB_TOKEN=" . --exclude-dir=node_modules --exclude-dir=.git
grep -R "sk-" . --exclude-dir=node_modules --exclude-dir=.git
grep -R "Bearer " . --exclude-dir=node_modules --exclude-dir=.git
```

Falls gitleaks verfügbar:

```bash
gitleaks detect --source . --redact --no-banner
```

Falls gitleaks nicht verfügbar: dokumentieren als `gitleaks unavailable`, grep-basierte Prüfung durchführen.

### Git Hygiene

```bash
git status --short
git check-ignore .env apps/server/.env
```

### Docs / Artifacts Check

- `docs/diagnostics/` — keine echten Tokens
- `docs/release/` — keine echten Tokens
- `docs/operations/` — keine echten Tokens
- GitHub Issue-Kommentare aus #58/#59 — keine echten Tokens
- Network-Logs, Trace-Manifeste — keine echten Tokens

### Redaction Check

- `.env` und `apps/server/.env` gitignored
- `.env.example` enthält nur Platzhalter
- Alle Reports zeigen Platzhalter, keine echten Tokens

---

## Acceptance Criteria

- [ ] Alter Token revoked: vom User bestätigt
- [ ] Neuer Token nicht im Arbeitsbaum
- [ ] `.env` und `apps/server/.env` gitignored
- [ ] Secret-Scan clean
- [ ] Reports/Artifacts clean
- [ ] GitHub-Kommentare clean
- [ ] Status: PASS

---

## Abschlussausgabe

```markdown
# Issue #59 Result: Post-Revocation Verification and Secret Hygiene Gate

## Status
PASS / PARTIAL / BLOCKED / FAIL

## Human confirmation
- Old token revoked:
- New fine-grained token created:
- New token stored only in local .env:

## Secret scan
- grep ghp_:
- grep github_pat_:
- grep GITHUB_TOKEN:
- grep sk-:
- grep Bearer:
- gitleaks:

## Git hygiene
- .env gitignored:
- staged changes:
- tracked secret files:

## Docs / artifacts
- diagnostics clean:
- release docs clean:
- GitHub comments clean:

## Decision
Ready to resume Issue #58 OpenCode CLI argument fix: YES/NO
```
