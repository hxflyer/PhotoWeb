import type { StateCreator } from 'zustand';
import type { DocumentSlice, EditorStore } from './types';

export const createDocumentSlice: StateCreator<EditorStore, [], [], DocumentSlice> = (set, get) => ({
    width: 800,
    height: 600,
    setCanvasSize: (width, height) => {
        const { layers } = get();
        layers.forEach(layer => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = layer.canvas.width;
            tempCanvas.height = layer.canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
                tempCtx.drawImage(layer.canvas, 0, 0);
            }
            layer.canvas.width = width;
            layer.canvas.height = height;
            layer.ctx.drawImage(tempCanvas, 0, 0);
            layer.markDirty(null);
        });
        set({ width, height });
    },
});
