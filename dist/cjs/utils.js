"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromBase64UUID = exports.toBase64UUID = void 0;
const CCPlus = 43; // "+".charCodeAt(0);
const CCFSlash = 47; // "/".charCodeAt(0);
const CCEqual = 61; // "=".charCodeAt(0);
const CCMinus = 45; // "-".charCodeAt(0);
const CCUnderScore = 95; // "_".charCodeAt(0);
const CC0 = 48; // "0".charCodeAt(0);
const CC9 = 57; // "9".charCodeAt(0);
const CCa_offset10 = 87; // "a".charCodeAt(0) - 10;
const HEXMAP = "0123456789abcdef";
const h = (b, index) => {
    const cc = b.charCodeAt(index);
    return HEXMAP[cc >> 4] + HEXMAP[cc & 15];
};
const hb = (c) => (c <= CC9 ? c - CC0 : c - CCa_offset10);
const b = (h, i) => String.fromCharCode((hb(h.charCodeAt(i)) << 4) | hb(h.charCodeAt(i + 1)));
const toBase64UUID = (u) => {
    const binary = `${b(u, 0)}${b(u, 2)}${b(u, 4)}${b(u, 6)}${b(u, 9)}${b(u, 11)}${b(u, 14)}${b(u, 16)}${b(u, 19)}${b(u, 21)}${b(u, 24)}${b(u, 26)}${b(u, 28)}${b(u, 30)}${b(u, 32)}${b(u, 34)}`;
    const base64 = btoa(binary);
    let base64Url = "";
    let lastI = 0;
    const base64Len = base64.length;
    for (let i = 0; i < base64Len;) {
        const cc = base64.charCodeAt(i);
        switch (cc) {
            case CCPlus:
                base64Url += base64.substring(lastI, i) + "-";
                lastI = ++i;
                break;
            case CCFSlash:
                base64Url += base64.substring(lastI, i) + "_";
                lastI = ++i;
                break;
            case CCEqual:
                base64Url += base64.substring(lastI, i);
                return base64Url;
            default:
                i++;
        }
    }
    if (lastI < base64Len) {
        base64Url += base64.substring(lastI);
    }
    return base64Url;
};
exports.toBase64UUID = toBase64UUID;
const fromBase64UUID = (cuuid) => {
    let base64 = "";
    let lastI = 0;
    const cuuidLen = cuuid.length;
    for (let i = 0; i < cuuidLen;) {
        const cc = cuuid.charCodeAt(i);
        switch (cc) {
            case CCMinus:
                base64 += cuuid.substring(lastI, i) + "+";
                lastI = ++i;
                break;
            case CCUnderScore:
                base64 += cuuid.substring(lastI, i) + "/";
                lastI = ++i;
                break;
            default:
                i++;
        }
    }
    if (lastI < cuuidLen) {
        base64 += cuuid.substring(lastI);
    }
    const b = atob(base64);
    const uuid = `${h(b, 0)}${h(b, 1)}${h(b, 2)}${h(b, 3)}-${h(b, 4)}${h(b, 5)}-${h(b, 6)}${h(b, 7)}-${h(b, 8)}${h(b, 9)}-${h(b, 10)}${h(b, 11)}${h(b, 12)}${h(b, 13)}${h(b, 14)}${h(b, 15)}`;
    return uuid;
};
exports.fromBase64UUID = fromBase64UUID;
//# sourceMappingURL=utils.js.map