# Incident Runbook: High OpenCode Failure Rate

**Alert:** `HighOpenCodeFailureRate` | **Severity:** Warning | **Component:** opencode

## Meaning

More than 25% of OpenCode commands are failing.

## Possible Causes

1. OpenCode CLI is not installed or outdated
2. `opencode` binary is not executable (permissions)
3. Command timeout — agent commands taking too long
4. Invalid output — OpenCode returned unparseable JSON
5. SpecKit not available (affects `speckit.*` commands)
6. Workspace not properly set up

## Immediate Checks

```bash
# 1. Check OpenCode version
opencode --version

# 2. Check which commands fail
curl -s http://localhost:3000/metrics | grep positron_opencode_command_failures_total

# 3. Check failure by error_kind
curl -s http://localhost:3000/metrics | grep "opencode_command_failures_total" | grep "error_kind"

# 4. Check command duration
curl -s http://localhost:3000/metrics | grep positron_opencode_command_duration_seconds

# 5. Test OpenCode manually
opencode run --command spec-driven-development --format json "test" 2>&1 | head -20
```

## Diagnostic Commands

```bash
# Check OpenCode installation path
which opencode

# Check OpenCode permissions
ls -la $(which opencode)

# Check if spec-driven-development skill is available
opencode --list-skills 2>&1 | grep spec-driven

# Check workspace status
ls -la /tmp/positron-workspaces/
```

## Dashboard Panels

- **Grafana** → Positron Runtime → Adapter Health section
- OpenCode Commands panel (check success vs error ratio)
- OpenCode Duration p95 panel (high duration → possible timeouts)

## Metrics

- `positron_opencode_command_total` — total by command_type and outcome
- `positron_opencode_command_failures_total` — failures by error_kind
- `positron_opencode_command_duration_seconds` — duration distribution

## Safe Countermeasures

1. **Reinstall OpenCode**: follow OpenCode installation guide
2. **Fix permissions**: `chmod +x $(which opencode)`
3. **Increase timeout**: if commands time out, increase `timeout` in `RealOpenCodeAdapter`
4. **Check SpecKit**: if `speckit.*` commands fail, verify SpecKit installation
5. **Verify workspace**: ensure workspace directories exist and are writable

## Escalation

1. First: Developer checks OpenCode CLI status (5 min)
2. Second: Pipeline owner investigates command failures (15 min)
3. Third: OpenCode maintainers if CLI bug is suspected (1 hour)

## When to Clear

Alert clears when OpenCode failure rate drops below 25% for 5 minutes. Verify:
- `rate(opencode_command_total[5m]) / rate(opencode_command_failures_total[5m]) < 0.25`
- Manual `opencode --version` succeeds
- Recent runs show successful commands
