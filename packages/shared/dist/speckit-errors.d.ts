export declare class SpecKitError extends Error {
    constructor(message: string);
}
export declare class SpecKitNotInstalledError extends SpecKitError {
    constructor();
}
export declare class SpecKitCommandNotAllowedError extends SpecKitError {
    constructor(command: string);
}
export declare class SpecKitCommandFailedError extends SpecKitError {
    readonly command: string;
    readonly exitCode: number;
    readonly stderr: string;
    constructor(command: string, exitCode: number, stderr: string);
}
export declare class SpecKitWorkspaceInvalidError extends SpecKitError {
    constructor(path: string);
}
export declare class SpecKitArtifactNotFoundError extends SpecKitError {
    constructor(kind: string, path: string);
}
export declare class SpecKitTimeoutError extends SpecKitError {
    constructor(command: string, timeoutMs: number);
}
export declare class SpecKitUnsupportedCommandError extends SpecKitError {
    constructor(command: string);
}
//# sourceMappingURL=speckit-errors.d.ts.map