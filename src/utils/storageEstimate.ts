import type { EditorStore } from '../store/types';

export interface StorageEstimate {
    layerBytes: number;
    maskBytes: number;
    historyBytes: number;
    totalBytes: number;
}

export function computeMemoryEstimate(state: EditorStore): StorageEstimate {
    let layerBytes = 0;
    let maskBytes = 0;
    for (const layer of state.layers) {
        layerBytes += layer.canvas.width * layer.canvas.height * 4;
        if (layer.mask) {
            maskBytes += layer.mask.canvas.width * layer.mask.canvas.height * 4;
        }
    }
    let historyBytes = 0;
    for (const entry of state.historyEntries) {
        if (entry.action.kind === 'pixel') {
            const r = entry.action.dirtyRect;
            historyBytes += r.width * r.height * 4 * 2;
        }
    }
    return {
        layerBytes,
        maskBytes,
        historyBytes,
        totalBytes: layerBytes + maskBytes + historyBytes,
    };
}

export function formatMemoryMB(bytes: number): string {
    return (bytes / 1024 / 1024).toFixed(1);
}
