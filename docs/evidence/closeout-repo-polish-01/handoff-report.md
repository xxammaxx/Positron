# Closeout Batch C — Repository Polish Handoff

## Summary

Adds repository governance and contribution documentation for Positron.

## Scope

Changed:

- `CONTRIBUTING.md` — contribution rules, local gates, workspace policy
- `SECURITY.md` — security reporting, security model, known limitations
- `CODE_OF_CONDUCT.md` — contributor behavior expectations
- `CHANGELOG.md` — project closeout change tracking
- `.github/PULL_REQUEST_TEMPLATE.md` — PR checklist with safety gates
- `.github/ISSUE_TEMPLATE/bug_report.md` — bug report template
- `.github/ISSUE_TEMPLATE/feature_request.md` — feature request template
- `.github/ISSUE_TEMPLATE/config.yml` — issue template config
- `README.md` — minimal links to new governance docs; web test count fix

Not changed:

- source code
- tests
- workflows
- dependencies
- lockfiles
- stashes
- GitHub-CI

## Verification

| Gate | Command | Exit Code | Result |
|------|---------|-----------|--------|
| git diff --check | `git diff --check` | 0 | PASS |
| biome format | `npx biome format .` | 0 | PASS (380 files, no fixes) |
| build | `npm run build` | 0 | PASS |
| typecheck | `npm run typecheck` | 0 | PASS |
| npm test | `npm test` | 0 | PASS (917/917) |
| apps/web test | `npm test --workspace apps/web` | 0 | PASS (196/196) |
| biome check (advisory) | `npx biome check .` | 2 | RED (known lint backlog) |

## Known Remaining Limitations

- Issue [#268](https://github.com/xxammaxx/Positron/issues/268) remains open
- GitHub-CI remains advisory-only
- Biome lint backlog remains
- Issue [#279](https://github.com/xxammaxx/Positron/issues/279) remains architecture continuation
- [#229](https://github.com/xxammaxx/Positron/issues/229) PR chain remains untouched
- PR [#218](https://github.com/xxammaxx/Positron/pull/218)/[#228](https://github.com/xxammaxx/Positron/pull/228) remain untouched

---

## Was kann die Software jetzt im Vergleich zum vorherigen Lauf?

### Neue Fähigkeiten

- Contribution rules are documented.
- Security reporting and safety posture are documented.
- PR and issue templates exist.
- Changelog/closeout notes exist.

### Entfernte Blocker

- Repo-polish documentation gaps reduced.
- Issue [#252](https://github.com/xxammaxx/Positron/issues/252) is closer to completion.

### Unveränderte Einschränkungen

- No code changed.
- No tests changed.
- No remote CI.
- No stash operations.
- Biome lint backlog remains out of scope.
- Issue [#279](https://github.com/xxammaxx/Positron/issues/279) remains open.
- Old PR chain remains untouched.

### Verbleibende Risiken

- Biome lint backlog still needs triage.
- Issue [#279](https://github.com/xxammaxx/Positron/issues/279) Phase 0 still needed.
- Old PR chain disposition still needed.

### Nächster sinnvoller Schritt

Review and merge this PR after human approval.
