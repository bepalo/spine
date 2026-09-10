export interface DirWalkNode {
    type: string;
    name: string;
    path: string;
    parent: string;
    fullPath: string;
    relativePath: string;
    mtimeMs: number;
}
export declare const toBase64UUID: (u: string) => string;
export declare const fromBase64UUID: (cuuid: string) => string;
export declare function formatDuration(ms: number): string;
export declare const padStr: (str: string, padding: number) => string;
//# sourceMappingURL=utils.d.ts.map