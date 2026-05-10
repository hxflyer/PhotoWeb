/**
 * Document persistence: save/load to OPFS (Origin Private File System).
 * Format: a JSON manifest with per-layer image data encoded as data URLs.
 * File path inside OPFS: /photoweb/{name}.pwbdoc
 */

import { Layer } from './Layer';

export interface LayerManifest {
    id: string;
    name: string;
    visible: boolean;
    opacity: number;
    fill: number;
    blendMode: GlobalCompositeOperation;
    kind: string;
    dataUrl: string;
    width: number;
    height: number;
}

export interface DocumentManifest {
    version: 1;
    name: string;
    width: number;
    height: number;
    activeLayerId: string | null;
    layers: LayerManifest[];
    timestamp: number;
}

function layerToManifest(layer: Layer): LayerManifest {
    return {
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        opacity: layer.opacity,
        fill: layer.fill,
        blendMode: layer.blendMode,
        kind: layer.kind,
        dataUrl: layer.canvas.toDataURL('image/png'),
        width: layer.canvas.width,
        height: layer.canvas.height,
    };
}

async function getOPFSFile(filename: string, create: boolean): Promise<FileSystemFileHandle | null> {
    if (!('storage' in navigator && 'getDirectory' in navigator.storage)) return null;
    try {
        const root = await navigator.storage.getDirectory();
        let photoweb: FileSystemDirectoryHandle;
        try {
            photoweb = await root.getDirectoryHandle('photoweb', { create: true });
        } catch {
            return null;
        }
        return photoweb.getFileHandle(filename, { create });
    } catch {
        return null;
    }
}

type StoreGet = () => { layers: Layer[]; activeLayerId: string | null; width: number; height: number; documentName: string };
type StoreSet = (partial: Partial<{ layers: Layer[]; activeLayerId: string | null; width: number; height: number; documentName: string }>) => void;

export async function saveDocument(store: ReturnType<StoreGet>, filename: string): Promise<void> {
    const manifest: DocumentManifest = {
        version: 1,
        name: filename,
        width: store.width,
        height: store.height,
        activeLayerId: store.activeLayerId,
        layers: store.layers.map(layerToManifest),
        timestamp: Date.now(),
    };
    const json = JSON.stringify(manifest);
    const handle = await getOPFSFile(`${filename}.pwbdoc`, true);
    if (handle) {
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
    } else {
        // Fallback: localStorage (for test environments without OPFS)
        try {
            localStorage.setItem(`pwbdoc:${filename}`, json);
        } catch { /* quota exceeded or unavailable */ }
    }
}

export async function loadDocument(filename: string, _get: StoreGet, set: StoreSet): Promise<void> {
    let json: string | null = null;

    const handle = await getOPFSFile(`${filename}.pwbdoc`, false);
    if (handle) {
        const file = await handle.getFile();
        json = await file.text();
    } else {
        json = localStorage.getItem(`pwbdoc:${filename}`) ?? null;
    }

    if (!json) return;
    const manifest: DocumentManifest = JSON.parse(json);

    const layers = await Promise.all(manifest.layers.map(async (lm) => {
        const layer = new Layer(lm.width, lm.height, lm.name);
        // Restore fields
        (layer as unknown as Record<string, unknown>).id = lm.id;
        layer.visible = lm.visible;
        layer.opacity = lm.opacity;
        layer.fill = lm.fill;
        layer.blendMode = lm.blendMode;
        (layer as unknown as Record<string, unknown>).kind = lm.kind;
        // Restore pixel data
        await new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
                layer.ctx.drawImage(img, 0, 0);
                layer.markDirty(null);
                resolve();
            };
            img.onerror = () => resolve();
            img.src = lm.dataUrl;
        });
        return layer;
    }));

    set({
        width: manifest.width,
        height: manifest.height,
        layers,
        activeLayerId: manifest.activeLayerId,
        documentName: manifest.name,
    });
}

export async function autosave(store: ReturnType<StoreGet>): Promise<void> {
    await saveDocument(store, 'autosave');
}

export async function checkAutosave(): Promise<boolean> {
    const handle = await getOPFSFile('autosave.pwbdoc', false);
    if (handle) return true;
    return localStorage.getItem('pwbdoc:autosave') !== null;
}
