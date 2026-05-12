// Evaluate a simple arithmetic expression for numeric form fields, mirroring
// Photoshop's "math in any number field" behavior. Supported operators:
// + - * / ( ). Plus a trailing percent sign (`50%`) when a `base` is supplied,
// resolved as a percentage of that base.
//
// Designed for tiny user-typed strings, not arbitrary code. The grammar is a
// recursive-descent parser; non-numeric tokens are rejected. NaN/Infinity
// results are surfaced as `null` so callers can fall back to the previous
// value.

export interface NumericExpressionOptions {
    /** When supplied, a literal of the form "<n>%" resolves to (n / 100) * base. */
    base?: number;
}

export function evaluateNumericExpression(
    input: string,
    options: NumericExpressionOptions = {},
): number | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Plain number fast-path. Handles "100", "-3", "1.5e2", "50%".
    const plain = Number(trimmed);
    if (Number.isFinite(plain)) return plain;
    if (trimmed.endsWith('%')) {
        const n = Number(trimmed.slice(0, -1));
        if (Number.isFinite(n) && options.base !== undefined) {
            return (n / 100) * options.base;
        }
        if (Number.isFinite(n) && options.base === undefined) {
            return n;
        }
    }

    // Reject anything outside the supported alphabet.
    if (!/^[\d+\-*/().\s%]+$/.test(trimmed)) return null;

    let i = 0;
    const src = trimmed;

    function skip() { while (i < src.length && /\s/.test(src[i])) i++; }

    function parseNumber(): number | null {
        skip();
        const start = i;
        while (i < src.length && /[0-9.]/.test(src[i])) i++;
        if (i === start) return null;
        const raw = src.slice(start, i);
        const num = Number(raw);
        if (!Number.isFinite(num)) return null;
        skip();
        if (src[i] === '%') {
            i++;
            if (options.base === undefined) return num;
            return (num / 100) * options.base;
        }
        return num;
    }

    function parseFactor(): number | null {
        skip();
        if (src[i] === '(') {
            i++;
            const v = parseExpr();
            skip();
            if (src[i] !== ')') return null;
            i++;
            return v;
        }
        if (src[i] === '+' || src[i] === '-') {
            const sign = src[i] === '-' ? -1 : 1;
            i++;
            const v = parseFactor();
            return v === null ? null : sign * v;
        }
        return parseNumber();
    }

    function parseTerm(): number | null {
        let left = parseFactor();
        if (left === null) return null;
        skip();
        while (src[i] === '*' || src[i] === '/') {
            const op = src[i++];
            const right = parseFactor();
            if (right === null) return null;
            if (op === '/') {
                if (right === 0) return null;
                left = left / right;
            } else {
                left = left * right;
            }
            skip();
        }
        return left;
    }

    function parseExpr(): number | null {
        let left = parseTerm();
        if (left === null) return null;
        skip();
        while (src[i] === '+' || src[i] === '-') {
            const op = src[i++];
            const right = parseTerm();
            if (right === null) return null;
            left = op === '+' ? left + right : left - right;
            skip();
        }
        return left;
    }

    const result = parseExpr();
    skip();
    if (i !== src.length) return null;
    if (result === null || !Number.isFinite(result)) return null;
    return result;
}
