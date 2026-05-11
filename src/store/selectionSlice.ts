import type { StateCreator } from 'zustand';
import type { EditorStore, RefineEdgeOptions, SavedSelection, SelectionMode, SelectionSlice, SelectionOperation } from './types';
import { rasterizeSelectionOperations as rasterizeSelection } from '../utils/selectionUtils';

function blurMask(mask: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
    const r = Math.max(1, Math.round(radius));
    const tmp = new Float32Array(width * height);
    const out = new Uint8ClampedArray(width * height);
    // Two-pass box blur as a fast Gaussian approximation.
    for (let y = 0; y < height; y++) {
        let sum = 0;
        for (let i = -r; i <= r; i++) sum += mask[y * width + Math.max(0, Math.min(width - 1, i))];
        for (let x = 0; x < width; x++) {
            tmp[y * width + x] = sum / (2 * r + 1);
            const xLeft = x - r;
            const xRight = x + r + 1;
            sum -= mask[y * width + Math.max(0, Math.min(width - 1, xLeft))];
            sum += mask[y * width + Math.max(0, Math.min(width - 1, xRight))];
        }
    }
    for (let x = 0; x < width; x++) {
        let sum = 0;
        for (let i = -r; i <= r; i++) sum += tmp[Math.max(0, Math.min(height - 1, i)) * width + x];
        for (let y = 0; y < height; y++) {
            out[y * width + x] = Math.round(sum / (2 * r + 1));
            const yTop = y - r;
            const yBot = y + r + 1;
            sum -= tmp[Math.max(0, Math.min(height - 1, yTop)) * width + x];
            sum += tmp[Math.max(0, Math.min(height - 1, yBot)) * width + x];
        }
    }
    return out;
}

function applyContrast(mask: Uint8ClampedArray, contrast: number): Uint8ClampedArray {
    if (contrast <= 0) return mask;
    // contrast 0 -> identity, 100 -> hard threshold at 0.5.
    const k = contrast / 100;
    const out = new Uint8ClampedArray(mask.length);
    for (let i = 0; i < mask.length; i++) {
        const v = mask[i] / 255;
        // Smoothstep-like remap toward a step at 0.5; k blends between identity and step.
        const stepped = v < 0.5 ? 0 : 1;
        const blended = v * (1 - k) + stepped * k;
        out[i] = Math.round(blended * 255);
    }
    return out;
}

function dilateMask(mask: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
    if (radius <= 0) return new Uint8ClampedArray(mask);
    // Iterative 4-neighbor dilation: each step grows the selection by 1px.
    // Repeat `radius` times. Cheap, deterministic, and good enough for the
    // radii users actually pick (typical 1..32 px).
    let cur = new Uint8ClampedArray(mask);
    for (let step = 0; step < radius; step++) {
        const next = new Uint8ClampedArray(cur.length);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (cur[idx] >= 128) { next[idx] = 255; continue; }
                if ((x > 0 && cur[idx - 1] >= 128)
                    || (x < width - 1 && cur[idx + 1] >= 128)
                    || (y > 0 && cur[idx - width] >= 128)
                    || (y < height - 1 && cur[idx + width] >= 128)) {
                    next[idx] = 255;
                }
            }
        }
        cur = next;
    }
    return cur;
}

function erodeMask(mask: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
    if (radius <= 0) return new Uint8ClampedArray(mask);
    // Erode = dilate the inverse, then invert.
    const inverted = new Uint8ClampedArray(mask.length);
    for (let i = 0; i < mask.length; i++) inverted[i] = 255 - mask[i];
    const dilated = dilateMask(inverted, width, height, radius);
    const out = new Uint8ClampedArray(mask.length);
    for (let i = 0; i < mask.length; i++) out[i] = 255 - dilated[i];
    return out;
}

function medianMask(mask: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
    const r = Math.max(1, radius);
    const out = new Uint8ClampedArray(mask.length);
    const window: number[] = [];
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            window.length = 0;
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    const sx = Math.max(0, Math.min(width - 1, x + dx));
                    const sy = Math.max(0, Math.min(height - 1, y + dy));
                    window.push(mask[sy * width + sx]);
                }
            }
            window.sort((a, b) => a - b);
            out[y * width + x] = window[(window.length / 2) | 0];
        }
    }
    return out;
}

function smoothMask(mask: Uint8ClampedArray, width: number, height: number, smooth: number): Uint8ClampedArray {
    if (smooth <= 0) return mask;
    // Median filter at the requested radius (mapped from smooth percentage to 1..6 px).
    const r = Math.max(1, Math.round(smooth / 20));
    const out = new Uint8ClampedArray(mask.length);
    const window: number[] = [];
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            window.length = 0;
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    const sx = Math.max(0, Math.min(width - 1, x + dx));
                    const sy = Math.max(0, Math.min(height - 1, y + dy));
                    window.push(mask[sy * width + sx]);
                }
            }
            window.sort((a, b) => a - b);
            out[y * width + x] = window[(window.length / 2) | 0];
        }
    }
    return out;
}

export const createSelectionSlice: StateCreator<EditorStore, [], [], SelectionSlice> = (set, get) => ({
    selection: {
        hasSelection: false,
        mode: 'rect',
        path: [],
        polyPoints: [],
        operations: [],
        isDraggingSelection: false,
        feather: 0,
        isFreeEditMode: false,
    },
    savedSelections: [],

    setSelectionMode: (mode) => set(state => ({ selection: { ...state.selection, mode } })),
    setSelectionPath: (path) => set(state => ({ selection: { ...state.selection, path } })),
    setSelectionOperations: (ops) => get().executeDocumentCommand({
        kind: 'selection',
        label: 'Set Selection',
        affectedIds: ['selection'],
        run: () => set(state => ({ selection: { ...state.selection, operations: ops, hasSelection: ops.length > 0 } })),
    }),
    addSelectionOperation: (op) => get().executeDocumentCommand({
        kind: 'selection',
        label: 'Add Selection',
        affectedIds: ['selection'],
        run: () => set(state => ({
        selection: { ...state.selection, operations: [...state.selection.operations, op] },
        })),
    }),
    setHasSelection: (has) => set(state => ({ selection: { ...state.selection, hasSelection: has } })),
    setIsDraggingSelection: (is) => set(state => ({ selection: { ...state.selection, isDraggingSelection: is } })),
    clearSelection: () => get().executeDocumentCommand({
        kind: 'selection',
        label: 'Deselect',
        affectedIds: ['selection'],
        run: () => set(state => ({
        selection: {
            ...state.selection,
            hasSelection: false,
            path: [],
            polyPoints: [],
            operations: [],
            isDraggingSelection: false,
            feather: 0,
        },
        })),
    }),
    toggleInvertSelection: () => get().executeDocumentCommand({
        kind: 'selection',
        label: 'Inverse Selection',
        affectedIds: ['selection'],
        run: () => set((state) => {
        const { width, height } = state;
        // Use the actual canvas bounds (no arbitrary padding) so inverse on
        // 4K+ canvases stays inside the document instead of running past it.
        const fullCanvasOp = {
            mode: 'add' as const,
            type: 'rect' as SelectionMode,
            path: [{ x: 0, y: 0 }, { x: width, y: height }],
        };

        if (!state.selection.hasSelection && state.selection.operations.length === 0) {
            return {
                selection: {
                    ...state.selection,
                    hasSelection: true,
                    operations: [fullCanvasOp],
                },
            };
        }

        const invertedOps = state.selection.operations.map(op => ({
            ...op,
            mode: (op.mode === 'add' ? 'sub' : 'add') as 'add' | 'sub',
        }));

        if (state.selection.path.length > 0) {
            invertedOps.push({
                mode: 'sub' as const,
                type: state.selection.mode,
                path: state.selection.path,
            });
        }

        return {
            selection: {
                ...state.selection,
                hasSelection: true,
                path: [],
                operations: [fullCanvasOp, ...invertedOps],
            },
        };
        }),
    }),
    setSelectionFeather: (radius) => set(state => ({ selection: { ...state.selection, feather: radius } })),
    setFreeEditMode: (mode) => set(state => ({ selection: { ...state.selection, isFreeEditMode: mode } })),
    setPolyPoints: (points) => set(state => ({ selection: { ...state.selection, polyPoints: points } })),

    expandSelection: (px) => get().executeDocumentCommand({
        kind: 'selection',
        label: 'Expand Selection',
        affectedIds: ['selection'],
        run: () => set(state => {
        if (!state.selection.hasSelection) return state;
        const { width, height } = state;
        const mask = rasterizeSelection(state.selection.operations, width, height);
        const expanded = dilateMask(mask, width, height, Math.max(0, Math.round(px)));
        return {
            selection: {
                ...state.selection,
                path: [],
                operations: [{ mode: 'add', type: 'lasso', path: [], mask: { data: expanded, width, height } }],
                hasSelection: true,
            },
        };
        }),
    }),

    contractSelection: (px) => get().executeDocumentCommand({
        kind: 'selection',
        label: 'Contract Selection',
        affectedIds: ['selection'],
        run: () => set(state => {
        if (!state.selection.hasSelection) return state;
        const { width, height } = state;
        const mask = rasterizeSelection(state.selection.operations, width, height);
        const contracted = erodeMask(mask, width, height, Math.max(0, Math.round(px)));
        return {
            selection: {
                ...state.selection,
                path: [],
                operations: [{ mode: 'add', type: 'lasso', path: [], mask: { data: contracted, width, height } }],
                hasSelection: true,
            },
        };
        }),
    }),

    smoothSelection: () => get().executeDocumentCommand({
        kind: 'selection',
        label: 'Smooth Selection',
        affectedIds: ['selection'],
        run: () => set(state => {
        if (!state.selection.hasSelection) return state;
        const { width, height } = state;
        const mask = rasterizeSelection(state.selection.operations, width, height);
        const smoothed = medianMask(mask, width, height, 2);
        return {
            selection: {
                ...state.selection,
                path: [],
                operations: [{ mode: 'add', type: 'lasso', path: [], mask: { data: smoothed, width, height } }],
                hasSelection: true,
            },
        };
        }),
    }),

    borderSelection: (width) => get().executeDocumentCommand({
        kind: 'selection',
        label: 'Border Selection',
        affectedIds: ['selection'],
        run: () => set(state => {
        if (!state.selection.hasSelection) return state;
        // Border = outer expand + inner subtract
        const outerOp = {
            mode: 'add' as const,
            type: 'rect' as SelectionMode,
            path: [] as { x: number; y: number }[],
            expandBy: width,
        } as { mode: 'add' | 'sub'; path: { x: number; y: number }[]; type: SelectionMode };
        const innerOp = {
            mode: 'sub' as const,
            type: 'rect' as SelectionMode,
            path: [] as { x: number; y: number }[],
            contractBy: width,
        } as { mode: 'add' | 'sub'; path: { x: number; y: number }[]; type: SelectionMode };
        return {
            selection: {
                ...state.selection,
                operations: [...state.selection.operations, outerOp, innerOp],
            },
        };
        }),
    }),

    refineEdge: (opts: RefineEdgeOptions) => get().executeDocumentCommand({
        kind: 'selection',
        label: 'Refine Edge',
        affectedIds: ['selection'],
        run: () => set(state => {
            if (!state.selection.hasSelection) return state;
            const { width, height } = state;
            let mask = rasterizeSelection(state.selection.operations, width, height);
            if (opts.shiftEdge !== 0) {
                const px = Math.round(Math.abs(opts.shiftEdge) * 0.5);
                if (px > 0) mask = blurMask(mask, width, height, px);
                // Threshold for shift: positive expands, negative contracts.
                const threshold = opts.shiftEdge > 0 ? 64 : 192;
                for (let i = 0; i < mask.length; i++) mask[i] = mask[i] >= threshold ? 255 : 0;
            }
            if (opts.radius > 0) mask = blurMask(mask, width, height, opts.radius);
            if (opts.smooth > 0) mask = smoothMask(mask, width, height, opts.smooth);
            if (opts.contrast > 0) mask = applyContrast(mask, opts.contrast);
            const refined: SelectionOperation = {
                mode: 'add',
                type: 'lasso',
                path: [],
                mask: { data: mask, width, height },
            };
            return {
                selection: {
                    ...state.selection,
                    feather: opts.feather,
                    path: [],
                    operations: [refined],
                    hasSelection: true,
                },
            };
        }),
    }),

    saveSelection: (name) => set(state => {
        const saved: SavedSelection = {
            name,
            ops: [...state.selection.operations],
        };
        const existing = state.savedSelections.findIndex(s => s.name === name);
        const next = [...state.savedSelections];
        if (existing >= 0) next[existing] = saved;
        else next.push(saved);
        return { savedSelections: next };
    }),

    loadSelection: (name, mode = 'replace') => get().executeDocumentCommand({
        kind: 'selection',
        label: 'Load Selection',
        affectedIds: ['selection'],
        run: () => set(state => {
        const saved = state.savedSelections.find(s => s.name === name);
        if (!saved) return state;
        const cloneOps = (ops: SelectionOperation[]): SelectionOperation[] => ops.map(op => ({
            ...op,
            path: op.path.map(p => ({ ...p })),
            mask: op.mask ? { width: op.mask.width, height: op.mask.height, data: new Uint8ClampedArray(op.mask.data) } : undefined,
        }));
        if (mode === 'replace' || !state.selection.hasSelection) {
            return {
                selection: {
                    ...state.selection,
                    hasSelection: saved.ops.length > 0,
                    operations: cloneOps(saved.ops),
                },
            };
        }
        if (mode === 'add') {
            // Append every saved op as 'add'.
            const additional = cloneOps(saved.ops).map(op => ({ ...op, mode: 'add' as const }));
            return {
                selection: {
                    ...state.selection,
                    operations: [...state.selection.operations, ...additional],
                    hasSelection: true,
                },
            };
        }
        if (mode === 'sub') {
            const subtractive = cloneOps(saved.ops).map(op => ({ ...op, mode: 'sub' as const }));
            return {
                selection: {
                    ...state.selection,
                    operations: [...state.selection.operations, ...subtractive],
                    hasSelection: true,
                },
            };
        }
        // intersect: use rasterize-AND via the existing helper. Inline-implement
        // the AND so we don't pull in selectionModifiers (avoiding a cycle).
        const { width, height } = state;
        const rasterize = (ops: SelectionOperation[]): Uint8ClampedArray => {
            const c = document.createElement('canvas');
            c.width = width; c.height = height;
            const ctx = c.getContext('2d');
            if (!ctx) return new Uint8ClampedArray(width * height);
            ctx.fillStyle = '#fff';
            for (const op of ops) {
                ctx.globalCompositeOperation = op.mode === 'add' ? 'source-over' : 'destination-out';
                if (op.mask) {
                    const tmp = document.createElement('canvas');
                    tmp.width = op.mask.width; tmp.height = op.mask.height;
                    const tctx = tmp.getContext('2d');
                    if (!tctx) continue;
                    const img = tctx.createImageData(op.mask.width, op.mask.height);
                    for (let i = 0; i < op.mask.data.length; i++) {
                        img.data[i * 4] = 255; img.data[i * 4 + 1] = 255; img.data[i * 4 + 2] = 255;
                        img.data[i * 4 + 3] = op.mask.data[i];
                    }
                    tctx.putImageData(img, 0, 0);
                    ctx.drawImage(tmp, 0, 0);
                } else if (op.path.length >= 2) {
                    ctx.beginPath();
                    if (op.type === 'rect') {
                        ctx.rect(op.path[0].x, op.path[0].y, op.path[1].x - op.path[0].x, op.path[1].y - op.path[0].y);
                    } else if (op.type === 'circle') {
                        const cx = (op.path[0].x + op.path[1].x) / 2;
                        const cy = (op.path[0].y + op.path[1].y) / 2;
                        ctx.ellipse(cx, cy, Math.abs(op.path[1].x - op.path[0].x) / 2, Math.abs(op.path[1].y - op.path[0].y) / 2, 0, 0, Math.PI * 2);
                    } else {
                        ctx.moveTo(op.path[0].x, op.path[0].y);
                        for (let i = 1; i < op.path.length; i++) ctx.lineTo(op.path[i].x, op.path[i].y);
                        ctx.closePath();
                    }
                    ctx.fill();
                }
            }
            const data = ctx.getImageData(0, 0, width, height);
            const out = new Uint8ClampedArray(width * height);
            for (let i = 0; i < out.length; i++) out[i] = data.data[i * 4 + 3];
            return out;
        };
        const a = rasterize(state.selection.operations);
        const b = rasterize(cloneOps(saved.ops));
        const out = new Uint8ClampedArray(width * height);
        let any = false;
        for (let i = 0; i < out.length; i++) {
            out[i] = Math.min(a[i], b[i]);
            if (out[i] > 0) any = true;
        }
        return {
            selection: {
                ...state.selection,
                hasSelection: any,
                path: [],
                operations: any ? [{ mode: 'add', type: 'lasso', path: [], mask: { data: out, width, height } }] : [],
            },
        };
        }),
    }),

    pathToSelection: () => {
        // Convert the active pen path to a polygon selection
        // The pen path is stored in the tools registry / pen tool state.
        // For now, read from toolsSlice penPath if available.
        const store = get();
        // Get pen tool state
        const { getTool } = store as unknown as { getTool?: (id: string) => { getPath?: () => { x: number; y: number }[] } };
        const path = getTool?.('pen')?.getPath?.() ?? [];
        if (path.length < 3) return;
        set(state => ({
            selection: {
                ...state.selection,
                hasSelection: true,
                mode: 'lasso',
                operations: [
                    ...state.selection.operations,
                    { mode: 'add' as const, type: 'lasso' as SelectionMode, path },
                ],
            },
        }));
    },

    selectionToPath: () => {
        // Convert selection outline to pen path — stored on the tools slice
        // This is a foundation stub; the actual path rendering is in pen.ts
        const state = get();
        if (!state.selection.hasSelection || state.selection.operations.length === 0) return;
        // Extract the last add op's path and store in a well-known place
        const lastAddOp = [...state.selection.operations].reverse().find(op => op.mode === 'add');
        if (!lastAddOp || lastAddOp.path.length === 0) return;
        // Signal is stored on window for pen tool to pick up (non-React boundary)
        (window as unknown as Record<string, unknown>).__selectionAsPath = lastAddOp.path;
    },
});
