import type { StateCreator } from 'zustand';
import type { DocumentSlice, EditorStore } from './types';
import {
    rotateCanvas as rotateCanvasHelper,
    rotateCanvasInPlace,
    flipCanvas as flipCanvasHelper,
    resampleCanvas,
    resizeCanvasWithAnchor,
    computeTrimRect,
    cropCanvas,
    type ResampleMethod,
    type FlipAxis,
    type TrimBasis,
} from '../core/imageTransforms';
import { saveDocument, loadDocument } from '../core/persistence';
import { Layer as LayerClass } from '../core/Layer';

function copyCanvasContent(dst: HTMLCanvasElement, src: HTMLCanvasElement): void {
    dst.width = src.width;
    dst.height = src.height;
    const ctx = dst.getContext('2d')!;
    ctx.clearRect(0, 0, dst.width, dst.height);
    ctx.drawImage(src, 0, 0);
}

// STAB-03: Browser-friendly raster ceiling. 60 MP (~7745x7745 RGBA = ~240MB
// for a single full-frame layer) is the upper limit before the typical desktop
// Chrome / Safari tab risks an out-of-memory crash during a getImageData /
// drawImage round-trip across multiple layers. Photoshop's PSB ceiling is
// 30,000x30,000 (~900MP), but that's a native, tile-paged engine — browsers
// must keep the entire ImageData in a contiguous ArrayBuffer.
export const MAX_DOC_PIXELS = 60_000_000;
// Soft threshold (60% of MAX): we still allow it, but ask the user to confirm
// before the allocation, since once-allocated, undo/transform overhead doubles
// the working set quickly.
export const SOFT_DOC_PIXELS = Math.floor(MAX_DOC_PIXELS * 0.6);

interface MemoryConfirmDeps {
    confirm?: (msg: string) => boolean;
}

// Indirection so tests can stub. window.confirm is the only browser primitive
// available without bringing a modal library into the new-document path.
function defaultConfirm(msg: string): boolean {
    if (typeof window === 'undefined' || typeof window.confirm !== 'function') return false;
    return window.confirm(msg);
}

function guardDocumentSize(
    w: number,
    h: number,
    reportError: (channel: import('./types').ToastErrorChannel, message: string, type?: import('./types').Toast['type']) => void,
    deps: MemoryConfirmDeps = {},
): boolean {
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1) {
        reportError('save', `Could not create document: invalid dimensions ${w}×${h}.`, 'error');
        return false;
    }
    const px = w * h;
    if (px > MAX_DOC_PIXELS) {
        const mp = (px / 1_000_000).toFixed(1);
        const limitMp = (MAX_DOC_PIXELS / 1_000_000).toFixed(0);
        reportError(
            'save',
            `Document size ${mp} megapixels exceeds the browser limit of ${limitMp} MP. Reduce width or height.`,
            'error',
        );
        return false;
    }
    if (px > SOFT_DOC_PIXELS) {
        const mp = (px / 1_000_000).toFixed(1);
        const confirmFn = deps.confirm ?? defaultConfirm;
        const ok = confirmFn(
            `This document is ${mp} megapixels. Large canvases may slow editing or fail to allocate. Continue?`,
        );
        if (!ok) return false;
    }
    return true;
}

function selectionBounds(selection: import('./types').SelectionState, width: number, height: number): { x: number; y: number; width: number; height: number } | null {
    if (!selection.hasSelection || selection.operations.length === 0) return null;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    for (const op of selection.operations) {
        if (op.mask) {
            for (let y = 0; y < op.mask.height; y++) {
                for (let x = 0; x < op.mask.width; x++) {
                    if (op.mask.data[y * op.mask.width + x] === 0) continue;
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x + 1);
                    maxY = Math.max(maxY, y + 1);
                }
            }
        } else {
            for (const p of op.path) {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            }
        }
    }
    minX = Math.max(0, Math.floor(minX));
    minY = Math.max(0, Math.floor(minY));
    maxX = Math.min(width, Math.ceil(maxX));
    maxY = Math.min(height, Math.ceil(maxY));
    if (maxX <= minX || maxY <= minY) return null;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export const createDocumentSlice: StateCreator<EditorStore, [], [], DocumentSlice> = (set, get) => ({
    width: 800,
    height: 600,
    resolution: 72,
    hasAutosave: false,
    documentName: 'Untitled',
    isDirty: false,
    lastSavedHistoryTick: 0,
    globalLight: { angle: 120, altitude: 30 },
    clipboardImageInfo: null,

    setGlobalLight: (light) => {
        const a = Number.isFinite(light.angle) ? light.angle : 120;
        const alt = Number.isFinite(light.altitude) ? Math.max(0, Math.min(90, light.altitude)) : 30;
        set({ globalLight: { angle: ((a % 360) + 360) % 360, altitude: alt } });
        const { layers } = get();
        for (const layer of layers) {
            if (!layer.effects) continue;
            let touched = false;
            for (const e of layer.effects) {
                if (e.params?.useGlobalLight) {
                    touched = true;
                    layer.markDirty(null);
                    break;
                }
            }
            if (touched) {
                // re-render is signalled by markDirty; no parameter rewriting needed
                // because effects read globalLight via context at apply time.
                // We still flush the layers reference so React re-renders.
            }
        }
        set({ layers: [...get().layers] });
    },

    setCanvasSize: (width, height) => get().executeDocumentCommand({
        kind: 'transform',
        label: 'Canvas Size',
        run: () => {
        const { layers } = get();
        layers.forEach(layer => {
            const temp = document.createElement('canvas');
            temp.width = layer.canvas.width;
            temp.height = layer.canvas.height;
            temp.getContext('2d')?.drawImage(layer.canvas, 0, 0);
            layer.canvas.width = width;
            layer.canvas.height = height;
            layer.ctx.drawImage(temp, 0, 0);
            layer.markDirty(null);
        });
        set({ width, height });
        },
    }),

    rotateCanvas: (degrees) => get().executeDocumentCommand({
        kind: 'transform',
        label: `Rotate Canvas ${degrees}°`,
        run: () => {
        const { layers } = get();
        let newW = 0, newH = 0;
        layers.forEach(layer => {
            const result = rotateCanvasHelper(layer.canvas, degrees);
            copyCanvasContent(layer.canvas, result);
            layer.markDirty(null);
            newW = result.width;
            newH = result.height;
        });
        if (newW > 0) set({ width: newW, height: newH });
        },
    }),

    flipCanvas: (axis: FlipAxis) => get().executeDocumentCommand({
        kind: 'transform',
        label: `Flip Canvas ${axis === 'horizontal' ? 'Horizontal' : 'Vertical'}`,
        run: () => {
        const { layers } = get();
        layers.forEach(layer => {
            const result = flipCanvasHelper(layer.canvas, axis);
            copyCanvasContent(layer.canvas, result);
            layer.markDirty(null);
        });
        },
    }),

    straightenActiveLayer: (degrees) => {
        if (!Number.isFinite(degrees) || Math.abs(degrees) < 0.0001) return;
        const { activeLayerId, layers } = get();
        const layer = layers.find(l => l.id === activeLayerId);
        if (!layer) return;
        get().executeDocumentCommand({
            kind: 'transform',
            label: 'Straighten Layer',
            layerId: layer.id,
            run: () => {
                const active = get().layers.find(l => l.id === layer.id);
                if (!active) return;
                const result = rotateCanvasInPlace(active.canvas, degrees);
                copyCanvasContent(active.canvas, result);
                active.markDirty(null);
                set({ layers: [...get().layers] });
            },
        });
    },

    resizeImage: (newW, newH, method: ResampleMethod, resolution, resample = true) => {
        if (!guardDocumentSize(newW, newH, get().reportError)) return;
        const nextResolution = Number.isFinite(resolution) && resolution !== undefined && resolution > 0
            ? resolution
            : get().resolution;
        const beforeState = get();
        const beforeSnapshots = beforeState.layers.map(l => {
            const tmp = document.createElement('canvas');
            tmp.width = l.canvas.width; tmp.height = l.canvas.height;
            tmp.getContext('2d')?.drawImage(l.canvas, 0, 0);
            return { id: l.id, canvas: tmp };
        });
        try {
            get().executeDocumentCommand({
                kind: 'transform',
                label: 'Image Size',
                run: () => {
                    const { layers } = get();
                    if (resample) {
                        layers.forEach(layer => {
                            const result = resampleCanvas(layer.canvas, newW, newH, method);
                            copyCanvasContent(layer.canvas, result);
                            layer.markDirty(null);
                        });
                    }
                    set({ width: newW, height: newH, resolution: nextResolution });
                },
            });
        } catch (err) {
            // STAB-03: roll back if a layer-canvas allocation throws.
            beforeState.layers.forEach(layer => {
                const snap = beforeSnapshots.find(s => s.id === layer.id);
                if (!snap) return;
                layer.canvas.width = snap.canvas.width;
                layer.canvas.height = snap.canvas.height;
                layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
                layer.ctx.drawImage(snap.canvas, 0, 0);
                layer.markDirty(null);
            });
            set({ width: beforeState.width, height: beforeState.height, resolution: beforeState.resolution });
            get().reportError('save', `Image size failed: ${(err as Error)?.message ?? 'allocation error'}.`, 'error');
        }
    },

    resizeCanvas: (newW, newH, anchorX, anchorY, extensionColor) => {
        if (!guardDocumentSize(newW, newH, get().reportError)) return;
        const beforeState = get();
        const beforeSnapshots = beforeState.layers.map(l => {
            const tmp = document.createElement('canvas');
            tmp.width = l.canvas.width; tmp.height = l.canvas.height;
            tmp.getContext('2d')?.drawImage(l.canvas, 0, 0);
            return { id: l.id, canvas: tmp };
        });
        try {
            get().executeDocumentCommand({
                kind: 'transform',
                label: 'Canvas Size',
                run: () => {
                    const { layers } = get();
                    layers.forEach(layer => {
                        const result = resizeCanvasWithAnchor(layer.canvas, newW, newH, anchorX, anchorY, extensionColor);
                        copyCanvasContent(layer.canvas, result);
                        layer.markDirty(null);
                    });
                    set({ width: newW, height: newH });
                },
            });
        } catch (err) {
            beforeState.layers.forEach(layer => {
                const snap = beforeSnapshots.find(s => s.id === layer.id);
                if (!snap) return;
                layer.canvas.width = snap.canvas.width;
                layer.canvas.height = snap.canvas.height;
                layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
                layer.ctx.drawImage(snap.canvas, 0, 0);
                layer.markDirty(null);
            });
            set({ width: beforeState.width, height: beforeState.height });
            get().reportError('save', `Canvas size failed: ${(err as Error)?.message ?? 'allocation error'}.`, 'error');
        }
    },

    cropToSelection: () => {
        const state = get();
        const rect = selectionBounds(state.selection, state.width, state.height);
        if (!rect) return;
        if (!guardDocumentSize(rect.width, rect.height, get().reportError)) return;
        get().executeDocumentCommand({
            kind: 'transform',
            label: 'Crop',
            run: () => {
                const { layers } = get();
                layers.forEach(layer => {
                    const tmp = document.createElement('canvas');
                    tmp.width = rect.width;
                    tmp.height = rect.height;
                    const tctx = tmp.getContext('2d');
                    if (!tctx) return;
                    tctx.drawImage(layer.canvas, -rect.x, -rect.y);
                    layer.canvas.width = rect.width;
                    layer.canvas.height = rect.height;
                    layer.ctx.drawImage(tmp, 0, 0);
                    layer.markDirty(null);
                });
                set({
                    width: rect.width,
                    height: rect.height,
                    selection: {
                        ...get().selection,
                        hasSelection: false,
                        path: [],
                        polyPoints: [],
                        operations: [],
                        isDraggingSelection: false,
                    },
                });
            },
        });
    },

    trimCanvas: (basis: TrimBasis, sides) => get().executeDocumentCommand({
        kind: 'transform',
        label: 'Trim',
        run: () => {
        const { layers, width, height } = get();
        if (layers.length === 0) return;
        const visibleLayer = layers.find(l => l.visible) ?? layers[0];
        const combined = document.createElement('canvas');
        combined.width = width;
        combined.height = height;
        const ctx = combined.getContext('2d')!;
        layers.forEach(l => { if (l.visible) ctx.drawImage(l.canvas, 0, 0); });
        const rect = computeTrimRect(combined, basis, sides);
        layers.forEach(layer => {
            const result = cropCanvas(layer.canvas, rect);
            copyCanvasContent(layer.canvas, result);
            layer.markDirty(null);
        });
        void visibleLayer;
        set({ width: rect.width, height: rect.height });
        },
    }),

    newDocument: (w, h, bg, name, resolution) => {
        if (!guardDocumentSize(w, h, get().reportError)) return false;
        const nextResolution = Number.isFinite(resolution) && resolution !== undefined && resolution > 0 ? resolution : 72;
        let newLayer: LayerClass;
        try {
            newLayer = new LayerClass(w, h, 'Background');
            if (bg !== 'transparent') {
                newLayer.ctx.fillStyle = bg;
                newLayer.ctx.fillRect(0, 0, w, h);
            }
            newLayer.markDirty(null);
        } catch (err) {
            get().reportError('save', `Could not allocate canvas: ${(err as Error)?.message ?? 'unknown error'}.`, 'error');
            return false;
        }
        const trimmedName = typeof name === 'string' ? name.trim() : '';
        set({
            width: w,
            height: h,
            resolution: nextResolution,
            layers: [newLayer],
            activeLayerId: newLayer.id,
            selectedLayerIds: [newLayer.id],
            layerSelectionAnchorId: newLayer.id,
            documentName: trimmedName.length > 0 ? trimmedName : 'Untitled',
            isDirty: false,
            lastSavedHistoryTick: get().historyTick,
            selection: {
                ...get().selection,
                hasSelection: false,
                path: [],
                polyPoints: [],
                operations: [],
                isDraggingSelection: false,
            },
        });
        return true;
    },

    recordClipboardImageInfo: (info) => set({ clipboardImageInfo: info }),

    closeDocument: () => {
        set({
            layers: [],
            activeLayerId: null,
            selectedLayerIds: [],
            layerSelectionAnchorId: null,
            documentName: '',
            isDirty: false,
            width: 0,
            height: 0,
            resolution: 72,
            selection: {
                ...get().selection,
                hasSelection: false,
                path: [],
                polyPoints: [],
                operations: [],
                isDraggingSelection: false,
            },
        });
    },

    openImageAsDocument: (img, name) => {
        const w = Math.max(1, Math.round(img.naturalWidth || img.width));
        const h = Math.max(1, Math.round(img.naturalHeight || img.height));
        if (!guardDocumentSize(w, h, get().reportError)) return false;
        let newLayer: LayerClass;
        try {
            newLayer = new LayerClass(w, h, name);
            newLayer.ctx.drawImage(img, 0, 0, w, h);
            newLayer.markDirty(null);
        } catch (err) {
            get().reportError('save', `Could not open image: ${(err as Error)?.message ?? 'allocation error'}.`, 'error');
            return false;
        }
        set({
            width: w,
            height: h,
            resolution: 72,
            layers: [newLayer],
            activeLayerId: newLayer.id,
            selectedLayerIds: [newLayer.id],
            layerSelectionAnchorId: newLayer.id,
            documentName: name,
            isDirty: false,
            lastSavedHistoryTick: get().historyTick,
            selection: {
                ...get().selection,
                hasSelection: false,
                path: [],
                polyPoints: [],
                operations: [],
                isDraggingSelection: false,
            },
            quickMaskMode: false,
        });
        return true;
    },

    setDocumentName: (name) => set({ documentName: name }),
    setHasAutosave: (has) => set({ hasAutosave: has }),
    dismissAutosave: () => set({ hasAutosave: false }),
    markDocumentDirty: () => {
        if (!get().isDirty) set({ isDirty: true });
    },
    markDocumentClean: () => set({ isDirty: false, lastSavedHistoryTick: get().historyTick }),

    saveFile: async (name) => {
        const store = get();
        await saveDocument(store, name);
        set({ documentName: name, isDirty: false, lastSavedHistoryTick: get().historyTick });
    },

    loadFile: async (name) => {
        await loadDocument(name, get, set);
        set({ isDirty: false, lastSavedHistoryTick: get().historyTick });
    },
});
