import type { StateCreator } from 'zustand';
import type { DocumentSlice, EditorStore, OpenDocumentRecord } from './types';
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
import type { Layer as LayerInstance } from '../core/Layer';
import type { FillLayerData } from '../core/fillLayer';

function copyCanvasContent(dst: HTMLCanvasElement, src: HTMLCanvasElement): void {
    dst.width = src.width;
    dst.height = src.height;
    const ctx = dst.getContext('2d')!;
    ctx.clearRect(0, 0, dst.width, dst.height);
    ctx.drawImage(src, 0, 0);
}

interface LayerWithMeta extends LayerInstance {
    adjustment?: { id: string; params: Record<string, unknown> };
    fillData?: FillLayerData;
}

function cloneLayerForDocument(src: LayerInstance, width = src.canvas.width, height = src.canvas.height, name = src.name, center = false): LayerInstance {
    const clone = new LayerClass(width, height, name, src.kind) as LayerWithMeta;
    clone.visible = src.visible;
    clone.opacity = src.opacity;
    clone.fill = src.fill;
    clone.blendMode = src.blendMode;
    clone.expanded = src.expanded;
    clone.locks = { ...src.locks };
    clone.colorTag = src.colorTag;
    clone.effects = src.effects?.map(e => ({ ...e, params: structuredClone(e.params ?? {}) })) ?? [];
    clone.typeData = src.typeData ? structuredClone(src.typeData) : null;
    clone.shapeData = src.shapeData ? structuredClone(src.shapeData) : null;
    clone.isBackground = false;
    clone.parentId = null;

    const dx = center ? Math.round((width - src.canvas.width) / 2) : 0;
    const dy = center ? Math.round((height - src.canvas.height) / 2) : 0;
    clone.ctx.drawImage(src.canvas, dx, dy);

    const srcMeta = src as LayerWithMeta;
    if (srcMeta.adjustment) clone.adjustment = { id: srcMeta.adjustment.id, params: structuredClone(srcMeta.adjustment.params ?? {}) };
    if (srcMeta.fillData) clone.fillData = structuredClone(srcMeta.fillData);
    if (src.mask) {
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = width;
        maskCanvas.height = height;
        const mctx = maskCanvas.getContext('2d');
        if (mctx) {
            mctx.drawImage(src.mask.canvas, dx, dy);
            clone.mask = {
                canvas: maskCanvas,
                ctx: mctx,
                enabled: src.mask.enabled,
                linked: src.mask.linked,
                density: src.mask.density,
                feather: src.mask.feather,
            };
        }
    }
    clone.markDirty(null);
    return clone;
}

function cloneLayers(layers: LayerInstance[]): LayerInstance[] {
    const idMap = new Map<string, string>();
    const clones = layers.map(layer => {
        const clone = cloneLayerForDocument(layer, layer.canvas.width, layer.canvas.height, layer.name);
        clone.id = layer.id;
        clone.parentId = layer.parentId;
        clone.isBackground = layer.isBackground;
        clone.locks = { ...layer.locks };
        idMap.set(layer.id, clone.id);
        return clone;
    });
    clones.forEach((clone, index) => {
        const original = layers[index];
        clone.parentId = original.parentId ? idMap.get(original.parentId) ?? original.parentId : null;
    });
    return clones;
}

function captureCurrentDocument(state: EditorStore): OpenDocumentRecord | null {
    if (!state.documentName && state.layers.length === 0) return null;
    if (state.layers.length === 0) return null;
    return {
        id: state.activeDocumentId ?? crypto.randomUUID(),
        name: state.documentName || 'Untitled',
        width: state.width,
        height: state.height,
        resolution: state.resolution,
        layers: cloneLayers(state.layers),
        activeLayerId: state.activeLayerId,
        selectedLayerIds: [...state.selectedLayerIds],
        layerSelectionAnchorId: state.layerSelectionAnchorId,
        isDirty: state.isDirty,
        lastSavedHistoryTick: state.lastSavedHistoryTick,
    };
}

function upsertDocumentRecord(records: OpenDocumentRecord[], record: OpenDocumentRecord | null): OpenDocumentRecord[] {
    if (!record) return records;
    const index = records.findIndex(doc => doc.id === record.id);
    if (index === -1) return [...records, record];
    const next = [...records];
    next[index] = record;
    return next;
}

function installDocumentRecord(record: OpenDocumentRecord): Partial<EditorStore> {
    return {
        activeDocumentId: record.id,
        documentName: record.name,
        width: record.width,
        height: record.height,
        resolution: record.resolution,
        layers: cloneLayers(record.layers),
        activeLayerId: record.activeLayerId,
        selectedLayerIds: [...record.selectedLayerIds],
        layerSelectionAnchorId: record.layerSelectionAnchorId,
        isDirty: record.isDirty,
        lastSavedHistoryTick: record.lastSavedHistoryTick,
        selection: {
            hasSelection: false,
            mode: 'rect',
            path: [],
            polyPoints: [],
            operations: [],
            isDraggingSelection: false,
            isFreeEditMode: false,
        },
        quickMaskMode: false,
    };
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
    activeDocumentId: null,
    openDocuments: [],
    documentLayout: 'tabs',
    globalLight: { angle: 120, altitude: 30 },
    clipboardImageInfo: null,
    transferLayerClipboard: null,

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
        const currentRecord = captureCurrentDocument(get());
        const newId = crypto.randomUUID();
        const nextResolution = Number.isFinite(resolution) && resolution !== undefined && resolution > 0 ? resolution : 72;
        let newLayer: LayerClass;
        try {
            newLayer = new LayerClass(w, h, bg === 'transparent' ? 'Layer 1' : 'Background');
            if (bg !== 'transparent') {
                newLayer.ctx.fillStyle = bg;
                newLayer.ctx.fillRect(0, 0, w, h);
                newLayer.isBackground = true;
                newLayer.locks = { transparency: true, image: false, position: true, all: false };
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
            activeDocumentId: newId,
            openDocuments: upsertDocumentRecord(upsertDocumentRecord(currentRecord ? get().openDocuments : [], currentRecord), {
                id: newId,
                name: trimmedName.length > 0 ? trimmedName : 'Untitled',
                width: w,
                height: h,
                resolution: nextResolution,
                layers: cloneLayers([newLayer]),
                activeLayerId: newLayer.id,
                selectedLayerIds: [newLayer.id],
                layerSelectionAnchorId: newLayer.id,
                isDirty: false,
                lastSavedHistoryTick: get().historyTick,
            }),
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
        const state = get();
        const activeId = state.activeDocumentId;
        if (activeId) {
            const activeKnown = state.openDocuments.some(doc => doc.id === activeId);
            const remaining = state.openDocuments.filter(doc => doc.id !== activeId);
            if (activeKnown && remaining.length > 0) {
                const nextActive = remaining[remaining.length - 1];
                set({
                    ...installDocumentRecord(nextActive),
                    openDocuments: remaining,
                });
                return;
            }
        }
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
            activeDocumentId: null,
            openDocuments: [],
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
        const currentRecord = captureCurrentDocument(get());
        const newId = crypto.randomUUID();
        let newLayer: LayerClass;
        try {
            newLayer = new LayerClass(w, h, 'Background');
            newLayer.ctx.fillStyle = '#ffffff';
            newLayer.ctx.fillRect(0, 0, w, h);
            newLayer.ctx.drawImage(img, 0, 0, w, h);
            newLayer.isBackground = true;
            newLayer.locks = { transparency: true, image: false, position: true, all: false };
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
            activeDocumentId: newId,
            openDocuments: upsertDocumentRecord(upsertDocumentRecord(currentRecord ? get().openDocuments : [], currentRecord), {
                id: newId,
                name,
                width: w,
                height: h,
                resolution: 72,
                layers: cloneLayers([newLayer]),
                activeLayerId: newLayer.id,
                selectedLayerIds: [newLayer.id],
                layerSelectionAnchorId: newLayer.id,
                isDirty: false,
                lastSavedHistoryTick: get().historyTick,
            }),
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

    switchDocument: (id) => {
        const state = get();
        if (state.activeDocumentId === id) return;
        const currentRecord = captureCurrentDocument(state);
        const records = upsertDocumentRecord(state.openDocuments, currentRecord);
        const target = records.find(doc => doc.id === id);
        if (!target) return;
        set({
            ...installDocumentRecord(target),
            openDocuments: records,
        });
    },

    arrangeDocuments: (layout) => set({ documentLayout: layout }),

    duplicateLayerToDocument: (layerId, documentId, name, center = false) => {
        const state = get();
        const src = state.layers.find(layer => layer.id === layerId);
        if (!src) return;
        const records = upsertDocumentRecord(state.openDocuments, captureCurrentDocument(state));
        const target = records.find(doc => doc.id === documentId);
        if (!target) return;
        const cloneName = (name && name.trim()) || `${src.name} copy`;
        if (documentId === state.activeDocumentId) {
            get().executeDocumentCommand({
                kind: 'layer-add',
                label: 'Duplicate Layer',
                layerId,
                run: () => {
                    const fresh = get().layers.find(layer => layer.id === layerId);
                    if (!fresh) return;
                    const dup = cloneLayerForDocument(fresh, get().width, get().height, cloneName, center);
                    set({
                        layers: [...get().layers, dup],
                        activeLayerId: dup.id,
                        selectedLayerIds: [dup.id],
                        layerSelectionAnchorId: dup.id,
                        openDocuments: records,
                    });
                },
            });
            return;
        }
        const dup = cloneLayerForDocument(src, target.width, target.height, cloneName, center);
        const nextTarget: OpenDocumentRecord = {
            ...target,
            layers: [...target.layers, dup],
            activeLayerId: dup.id,
            selectedLayerIds: [dup.id],
            layerSelectionAnchorId: dup.id,
            isDirty: true,
        };
        set({ openDocuments: upsertDocumentRecord(records, nextTarget) });
    },

    copyActiveLayerForTransfer: () => {
        const state = get();
        const layer = state.layers.find(item => item.id === state.activeLayerId);
        if (!layer) return false;
        set({ transferLayerClipboard: cloneLayerForDocument(layer, layer.canvas.width, layer.canvas.height, layer.name) });
        return true;
    },

    pasteTransferredLayer: (center = false) => {
        const state = get();
        const src = state.transferLayerClipboard;
        if (!src || state.width < 1 || state.height < 1) return false;
        get().executeDocumentCommand({
            kind: 'layer-add',
            label: 'Paste Layer',
            run: () => {
                const pasted = cloneLayerForDocument(src, get().width, get().height, src.name, center);
                set({
                    layers: [...get().layers, pasted],
                    activeLayerId: pasted.id,
                    selectedLayerIds: [pasted.id],
                    layerSelectionAnchorId: pasted.id,
                });
            },
        });
        return true;
    },

    setDocumentName: (name) => set((state) => {
        const record = captureCurrentDocument({ ...state, documentName: name } as EditorStore);
        return {
            documentName: name,
            openDocuments: state.activeDocumentId && record ? upsertDocumentRecord(state.openDocuments, record) : state.openDocuments,
        };
    }),
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
