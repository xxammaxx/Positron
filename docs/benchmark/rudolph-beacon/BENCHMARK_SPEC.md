# Rudolph Beacon — Benchmark Specification

## Overview
The Rudolph Beacon benchmark is a deterministic diagnostic system for Positron capability verification. It simulates a Bluetooth reindeer tracking system (BLE beacons) using purely local, deterministic, reproducible logic.

## Purpose
This benchmark tests whether Positron can:
1. Recognize and process benchmark issues correctly
2. Connect Spec/Plan/Task artifacts to issue requirements
3. Evaluate Fixture and Dry-Run agents
4. Execute local gates (or correctly simulate/document them)
5. Classify error cases without hallucination
6. Produce machine-readable and human-readable evidence
7. Prevent circular building (loop prevention)
8. Draw evidence-backed conclusions instead of false GREEN claims

## Domain: Bluetooth Rentier Simulator
- 9 simulated reindeer beacons (Rudolph through Blitzen)
- BLE beacon data: battery level, RSSI, last-seen timestamp
- Status classification: GREEN / YELLOW / RED
- Deterministic scan simulator with seed-based variation
- No real Bluetooth hardware required

## Benchmark Issues

| ID | Title | Key Test |
|----|-------|----------|
| BENCH-001 | Domain Baseline | Status logic, boundary values |
| BENCH-002 | Deterministic Scan Simulator | Seed determinism, unknown beacon handling |
| BENCH-003 | Evidence Contract | Schema, secret redaction, conclusion logic |
| BENCH-004 | Traceability / Loop Prevention | Evidence enforcement, issue independence |
| BENCH-005 | Dry-Run Safety | Action blocking, kill switch respect |

## Integration Points
- **DeterministicFixtureAgent** — fixture-based reproducible test execution (BENCH-001, BENCH-002)
- **OpenCodeDryRunAgent** — safety analysis of planned actions (BENCH-005)
- **ExecutionMode** — fixture / dry-run / real (all benchmark issues)
- **EvidenceReport** — structured evidence output (BENCH-003, BENCH-004)

## Non-Scope (explicitly excluded)
- Real Bluetooth hardware
- Network-dependent BLE scanning
- Real-time positioning
- External MQTT/Cloud integration
- GitHub Actions / remote CI triggering
- GitHub Issue/PR creation (remote)

## Architecture
- `packages/benchmark-rudolph/` — core benchmark package
- `docs/benchmark/rudolph-beacon/` — specifications and traceability
- `docs/evidence/rudolph-beacon/` — evidence artifacts
