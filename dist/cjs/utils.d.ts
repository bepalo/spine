export interface DirWalkNode {
    type: string;
    name: string;
    path: string;
    parent: string;
    fullPath: string;
    relativePath: string;
}
export declare const toBase64UUID: (u: string) => string;
export declare const fromBase64UUID: (cuuid: string) => string;
//# sourceMappingURL=utils.d.ts.map