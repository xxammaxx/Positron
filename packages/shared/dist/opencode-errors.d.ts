export declare class OpenCodeError extends Error {
    constructor(message: string);
}
export declare class OpenCodeNotInstalledError extends OpenCodeError {
    constructor();
}
export declare class OpenCodeCommandNotAllowedError extends OpenCodeError {
    constructor(command: string);
}
export declare class OpenCodeCommandFailedError extends OpenCodeError {
    readonly command: string;
    readonly exitCode: number;
    readonly stderr: string;
    constructor(command: string, exitCode: number, stderr: string);
}
export declare class OpenCodeWorkspaceInvalidError extends OpenCodeError {
    constructor(path: string);
}
export declare class OpenCodeTimeoutError extends OpenCodeError {
    constructor(command: string, timeoutMs: number);
}
export declare class OpenCodeUnsupportedCommandError extends OpenCodeError {
    constructor(command: string);
}
//# sourceMappingURL=opencode-errors.d.ts.map