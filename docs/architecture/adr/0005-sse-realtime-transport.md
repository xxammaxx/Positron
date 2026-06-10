# ADR-0005: SSE as Realtime Transport for Live Operations

- **Date:** 2026-05-26
- **Status:** Accepted
- **Deciders:** Positron Architecture Team (reviewed post-impl)
- **Supersedes:** None
- **Implements:** Issue #66 — Live Operations Pass

---

## Context

Positron needed real-time operational visibility into agent execution runs. Users must see events as they happen (log entries, phase transitions, evidence creation, cancellation), not just poll for snapshots. The system has these characteristics:

| Characteristic | Value |
|---|---|
| Event direction | Server → Client only |
| Event frequency | < 20 events per second (rate-limited) |
| Peak concurrent clients | < 50 (internal dev tool) |
| Client environment | Browser with native `EventSource` API |
| Cancel/control | Via HTTP POST (separate from streaming) |
| Reconnection requirement | Essential — runs can last minutes to hours |

The existing polling mechanism (5s on dashboard, 10s on runs page) was acceptable for static data but gave no live feedback during active runs. The Run Detail page had no streaming at all.

---

## Decision

**Use Server-Sent Events (SSE) via the native browser `EventSource` API**, with the following layered design:

### Transport layer
- Single endpoint: `GET /api/runs/:id/events/stream`
- Standard SSE headers (`text/event-stream`, `no-cache`, `keep-alive`)
- Connection tracked in `Map<runId, Set<Response>>` for broadcast
- 15-second keepalive interval (both SSE event + raw comment)
- Cleanup on `req.on('close')` to prevent connection leaks

### Reconnection layer (W3C Last-Event-ID)
- Every event includes `id: <sequence>\n` (W3C standard)
- Browser automatically sends `Last-Event-ID` header on reconnect
- Server reads header, computes resend index, sends only missed events
- Initial payload includes `reconnected: true` flag
- Sequence counter primed on connection to `allEvents.length` to continue from existing

### Ordering layer (dual sequence)
- Monotonically incrementing sequence per run (`eventSequences` Map)
- Delivered via **both** W3C `id:` field (for browser) **and** `_sequence` in JSON payload (for programmatic consumers)
- Starts at 1, increments on every `broadcastSSE()` call

### Rate limiting layer
- 20 events/second per run, sliding 1-second window
- `initial` and `heartbeat` events excluded from rate limit
- Silently drops excess events (best-effort transport)
- Per-run scope: prevents one noisy run from starving others without a global throttle

### Security layer
- `redactSecrets()` applied to **all** data before broadcast
- 9 regex patterns (GitHub tokens, OpenAI/Anthropic keys, Google, Slack, AWS)
- Key-name masking: any object key matching `/token|secret|password|key|auth/i` with string value >10 chars is redacted
- 5000-char truncation, 20-level recursion limit to prevent payload DoS

### Event type taxonomy
| Event | Purpose |
|---|---|
| `initial` | Full run state + events batch on connect |
| `run-event` | New log event during execution |
| `run-update` | Phase/status/branch change |
| `run-control` | Pause/resume/abort signals |
| `run-complete` | Run terminal state reached |
| `run-evidence-created` | New artifact produced |
| `run-cancelled` | Run cancelled by user |
| `heartbeat` | 15s keepalive (SSE event + raw `:keepalive` comment) |

---

## Alternatives Considered

### Alternative A: WebSocket (`ws://`)
**Pros:**
- Full bidirectional communication
- Lower overhead per message (no HTTP framing)
- Existing libraries (`ws`, `socket.io`) with reconnection built in

**Cons:**
- Bidirectional not needed: cancel/control is via HTTP POST (simpler, idempotent)
- Connection upgrade adds complexity (proxy configuration, `X-Forwarded-For`, sticky sessions for multi-instance)
- `socket.io` adds 60KB+ client bundle vs 0KB for native `EventSource`
- SSE reconnection is built into browser; WebSocket requires custom reconnect logic
- Over-engineering for < 50 clients, < 20 msg/s

**Verdict:** Rejected — WebSocket offers no benefit over SSE for unidirectional status streaming and adds unnecessary complexity.

### Alternative B: HTTP Long-Polling
**Pros:**
- Works in all browsers (even without EventSource)
- Simple request/response model
- No connection state on server

**Cons:**
- 30-60s timeout per request → reconnect gaps
- Higher overhead (headers per poll cycle)
- Server must buffer events between polls
- No native reconnection with `Last-Event-ID`

**Verdict:** Rejected — SSE provides superior latency, lower overhead, and native reconnection for the same use case.

### Alternative C: gRPC Server-Side Streaming
**Pros:**
- Strongly typed contracts (protobuf)
- HTTP/2 multiplexing
- Built-in flow control

**Cons:**
- No browser-native client (requires gRPC-Web proxy)
- Adds 100KB+ client bundle
- Over-engineered for dev tool with < 50 clients
- Protobuf compilation step in build pipeline
- No `EventSource`-compatible fallback

**Verdict:** Rejected — gRPC-stream is correct for microservice-to-microservice, but excessive for browser-to-server in a dev tool.

---

## Consequences

### Positive
- **Zero client-side dependencies:** browser `EventSource` is a W3C standard, no npm package needed
- **Auto-reconnection:** exponential backoff (500ms → 30s) with `Last-Event-ID` resume — no message loss
- **Simplified server:** SSE is plain HTTP streaming; no upgrade negotiation, no sticky sessions
- **Rate limiting prevents abuse:** per-run sliding window ensures one noisy agent doesn't flood all clients
- **Secret redaction is defense-in-depth:** even if secrets leak into event data, they're redacted before broadcast
- **Graceful degradation:** rate-limited events are silently dropped; keepalive ensures connection stays alive regardless

### Negative
- **No bidirectional control:** cancel must go through HTTP POST — this is fine for now but limits interactive use cases (e.g., "pause" from the same stream)
- **In-memory only:** `sseClients`, `eventSequences`, and `rateLimitBuckets` are lost on server restart — sequences reset to 0
- **Sequence number dual-delivery is redundant:** both `id:` and `_sequence` serve the same ordering purpose — adds serialization overhead
- **Heartbeat double-delivery:** sending both an SSE event AND raw `:keepalive` comment is wasteful — the comment alone is sufficient per SSE spec
- **Per-run rate limit scope may be insufficient:** if 50 runs each emit 20 events/s, that's 1000 events/s total — could overwhelm the Node.js event loop if broadcasts are expensive
- **Demo endpoint is coupled to SSE infrastructure:** `POST /api/demo/live-run` directly calls `broadcastSSE()` with hardcoded event types — not cleanly separated

### Migration
- To WebSocket: replace `GET /events/stream` handler with `ws://` upgrade, keep `broadcastSSE()` signature but change internal `res.write()` to `ws.send()`, client-side `EventSource` to `WebSocket` with custom reconnect
- To global SSE (replace dashboard polling): add `GET /api/events/stream` (no run ID), broadcast all run state changes, client subscribes to filtered events
- To persisted sequences: store `eventSequences` in SQLite alongside events, rehydrate on restart

---

## Detailed Design Evaluations

### Rate Limiting: Per-Run vs Global

**Chosen: Per-run (20 events/s per run ID)**

**Evaluation:**
Per-run scope is appropriate for this use case. A global limit (e.g., 100 events/s across all runs) would mean one chatty run could starve quieter ones. Per-run ensures each agent's stream is independently throttled.

However, there is **no global backpressure** — if 50 concurrent runs each emit at the cap, the server broadcasts 1000 events/s. This is within Node.js capabilities for simple `res.write()` calls, but the `redactSecrets()` cost scales linearly with payload depth. A future optimization would be a **two-tier limiter**: per-run at 20/s + global at 200/s, with the global limiter dropping lowest-priority events first.

### Sequence Numbers: `_sequence` vs W3C `id:` Field

**Chosen: Both (dual delivery)**

**Evaluation:**
The W3C `id:` field is the browser-native mechanism for `Last-Event-ID` reconnection. It MUST be present. The `_sequence` field in JSON is redundant for browser clients but serves programmatic consumers that may not parse the SSE wire format.

**Recommendation:** Keep `id:` as the canonical sequence source. Make `_sequence` optional — only include it when the `Accept` header or a query parameter indicates a non-browser client. This reduces per-event payload size for the primary use case.

### Heartbeat Design: Dual Emission

```
broadcastSSE(runId, 'heartbeat', { timestamp: ..., type: 'keepalive' });
res.write(':keepalive\n\n');
```

**Evaluation:**
The SSE spec defines comments (lines starting with `:`) as the keepalive mechanism. The `heartbeat` SSE event goes through `broadcastSSE()` which applies rate limiting (exempted), redaction (unnecessary for a timestamp), and sequence increment (wastes a sequence number every 15s). The raw `:keepalive` comment is simpler and has been the standard since SSE was proposed.

**Recommendation:** Keep only the raw `:keepalive` comment for keepalive. Add an optional `heartbeat` event only when there have been zero real events in the last keepalive interval (to confirm the connection is still receiving data). The current dual emission wastes a sequence number every 15 seconds.

---

## Compliance

- [x] Meets evidence-gated progression principle — every event is logged to DB before broadcast
- [x] Meets GitHub Source of Truth principle — SSE is complementary, not a replacement for DB state
- [x] Security reviewed — `redactSecrets()` with 9 patterns, key-name masking, depth/truncation limits
- [ ] Test coverage adequate — **WARNING**: No server-side tests for `broadcastSSE()`, `checkRateLimit()`, `nextSequence()`, or `redactSecrets()`. Only a smoke test exists for the client-side `useSSE` hook. This is a significant gap.
