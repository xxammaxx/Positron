# Target GitHub Auth Report — Linux Mint

## Auth Status

| Property | Value |
|----------|-------|
| GitHub Login | xxammaxx |
| Auth Method | keyring |
| Token Scopes | gist, read:org, repo, workflow |
| Git Protocol | https |
| Active Account | true |

## Verification

```bash
gh auth status
```
```
github.com
  ✓ Logged in to github.com account xxammaxx (keyring)
  - Active account: true
  - Git operations protocol: https
  - Token scopes: 'gist', 'read:org', 'repo', 'workflow'
```

## Classification

```text
TARGET_GH_AUTH_STATUS: READY
```

Full read/write access to GitHub repository. Token is present with sufficient scopes for all operations (repo, workflow).
