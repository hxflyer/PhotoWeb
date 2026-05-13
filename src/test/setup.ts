// Vitest setup: install a real Canvas2D backend (node-canvas) into jsdom so
// pixel-level inspection ("did the brush actually paint a black dot at (100,100)?")
// produces real ImageData. Without this, jsdom returns a no-op stub and every
// pixel reads as 0.

import { createCanvas, ImageData as NodeImageData, type Canvas as NodeCanvas } from 'canvas';

// jsdom doesn't expose ImageData. Tools and adjustments construct
// `new ImageData(arr, w, h)`, so provide node-canvas's compatible class globally.
if (typeof globalThis.ImageData === 'undefined') {
    Object.defineProperty(globalThis, 'ImageData', {
        value: NodeImageData,
        writable: true,
        configurable: true,
    });
}

type AnyCanvas = HTMLCanvasElement & { __nodeCanvas?: NodeCanvas };

function ensureNodeCanvas(el: AnyCanvas): NodeCanvas {
    if (el.__nodeCanvas) return el.__nodeCanvas;
    const w = el.width || 300;
    const h = el.height || 150;
    el.__nodeCanvas = createCanvas(w, h);
    return el.__nodeCanvas;
}

const originalGetContext = HTMLCanvasElement.prototype.getContext;

const ctxPatched = new WeakSet<object>();

function patchCtx(ctx: CanvasRenderingContext2D): CanvasRenderingContext2D {
    if (ctxPatched.has(ctx)) return ctx;
    ctxPatched.add(ctx);
    const originalDrawImage = ctx.drawImage.bind(ctx);
    ctx.drawImage = function patchedDrawImage(this: CanvasRenderingContext2D, image: CanvasImageSource, ...rest: number[]) {
        const imageAsCanvas = image as AnyCanvas;
        // If source is a jsdom canvas without a node-canvas backing, lazily create one.
        if (!imageAsCanvas.__nodeCanvas && typeof imageAsCanvas.getContext === 'function') {
            imageAsCanvas.getContext('2d'); // triggers ensureNodeCanvas via patchedGetContext
        }
        const wrapped = imageAsCanvas.__nodeCanvas ?? image;
        return (originalDrawImage as unknown as (img: CanvasImageSource, ...r: number[]) => void)(wrapped as CanvasImageSource, ...rest);
    } as typeof ctx.drawImage;
    return ctx;
}

HTMLCanvasElement.prototype.getContext = function patchedGetContext(
    this: AnyCanvas,
    contextId: string,
    options?: unknown,
) {
    if (contextId === '2d') {
        const node = ensureNodeCanvas(this);
        if (node.width !== this.width) node.width = this.width;
        if (node.height !== this.height) node.height = this.height;
        const ctx = node.getContext('2d', options as never) as unknown as CanvasRenderingContext2D;
        return patchCtx(ctx);
    }
    return originalGetContext.call(this, contextId, options as never) as never;
} as typeof HTMLCanvasElement.prototype.getContext;

const widthDescriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width');
const heightDescriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'height');

if (widthDescriptor && heightDescriptor) {
    Object.defineProperty(HTMLCanvasElement.prototype, 'width', {
        ...widthDescriptor,
        set(this: AnyCanvas, v: number) {
            widthDescriptor.set?.call(this, v);
            if (this.__nodeCanvas) this.__nodeCanvas.width = v;
        },
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'height', {
        ...heightDescriptor,
        set(this: AnyCanvas, v: number) {
            heightDescriptor.set?.call(this, v);
            if (this.__nodeCanvas) this.__nodeCanvas.height = v;
        },
    });
}

// Node 25 ships a stub `localStorage` global whose `setItem` is not a function.
// That stub shadows jsdom's working Storage, so any code that calls
// `localStorage.setItem` silently fails and reads always return null. Detect a
// broken stub at suite startup and replace it with a real in-memory Storage
// shared between `window` and `globalThis`. Tests that need a clean slate can
// still call `localStorage.clear()`.
(function ensureLocalStorage() {
    function isBroken(s: unknown): boolean {
        try {
            const obj = s as { setItem?: unknown };
            return !obj || typeof obj.setItem !== 'function';
        } catch { return true; }
    }
    const winLS = typeof window !== 'undefined' ? (window as Window & { localStorage?: Storage }).localStorage : undefined;
    if (!isBroken(winLS)) return;
    const store = new Map<string, string>();
    const fake: Storage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => { store.set(k, String(v)); },
        removeItem: (k: string) => { store.delete(k); },
        clear: () => { store.clear(); },
        key: (i: number) => Array.from(store.keys())[i] ?? null,
        get length() { return store.size; },
    };
    if (typeof window !== 'undefined') {
        Object.defineProperty(window, 'localStorage', { value: fake, configurable: true, writable: true });
    }
    Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true, writable: true });
})();

// jsdom doesn't expose Path2D; tests that mount Viewport (which paints
// selection edges via `new Path2D()`) crash without a stub. Several existing
// tests stub locally; provide a minimal global so newer tests don't repeat
// the polyfill.
if (typeof globalThis.Path2D === 'undefined') {
    class StubPath2D {
        moveTo() { /* noop */ }
        lineTo() { /* noop */ }
        closePath() { /* noop */ }
        arc() { /* noop */ }
        rect() { /* noop */ }
        ellipse() { /* noop */ }
        bezierCurveTo() { /* noop */ }
        quadraticCurveTo() { /* noop */ }
        addPath() { /* noop */ }
    }
    Object.defineProperty(globalThis, 'Path2D', { value: StubPath2D, writable: true, configurable: true });
}

// jsdom doesn't ship crypto.randomUUID prior to recent versions; ensure it.
if (typeof crypto !== 'undefined' && !crypto.randomUUID) {
    Object.defineProperty(crypto, 'randomUUID', {
        value: () => {
            const arr = new Uint8Array(16);
            crypto.getRandomValues(arr);
            arr[6] = (arr[6] & 0x0f) | 0x40;
            arr[8] = (arr[8] & 0x3f) | 0x80;
            const hex = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
            return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
        },
        configurable: true,
    });
}
