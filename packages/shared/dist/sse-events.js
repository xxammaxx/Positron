// Positron — Shared SSE Event Types (Issue #66)
// Central source of truth for all Server-Sent Events used across
// the backend (broadcaster) and frontend (useSSE hook).
//
// Always use these constants instead of hardcoded strings.
/** All SSE event types used by Positron */
export const SSE_EVENTS = {
    /** Initial state sent on connection */
    INITIAL: 'initial',
    /** New run event (log entry, phase transition) */
    RUN_EVENT: 'run-event',
    /** Run metadata update (phase, status, branch) */
    RUN_UPDATE: 'run-update',
    /** Control action (pause/resume/abort) */
    RUN_CONTROL: 'run-control',
    /** Run completed normally */
    RUN_COMPLETE: 'run-complete',
    /** New evidence artifact created */
    RUN_EVIDENCE_CREATED: 'run-evidence-created',
    /** Run cancelled by user */
    RUN_CANCELLED: 'run-cancelled',
    /** Heartbeat keepalive (15s interval) */
    HEARTBEAT: 'heartbeat',
};
/** Check if a string is a valid SSE event type */
export function isValidSSEEventType(event) {
    return Object.values(SSE_EVENTS).includes(event);
}
//# sourceMappingURL=sse-events.js.map