# Security Policy

Positron is a supervised prototype that can interact with GitHub, local workspaces, and external CLI tools. Treat every real-mode run as privileged automation.

## Reporting

Do not disclose vulnerabilities, tokens, private paths, or sensitive repository data in a public issue.

Use GitHub private vulnerability reporting when it is enabled for this repository. Otherwise contact the repository owner through an established private channel and include only the minimum sanitized reproduction details.

## Safe Defaults

```env
POSITRON_ENABLE_PUSH=false
POSITRON_ENABLE_MERGE=false
POSITRON_ENABLE_FIX_LOOP=false
POSITRON_MERGE_KILL_SWITCH=true
```

Fake adapters are the default. Real mode requires explicit configuration, an isolated workspace root, and scoped GitHub credentials. Repository policy requires human review, but the runtime does not currently enforce a separate approval gate.

## Credential Handling

- Keep tokens in local environment configuration or an approved secret store.
- Never commit `.env` files.
- Never paste credentials into issues, pull requests, logs, screenshots, prompts, or evidence.
- Use the least GitHub permissions required for the target repository.
- Rotate any credential that may have been exposed.

## Supported Status

The current prototype receives security fixes on the default branch. No production support or response-time guarantee is claimed.
