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
    parentId: string | null;
    expanded: boolean;
    dataUrl: string;
    width: number;
    height: number;
    // Live-layer metadata. Optional for backwards compatibility with v1 docs.
    typeData?: unknown;
    adjustment?: { id: string; params: Record<string, unknown> };
    fillData?: unknown;
    effects?: { kind: string; enabled: boolean; params: Record<string, unknown> }[];
    locks?: { transparency: boolean; image: boolean; position: boolean; all: boolean };
    colorTag?: string;
    mask?: {
        dataUrl: string;
        enabled: boolean;
        linked: boolean;
        density?: number;
        feather?: number;
    } | null;
}

export interface DocumentManifest {
    version: 1;
    name: string;
    width: number;
    height: number;
    activeLayerId: string | null;
    layers: LayerManifest[];
    timestamp: number;
    savedSelections?: { name: string; ops: import('../store/types').SelectionOperation[] }[];
}

function layerToManifest(layer: Layer): LayerManifest {
    const meta = layer as unknown as {
        adjustment?: { id: string; params: Record<string, unknown> };
        fillData?: unknown;
    };
    return {
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        opacity: layer.opacity,
        fill: layer.fill,
        blendMode: layer.blendMode,
        kind: layer.kind,
        parentId: layer.parentId,
        expanded: layer.expanded,
        dataUrl: layer.canvas.toDataURL('image/png'),
        width: layer.canvas.width,
        height: layer.canvas.height,
        typeData: layer.typeData ?? undefined,
        adjustment: meta.adjustment,
        fillData: meta.fillData,
        effects: layer.effects?.map(e => ({ kind: e.kind, enabled: e.enabled, params: e.params })),
        locks: { ...layer.locks },
        colorTag: layer.colorTag,
        mask: layer.mask ? {
            dataUrl: layer.mask.canvas.toDataURL('image/png'),
            enabled: layer.mask.enabled,
            linked: layer.mask.linked,
            density: layer.mask.density,
            feather: layer.mask.feather,
        } : null,
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

type StoreGet = () => {
    layers: Layer[];
    activeLayerId: string | null;
    width: number;
    height: number;
    documentName: string;
    savedSelections?: { name: string; ops: import('../store/types').SelectionOperation[] }[];
};
type StoreSet = (partial: Partial<{
    layers: Layer[];
    activeLayerId: string | null;
    selectedLayerIds: string[];
    layerSelectionAnchorId: string | null;
    width: number;
    height: number;
    documentName: string;
    savedSelections: { name: string; ops: import('../store/types').SelectionOperation[] }[];
}>) => void;

export async function saveDocument(store: ReturnType<StoreGet>, filename: string): Promise<void> {
    const manifest: DocumentManifest = {
        version: 1,
        name: filename,
        width: store.width,
        height: store.height,
        activeLayerId: store.activeLayerId,
        layers: store.layers.map(layerToManifest),
        timestamp: Date.now(),
        savedSelections: store.savedSelections,
    };
    const json = JSON.stringify(manifest);
    const handle = await getOPFSFile(`${filename}.pwbdoc`, true);
    if (handle) {
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
    } else if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
        // Fallback: localStorage (for test environments without OPFS)
        try {
            localStorage.setItem(`pwbdoc:${filename}`, json);
        } catch { /* quota exceeded or unavailable */ }
    }
    // No persistence backend available — silently no-op rather than throw.
}

export async function loadDocument(filename: string, _get: StoreGet, set: StoreSet): Promise<void> {
    let json: string | null = null;

    const handle = await getOPFSFile(`${filename}.pwbdoc`, false);
    if (handle) {
        const file = await handle.getFile();
        json = await file.text();
    } else if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
        json = localStorage.getItem(`pwbdoc:${filename}`) ?? null;
    }

    if (!json) return;
    const manifest: DocumentManifest = JSON.parse(json);

    const layers = await Promise.all(manifest.layers.map(async (lm) => {
        const layer = new Layer(lm.width, lm.height, lm.name);
        (layer as unknown as Record<string, unknown>).id = lm.id;
        layer.visible = lm.visible;
        layer.opacity = lm.opacity;
        layer.fill = lm.fill;
        layer.blendMode = lm.blendMode;
        (layer as unknown as Record<string, unknown>).kind = lm.kind;
        layer.parentId = lm.parentId ?? null;
        layer.expanded = lm.expanded ?? true;
        layer.typeData = lm.typeData ?? null;
        if (lm.adjustment) (layer as unknown as Record<string, unknown>).adjustment = lm.adjustment;
        if (lm.fillData) (layer as unknown as Record<string, unknown>).fillData = lm.fillData;
        if (lm.effects) {
            layer.effects = lm.effects.map(e => ({
                kind: e.kind as import('./Layer').LayerEffectKind,
                enabled: e.enabled,
                params: e.params,
            }));
        }
        if (lm.locks) layer.locks = { ...lm.locks };
        if (lm.colorTag) layer.colorTag = lm.colorTag as import('./Layer').LayerColorTag;
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
        if (lm.mask) {
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = lm.width; maskCanvas.height = lm.height;
            const mctx = maskCanvas.getContext('2d');
            if (mctx) {
                await new Promise<void>((resolve) => {
                    const img = new Image();
                    img.onload = () => { mctx.drawImage(img, 0, 0); resolve(); };
                    img.onerror = () => resolve();
                    img.src = lm.mask!.dataUrl;
                });
                layer.mask = {
                    canvas: maskCanvas, ctx: mctx,
                    enabled: lm.mask.enabled,
                    linked: lm.mask.linked,
                    density: lm.mask.density,
                    feather: lm.mask.feather,
                };
            }
        }
        return layer;
    }));

    set({
        width: manifest.width,
        height: manifest.height,
        layers,
        activeLayerId: manifest.activeLayerId,
        selectedLayerIds: manifest.activeLayerId ? [manifest.activeLayerId] : [],
        layerSelectionAnchorId: manifest.activeLayerId,
        documentName: manifest.name,
        savedSelections: manifest.savedSelections ?? [],
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
