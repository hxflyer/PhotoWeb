import type { StateCreator } from 'zustand';
import type { DocumentSlice, EditorStore } from './types';
import {
    rotateCanvas as rotateCanvasHelper,
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

export const createDocumentSlice: StateCreator<EditorStore, [], [], DocumentSlice> = (set, get) => ({
    width: 800,
    height: 600,
    hasAutosave: false,
    documentName: 'Untitled',

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

    resizeImage: (newW, newH, method: ResampleMethod) => get().executeDocumentCommand({
        kind: 'transform',
        label: 'Image Size',
        run: () => {
        const { layers } = get();
        layers.forEach(layer => {
            const result = resampleCanvas(layer.canvas, newW, newH, method);
            copyCanvasContent(layer.canvas, result);
            layer.markDirty(null);
        });
        set({ width: newW, height: newH });
        },
    }),

    resizeCanvas: (newW, newH, anchorX, anchorY, extensionColor) => get().executeDocumentCommand({
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
    }),

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

    newDocument: (w, h, bg) => {
        const newLayer = new LayerClass(w, h, 'Background');
        if (bg !== 'transparent') {
            newLayer.ctx.fillStyle = bg;
            newLayer.ctx.fillRect(0, 0, w, h);
        }
        newLayer.markDirty(null);
        set({
            width: w,
            height: h,
            layers: [newLayer],
            activeLayerId: newLayer.id,
            selectedLayerIds: [newLayer.id],
            layerSelectionAnchorId: newLayer.id,
            documentName: 'Untitled',
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
        const newLayer = new LayerClass(w, h, name);
        newLayer.ctx.drawImage(img, 0, 0, w, h);
        newLayer.markDirty(null);
        set({
            width: w,
            height: h,
            layers: [newLayer],
            activeLayerId: newLayer.id,
            selectedLayerIds: [newLayer.id],
            layerSelectionAnchorId: newLayer.id,
            documentName: name,
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
    },

    setDocumentName: (name) => set({ documentName: name }),
    setHasAutosave: (has) => set({ hasAutosave: has }),
    dismissAutosave: () => set({ hasAutosave: false }),

    saveFile: async (name) => {
        const store = get();
        await saveDocument(store, name);
        set({ documentName: name });
    },

    loadFile: async (name) => {
        await loadDocument(name, get, set);
    },
});
