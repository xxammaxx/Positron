# VoiceWiki Local Flutter Toolchain Alignment Report

## Purpose

This is the first tracked VoiceWiki readiness run after VoiceWiki became a managed external project in Positron. The goal was to resolve the local Flutter/Dart toolchain blocker and make VoiceWiki locally reproducible and testable.

## VoiceWiki Reality

| Field | Value |
|---|---|
| Repo | https://github.com/xxammaxx/VoiceWiki |
| Branch | master |
| HEAD | a7059ff2ceb20b9501684a1e511574e38d67a02e |
| PR #35 | MERGED |
| Dart requirement | ^3.11.3 |
| CI Flutter | 3.41.5 |

## Toolchain Before / After

| Tool | Before | After | Required | Status |
|---|---|---|---|---|
| Flutter | 3.41.1 (blocked) | 3.44.4 | >= 3.41.5 | OK |
| Dart | 3.11.0 (blocked) | 3.12.2 | ^3.11.3 | OK |
| Channel | stable | stable | — | OK |

> **Note:** The local Flutter SDK was already updated (3.44.4) since the last audit. No destructive upgrade was required for this run. Dart 3.12.2 comfortably satisfies the ^3.11.3 constraint.

## Local Gates

| Gate | Exit | Result | Notes |
|---|---:|---|---|
| flutter pub get | 0 | PASS | Dependencies resolved. 18 packages have newer versions (all incompatible with current constraints). |
| flutter analyze | 0 | PASS | 1 pre-existing warning (unused_element), 1 info (dangling_library_doc_comments). No errors. |
| flutter test | 0 | PASS | **221 tests passed** (all green). 0 failures, 0 errors. |

## Test Breakdown

| Test File | Tests |
|---|---|
| red_export_constraints_test.dart | 8 (RED-MD-01, RED-MD-02, RED-MD-03, RED-MD-04) |
| markdown_export_service_test.dart | 21 |
| markdown_filename_sanitizer_test.dart | 4 |
| network_guardrail_test.dart | 88 (RED-NET-01 through RED-NET-15) |
| widget_test.dart | 19 |
| entry_review_screen_test.dart | 25 |
| privacy_service_test.dart | 17 |
| manual_entry_editor_test.dart | 35 |
| transcription_provider_test.dart | 4 |
| entry_widgets_test.dart | 21 |
| **Total** | **221** |

## Safety Checks

| Check | Result |
|---|---|
| VoiceWiki app code changed | NO |
| pubspec.yaml changed | NO |
| pubspec.lock committed | NO |
| model/audio files added | NO (no .onnx, .gguf, .tflite, .pt, .safetensors, .wav, .mp3, .ogg, .flac, .m4a) |
| network imports in lib/ | NO (no package:http, package:dio, connectivity_plus in lib/) |
| analytics SDKs | NO (firebase, sentry, mixpanel, amplitude, segment all absent from lib/) |
| cloud/telemetry enabled | NO |
| STT enabled | NO (sherpa_onnx still commented) |
| VoiceWiki working tree | CLEAN |

## Positron Tracking Update

| Surface/Data | Status |
|---|---|
| voicewiki-seed.ts updated | YES — blocker resolved, timeline advanced, next run defined |
| evidence report created | YES — this file |
| Managed project status | LOCAL_GATES_REPRODUCIBLE |

## Boundaries

| Rule | Enforced |
|---|---|
| No VoiceWiki code changes | YES |
| No VoiceWiki dependency changes | YES |
| No VoiceWiki workflow changes | YES |
| No VoiceWiki PR | YES |
| No VoiceWiki issue close | YES |
| No Real Mode | YES |
| No Phase-D probe | YES |
| No push to master | YES |
| No merge | YES |

## Classification

VOICEWIKI_TRACKED_TOOLCHAIN_RUN_STATUS: GREEN_LOCAL_GATES_REPRODUCIBLE_AND_POSITRON_PR_CREATED
POSITRON_VOICEWIKI_TRACKING_STATUS: UPDATED_VISIBLE_STATUS_PR_CREATED

## Next Owner Approval

```
APPROVE VOICEWIKI FIRST SMALL APP TEST — PRIVACY SETTINGS SNAPSHOT / DOC CONSISTENCY ONLY
```

This would run:
- `flutter test` (ensure 221 tests still pass)
- Verify `docs/SETUP_FLUTTER.md` matches reality
- Verify `docs/CURRENT_STATE.md` test count matches reality
- Privacy settings UI widget test snapshot
- Evidence report

No VoiceWiki app code changes. No dependency changes.
