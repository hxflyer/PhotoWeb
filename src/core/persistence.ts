/**
 * Document persistence: save/load to OPFS (Origin Private File System).
 * Format: a JSON manifest with per-layer image data encoded as data URLs.
 * File path inside OPFS: /photoweb/{name}.pwbdoc
 */

import { Layer } from './Layer';
import { useEditorStore } from '../store/editorStore';
import type { ToastErrorChannel } from '../store/types';
import {
    getPaths,
    getActivePathId,
    addPath,
    clearPaths,
    setActivePath,
    type PathShape,
} from '../tools/pen';

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
    shapeData?: import('../store/types').ShapeData | null;
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
    paths?: PathShape[];
    activePathId?: string | null;
}

const CHANNEL_MESSAGES: Record<ToastErrorChannel, string> = {
    save: 'Could not save document. The browser may be offline or storage is restricted.',
    load: 'Could not load document: file is missing or corrupt.',
    autosave: 'Autosave failed. Recent edits are not protected against reload.',
    export: 'Export failed. The image could not be encoded.',
    quota: 'Could not save document: storage quota exceeded. Try removing autosaves or older snapshots.',
};

function isQuotaError(err: unknown): boolean {
    if (!err || typeof err !== 'object') return false;
    const e = err as { name?: string; code?: number; message?: string };
    if (e.name === 'QuotaExceededError') return true;
    if (e.name === 'NS_ERROR_DOM_QUOTA_REACHED') return true;
    if (e.code === 22 || e.code === 1014) return true;
    if (typeof e.message === 'string' && /quota/i.test(e.message)) return true;
    return false;
}

function reportError(channel: ToastErrorChannel, err: unknown, hint?: string): void {
    const store = useEditorStore.getState();
    if (!store || typeof store.reportError !== 'function') return;
    const effectiveChannel: ToastErrorChannel = isQuotaError(err) ? 'quota' : channel;
    const base = CHANNEL_MESSAGES[effectiveChannel];
    const message = hint ? `${base} ${hint}` : base;
    store.reportError(effectiveChannel, message, 'error');
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
        shapeData: (layer.shapeData as import('../store/types').ShapeData | null | undefined) ?? null,
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

export interface SaveOptions {
    silent?: boolean;
    channel?: ToastErrorChannel;
}

export async function saveDocument(
    store: ReturnType<StoreGet>,
    filename: string,
    options: SaveOptions = {},
): Promise<void> {
    const channel: ToastErrorChannel = options.channel ?? 'save';
    let json: string;
    try {
        const manifest: DocumentManifest = {
            version: 1,
            name: filename,
            width: store.width,
            height: store.height,
            activeLayerId: store.activeLayerId,
            layers: store.layers.map(layerToManifest),
            timestamp: Date.now(),
            savedSelections: store.savedSelections,
            paths: getPaths().map(p => ({
                id: p.id,
                closed: p.closed,
                anchors: p.anchors.map(a => ({
                    x: a.x, y: a.y, type: a.type,
                    inHandle: a.inHandle ? { ...a.inHandle } : undefined,
                    outHandle: a.outHandle ? { ...a.outHandle } : undefined,
                })),
                ...(((p as PathShape & { name?: string }).name !== undefined)
                    ? { name: (p as PathShape & { name?: string }).name }
                    : {}),
            } as PathShape)),
            activePathId: getActivePathId(),
        };
        json = JSON.stringify(manifest);
    } catch (err) {
        if (!options.silent) reportError(channel, err, 'A layer could not be serialized.');
        throw err;
    }

    let wroteToOPFS = false;
    let opfsError: unknown = null;
    try {
        const handle = await getOPFSFile(`${filename}.pwbdoc`, true);
        if (handle) {
            const writable = await handle.createWritable();
            await writable.write(json);
            await writable.close();
            wroteToOPFS = true;
        }
    } catch (err) {
        // STAB-02: don't bail yet. Try localStorage as a fallback for the
        // autosave / save paths so a transient OPFS hiccup doesn't lose data.
        opfsError = err;
    }

    if (wroteToOPFS) {
        if (channel !== 'autosave') useEditorStore.getState().clearLastErrorChannel?.();
        return;
    }

    if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
        try {
            localStorage.setItem(`pwbdoc:${filename}`, json);
            if (channel !== 'autosave') useEditorStore.getState().clearLastErrorChannel?.();
            return;
        } catch (err) {
            if (!options.silent) reportError(channel, err);
            throw err;
        }
    }
    if (opfsError && !options.silent) reportError(channel, opfsError);
    if (opfsError) throw opfsError;
    if (!options.silent) {
        useEditorStore.getState().reportError?.(
            channel,
            channel === 'autosave'
                ? CHANNEL_MESSAGES.autosave + ' Storage is unavailable in this browser.'
                : CHANNEL_MESSAGES.save + ' Storage is unavailable in this browser.',
            'error',
        );
    }
    throw new Error('No persistence backend available');
}

export async function loadDocument(filename: string, _get: StoreGet, set: StoreSet): Promise<void> {
    let json: string | null = null;

    try {
        const handle = await getOPFSFile(`${filename}.pwbdoc`, false);
        if (handle) {
            const file = await handle.getFile();
            json = await file.text();
        } else if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
            json = localStorage.getItem(`pwbdoc:${filename}`) ?? null;
        }
    } catch (err) {
        reportError('load', err, 'Storage could not be read.');
        throw err;
    }

    if (!json) {
        useEditorStore.getState().reportError?.(
            'load',
            `Could not load document "${filename}": no saved file found.`,
            'error',
        );
        throw new Error('Document not found');
    }

    let manifest: DocumentManifest;
    try {
        manifest = JSON.parse(json);
    } catch (err) {
        useEditorStore.getState().reportError?.(
            'load',
            'Could not load document: file is not a valid .pwbdoc.',
            'error',
        );
        throw err;
    }

    try {
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
            layer.shapeData = lm.shapeData ?? null;
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

        clearPaths();
        if (Array.isArray(manifest.paths)) {
            for (const p of manifest.paths) {
                addPath({
                    id: p.id,
                    closed: !!p.closed,
                    anchors: (p.anchors ?? []).map(a => ({
                        x: a.x, y: a.y, type: a.type,
                        inHandle: a.inHandle ? { ...a.inHandle } : undefined,
                        outHandle: a.outHandle ? { ...a.outHandle } : undefined,
                    })),
                    ...(((p as PathShape & { name?: string }).name !== undefined)
                        ? { name: (p as PathShape & { name?: string }).name }
                        : {}),
                } as PathShape);
            }
            setActivePath(manifest.activePathId ?? null);
        }
        useEditorStore.getState().clearLastErrorChannel?.();
    } catch (err) {
        useEditorStore.getState().reportError?.(
            'load',
            'Could not finish loading document: layer data is corrupt or incompatible.',
            'error',
        );
        throw err;
    }
}

export async function autosave(store: ReturnType<StoreGet>): Promise<void> {
    await saveDocument(store, 'autosave', { channel: 'autosave' });
}

export async function checkAutosave(): Promise<boolean> {
    const handle = await getOPFSFile('autosave.pwbdoc', false);
    if (handle) return true;
    return localStorage.getItem('pwbdoc:autosave') !== null;
}

export async function clearAutosaveSlot(): Promise<void> {
    try {
        if ('storage' in navigator && 'getDirectory' in navigator.storage) {
            const root = await navigator.storage.getDirectory();
            try {
                const photoweb = await root.getDirectoryHandle('photoweb', { create: false });
                try { await photoweb.removeEntry('autosave.pwbdoc'); } catch { /* ignore */ }
            } catch { /* directory missing — nothing to do */ }
        }
    } catch { /* swallow — fallback below */ }
    try {
        if (typeof localStorage !== 'undefined' && typeof localStorage.removeItem === 'function') {
            localStorage.removeItem('pwbdoc:autosave');
        }
    } catch { /* nothing more we can do */ }
}

export async function readAutosaveRaw(): Promise<string | null> {
    try {
        const handle = await getOPFSFile('autosave.pwbdoc', false);
        if (handle) {
            const file = await handle.getFile();
            return await file.text();
        }
    } catch { /* fall through */ }
    if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
        return localStorage.getItem('pwbdoc:autosave');
    }
    return null;
}
