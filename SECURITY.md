# Security Policy

## Supported Versions

Positron is currently in **development (MVP)** stage. Only the latest commit on the `main` branch is supported. There are no stable releases yet.

| Version | Supported |
|---------|-----------|
| main (development) | ✅ |
| Older commits | ❌ |

## Reporting a Vulnerability

We take security seriously. If you discover a vulnerability in Positron, please report it responsibly.

### How to Report

1. **Do NOT** open a public GitHub issue for security vulnerabilities.
2. Send a detailed description to the repository maintainers via a **private security advisory** on GitHub:
   - Go to https://github.com/xxammaxx/Positron/security/advisories
   - Click "New draft security advisory"
3. Alternatively, if you cannot use GitHub advisories, open a **private issue** or contact the maintainers directly.

### What to Include

- A clear description of the vulnerability
- Steps to reproduce (proof of concept)
- Affected versions/components
- Potential impact
- Any suggested remediation (optional)

### Response Timeline

- **Acknowledgment:** Within 48 hours of report
- **Assessment:** Within 5 business days
- **Fix/Workaround:** Timeline depends on severity, communicated during assessment

## Safe Harbor

We operate a **safe harbor** policy for security researchers:

- We will not pursue legal action for good-faith vulnerability research
- We appreciate coordinated disclosure
- We will acknowledge researchers in release notes (with permission)

## Security Model

Positron's security architecture is documented in:

- [`docs/security/stop-ask-protocol.md`](docs/security/stop-ask-protocol.md) — Stop/Ask protocol for MCP, Blueprint, Provider, and Oversight operations
- [`docs/security/security-model.md`](docs/security/security-model.md) — Overall security model
- [`docs/security/agent-environment-isolation.md`](docs/security/agent-environment-isolation.md) — Agent isolation levels
- [`docs/security/external-skills-inventory.md`](docs/security/external-skills-inventory.md) — External skill trust tiers

## Key Security Features

| Feature | Description |
|---------|-------------|
| Evidence-Gated Progression | No phase completes without verifiable proof |
| Secret Redaction | API keys, tokens masked in logs and evidence |
| Kill Switches | `POSITRON_MERGE_KILL_SWITCH`, `POSITRON_ENABLE_PUSH` |
| Max Fix Loops | Automatic stop after 3 failed attempts |
| Rate Limiting | 100 requests/minute per IP |
| Infrastructure Gates | 8 gates blocking unsafe operations by default |
| No Auto-Execution | All POST endpoints disabled by default |
