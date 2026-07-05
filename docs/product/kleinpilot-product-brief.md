# KleinPilot Product Brief

## One-liner
Local-first Android app for preparing Kleinanzeigen listing drafts manually.

## User
Private seller preparing multiple listings from photos and notes. The owner (xxammaxx) is the primary user — KleinPilot is a personal tool, not a multi-tenant service.

## Problem
Creating consistent, well-structured Kleinanzeigen listings from many items is repetitive and error-prone. Switching between a camera app, notes app, and the Kleinanzeigen.de web interface leads to inconsistent descriptions, forgotten details, and time wasted on re-entering data.

## MVP Scope
- Local item drafts stored on-device.
- Photo attachment references (local file paths).
- Title and description draft fields with optional templates.
- Condition, defects, accessories, and pickup/shipping notes.
- Price note (not a price commitment — an internal planning field).
- Manual owner review enforced before export.
- Copy/export listing text for manual paste into Kleinanzeigen.de.

## Non-goals (MVP and beyond)
- No automatic posting to Kleinanzeigen.de.
- No login automation.
- No scraping of Kleinanzeigen.de.
- No messaging automation.
- No account control.
- No platform-rule bypass.
- No CAPTCHA bypass.
- No rate-limit bypass.
- No telemetry.
- No cloud dependency for core MVP features.

## First Android Test Target
- Device ID: `f7710718`
- Device: Samsung SM T595 (Galaxy Tab A 10.5)
- Model/codename: `gta2xllte`
- Android target: `android-arm`
- API level: 29

## Recommended Architecture (for later)
- **Platform:** Flutter (Dart), Android-first.
- **Storage:** Local-first (SQLite / Drift / Hive).
- **Export:** Clipboard-based or plaintext file.
- **Language model:** Optional local LLM provider later, no cloud LLM required for MVP.
- **No telemetry. No analytics. No crash-reporting SDK.**

## Positron Role
Positron is the orchestrator only:
- Make KleinPilot visible as a managed external target project.
- Track build path, gates, evidence, and owner approvals.
- No KleinPilot product logic embedded in Positron.

## Next Steps
1. Owner approval for target repo creation.
2. Flutter MVP scaffold in its own GitHub repository.
3. First Android draft-flow test on device `f7710718`.
4. Positron-tracked build and evidence cycle.
