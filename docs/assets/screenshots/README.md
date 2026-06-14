# Screenshot Evidence

Capture date: June 14, 2026

These screenshots were generated from a freshly started local Positron instance with:

- Playwright Chromium
- fake GitHub, SpecKit, and OpenCode adapters
- an isolated local SQLite database
- push, merge, and fix-loop behavior disabled
- the merge kill switch enabled
- demo repository `test-repo`
- demo issue `#211`

## Files

| File | Verified view |
|---|---|
| `dashboard-overview.png` | Completed demo run, evidence summary, system state |
| `run-list.png` | Isolated run list |
| `run-detail-pipeline.png` | Event log and 28-phase pipeline |
| `evidence-explorer.png` | Aggregated demo evidence |
| `settings-safety.png` | Safe default controls |
| `voice-output-settings.png` | Browser TTS settings, default OFF |
| `admin-panel.png` | Authenticated local admin view with masked token input |

The Admin screenshot was captured by Playwright at the rendered Admin state before a strict-locator assertion stopped the capture sequence. It was visually reviewed before being copied from the ignored `test-results/` directory.

No fresh mobile screenshot was completed. No historical screenshot was substituted.

## Privacy Review

- No real GitHub token
- No private filesystem path
- No personal repository data
- No `.env` contents
- No trace, video, network log, console log, or database committed
