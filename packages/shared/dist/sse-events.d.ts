/** All SSE event types used by Positron */
export declare const SSE_EVENTS: {
    /** Initial state sent on connection */
    readonly INITIAL: "initial";
    /** New run event (log entry, phase transition) */
    readonly RUN_EVENT: "run-event";
    /** Run metadata update (phase, status, branch) */
    readonly RUN_UPDATE: "run-update";
    /** Control action (pause/resume/abort) */
    readonly RUN_CONTROL: "run-control";
    /** Run completed normally */
    readonly RUN_COMPLETE: "run-complete";
    /** New evidence artifact created */
    readonly RUN_EVIDENCE_CREATED: "run-evidence-created";
    /** Run cancelled by user */
    readonly RUN_CANCELLED: "run-cancelled";
    /** Heartbeat keepalive (15s interval) */
    readonly HEARTBEAT: "heartbeat";
};
/** Union type of all SSE event values */
export type SSEEventType = (typeof SSE_EVENTS)[keyof typeof SSE_EVENTS];
/** Check if a string is a valid SSE event type */
export declare function isValidSSEEventType(event: string): event is SSEEventType;
//# sourceMappingURL=sse-events.d.ts.map