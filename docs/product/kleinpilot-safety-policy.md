# KleinPilot Safety Policy

KleinPilot must remain a **manual listing draft helper**. This policy applies to all present and future KleinPilot runs, features, and integrations.

## Allowed

- Local listing draft creation.
- Local photo file references (no upload, no sharing).
- Manual copy and export of draft text.
- Manual owner review workflow (enforced before export).
- Optional local text templates for common listing patterns.
- Optional local LLM provider integration (offline, no telemetry).

## Forbidden (Red Block)

- Automated login to Kleinanzeigen.de or any third-party platform.
- Automated posting, editing, or deletion of listings.
- Scraping, crawling, or automated access to Kleinanzeigen.de.
- Messaging automation (reading or sending).
- Account automation or management.
- CAPTCHA bypass or solving.
- Rate-limit bypass or evasion.
- Terms of service bypass.
- Hidden telemetry or analytics.
- Collecting or storing third-party personal data.
- Cloud LLM calls containing listing content.
- Any feature that programmatically interacts with Kleinanzeigen.de servers.

## Default Decision Rule

If a proposed feature would cause KleinPilot to directly interact with Kleinanzeigen.de or any similar platform:

> **Classify as RED_BLOCK** unless the owner explicitly approves a compliant, manual, non-automated workflow in writing.

## Review Gate

Every KleinPilot Positron run must pass a safety review check before code reaches a PR:

1. Diff audit: no `kleinanzeigen.de` URLs in source code or dependencies.
2. Diff audit: no HTTP client code targeting external listing platforms.
3. Diff audit: no headless browser or automation framework imports.
4. Manual owner confirmation that the feature is a manual draft helper only.

## Positron Safety Checks (Registry)

Positron tracks these checks in the registry entry:

| Check ID | Label | Expected |
|---|---|---|
| `no_auto_posting` | No automatic posting | pass |
| `no_scraping` | No scraping | pass |
| `no_login_automation` | No login automation | pass |
| `manual_review` | Manual owner review required | pass |
| `no_telemetry` | No telemetry | pass |

Any deviation requires the owner to explicitly update this policy document and the registry checks before code is written.
