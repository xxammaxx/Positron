# Positron GitHub Release Draft

Status: DRAFT ONLY - DO NOT PUBLISH

## Summary

Positron is an evidence-gated GitHub issue-to-PR orchestrator for supervised coding workflows. This draft describes the current prototype and repository presentation; it does not create a release, tag, or production claim.

## Highlights

- React/Vite operator dashboard
- Run list and 28-phase pipeline view
- Server-sent run and evidence updates
- GitHub, SpecKit, OpenCode, and workspace adapters with fake/real modes
- Evidence explorer and QA-oriented workflow
- Browser-local voice output, default OFF
- Push, merge, fix-loop, and kill-switch safety controls

## Screenshots

- [Dashboard](../assets/screenshots/dashboard-overview.png)
- [Runs](../assets/screenshots/run-list.png)
- [Run pipeline](../assets/screenshots/run-detail-pipeline.png)
- [Evidence](../assets/screenshots/evidence-explorer.png)
- [Safety settings](../assets/screenshots/settings-safety.png)
- [Voice output](../assets/screenshots/voice-output-settings.png)
- [Admin](../assets/screenshots/admin-panel.png)

## Safety Defaults

```env
POSITRON_ENABLE_PUSH=false
POSITRON_ENABLE_MERGE=false
POSITRON_ENABLE_FIX_LOOP=false
POSITRON_MERGE_KILL_SWITCH=true
```

## Start Locally

```bash
npm install
npm run dev:demo
```

Open `http://localhost:5173` and verify `http://localhost:3000/api/health`.

## QA Status

Local results from June 14, 2026 are recorded for review. Re-run them from the eventual release commit and confirm current CI before publishing.

| Gate | Result |
|---|---|
| Demo quickstart | PASS - frontend/backend HTTP 200, fake mode |
| `npm test` | PARTIAL - 689/690 root tests; web tests separately PASS 196/196 |
| `npm run build` | PASS |
| Web production build | PASS with existing warnings |
| `npm run coverage:safety` | PARTIAL - 397/399 |
| `npm run test:contracts` | PASS - 140/140 |
| `npm run typecheck` | PASS |
| `npm run lint` | FAIL - existing baseline reports 293 errors and 404 warnings |
| Issue-template YAML and README links | PASS |
| Secret scan | PASS for planned text diff |
| Artifact scan | PASS for worktree diff; two historical tracked artifacts remain outside this change |

Blocking details:

- Windows path failure in `packages/opencode-adapter/src/__tests__/real-adapter.test.ts` because the test writes to `/tmp`.
- Safety coverage also observed a 5-second timeout in one state-machine property test.
- The repository-wide lint baseline remains red outside this documentation-only scope.
- A fresh mobile screenshot was not completed after the capture workflow reached its three-loop stop limit.

## Known Limitations

- Supervised prototype; not unattended production automation
- Mixed `0.1.0` and v0.2 release-candidate metadata
- Real mode requires explicit CLI, token, repository, and workspace configuration
- Push and merge remain disabled unless maintainers explicitly change their safety flags
- Runtime coverage outside safety-critical modules has documented gaps
- Legacy `demo:open*` scripts are not the recommended quickstart
- A fresh mobile screenshot is not included in this draft

## Publish Decision

No publish action is authorized. Human approval and green release-commit evidence are required before creating any GitHub release or tag.
