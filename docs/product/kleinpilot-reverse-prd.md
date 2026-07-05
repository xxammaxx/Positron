# KleinPilot Reverse PRD

## Product Goal
Help the owner create high-quality, manually reviewed Kleinanzeigen listing drafts offline, eliminating repetitive copy-paste errors and forgotten details.

## Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-001 | Create local listing draft. | P0 (MVP) |
| FR-002 | Attach or select local photo references. | P0 (MVP) |
| FR-003 | Enter item condition (new, used, defective) and defects. | P0 (MVP) |
| FR-004 | Generate or template description text. | P0 (MVP) |
| FR-005 | Store price note (internal planning, not a listed price). | P0 (MVP) |
| FR-006 | Export or copy final draft text for manual paste. | P0 (MVP) |
| FR-007 | Require manual owner review before export. | P0 (MVP) |

## Privacy and Safety Requirements

| ID | Requirement | Rationale |
|---|---|---|
| SR-001 | No account login. | Keeps KleinPilot out of scope for Kleinanzeigen.de account automation. |
| SR-002 | No automatic posting. | Violates Kleinanzeigen.de terms and introduces legal risk. |
| SR-003 | No scraping. | No automated access to Kleinanzeigen.de or any third-party platform. |
| SR-004 | No telemetry. | Owner tool — no usage data collection. |
| SR-005 | Local-first storage. | All drafts and photos stay on the device. |
| SR-006 | No cloud dependency for MVP. | Works fully offline except optional local LLM provider later. |
| SR-007 | No collection of buyer/seller messages. | KleinPilot is a draft tool, not a communication tool. |

## Success Criteria

1. App builds successfully on Linux (`flutter build apk --debug`).
2. App installs and runs on Android device `f7710718` (Samsung SM T595, API 29).
3. User can create at least one local draft with all fields.
4. User can copy or export draft text manually.
5. Zero network or API calls to `kleinanzeigen.de` or any third-party platform.
6. All Positron local gates pass (build, typecheck, test).

## Out of Scope (permanent)

- Kleinanzeigen.de login.
- Ad posting, editing, or deletion.
- Message reading or sending.
- Search or browse functionality.
- Account management.
- CAPTCHA solving.
- Rate-limit evasion.
- Terms of service bypass.

## Out of Scope (for MVP)

- Multiple device support.
- Cloud sync.
- LLM integration (optional for later runs).
- Image optimization or editing.
- Multi-language support.
- Sharing to other platforms.
