import type { StateCreator } from 'zustand';
import { Layer } from '../core/Layer';
import type { LayerColorTag } from '../core/Layer';
import { createFillLayer, paintFillLayer, type FillLayerData } from '../core/fillLayer';
import { getAdjustment } from '../adjustments';
import { captureLayerRegion, createPixelHistoryAction } from '../core/history';
import type { EditorStore, LayersSlice } from './types';

interface LayerWithMeta extends Layer {
    adjustment?: { id: string; params: Record<string, unknown> };
    fillData?: FillLayerData;
}

function descendantLayerIds(layers: Layer[], groupId: string): Set<string> {
    const ids = new Set<string>();
    const collect = (parentId: string) => {
        layers.forEach(layer => {
            if (layer.parentId !== parentId) return;
            ids.add(layer.id);
            if (layer.kind === 'group') collect(layer.id);
        });
    };
    collect(groupId);
    return ids;
}

function nextGroupName(layers: Layer[]): string {
    const count = layers.filter(layer => layer.kind === 'group').length + 1;
    return `Group ${count}`;
}

interface Bounds {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

function unionBounds(bounds: Bounds[]): Bounds | null {
    if (bounds.length === 0) return null;
    return bounds.reduce((acc, item) => ({
        left: Math.min(acc.left, item.left),
        top: Math.min(acc.top, item.top),
        right: Math.max(acc.right, item.right),
        bottom: Math.max(acc.bottom, item.bottom),
    }));
}

function layerContentBounds(layer: Layer, layers: Layer[]): Bounds | null {
    if (layer.kind === 'group') {
        return unionBounds(layers
            .filter(child => child.parentId === layer.id)
            .map(child => layerContentBounds(child, layers))
            .filter((bounds): bounds is Bounds => bounds !== null));
    }
    const image = layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
    let left = layer.canvas.width;
    let top = layer.canvas.height;
    let right = -1;
    let bottom = -1;
    for (let y = 0; y < image.height; y += 1) {
        for (let x = 0; x < image.width; x += 1) {
            const alpha = image.data[(y * image.width + x) * 4 + 3];
            if (alpha === 0) continue;
            left = Math.min(left, x);
            top = Math.min(top, y);
            right = Math.max(right, x + 1);
            bottom = Math.max(bottom, y + 1);
        }
    }
    if (right === -1 || bottom === -1) return null;
    return { left, top, right, bottom };
}

function moveLayerPixels(layer: Layer, dx: number, dy: number, layers: Layer[]): void {
    if (dx === 0 && dy === 0) return;
    if (layer.kind === 'group') {
        layers.filter(child => child.parentId === layer.id).forEach(child => moveLayerPixels(child, dx, dy, layers));
        return;
    }
    const snapshot = document.createElement('canvas');
    snapshot.width = layer.canvas.width;
    snapshot.height = layer.canvas.height;
    snapshot.getContext('2d')?.drawImage(layer.canvas, 0, 0);
    layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    layer.ctx.drawImage(snapshot, dx, dy);
    if (layer.mask?.linked) {
        const maskSnapshot = document.createElement('canvas');
        maskSnapshot.width = layer.mask.canvas.width;
        maskSnapshot.height = layer.mask.canvas.height;
        maskSnapshot.getContext('2d')?.drawImage(layer.mask.canvas, 0, 0);
        layer.mask.ctx.clearRect(0, 0, layer.mask.canvas.width, layer.mask.canvas.height);
        layer.mask.ctx.drawImage(maskSnapshot, dx, dy);
    }
    layer.markDirty(null);
}

function hasSelectedAncestor(layer: Layer, selectedIds: Set<string>, layers: Layer[]): boolean {
    let parentId = layer.parentId;
    while (parentId) {
        if (selectedIds.has(parentId)) return true;
        parentId = layers.find(item => item.id === parentId)?.parentId ?? null;
    }
    return false;
}

function applyDefringe(data: Uint8ClampedArray, w: number, h: number, width: number): void {
    // For every semi-transparent pixel within `width` of a fully opaque pixel,
    // blend its RGB toward the nearest opaque neighbor's RGB. The pixel's own
    // alpha is preserved so the silhouette doesn't change.
    const src = new Uint8ClampedArray(data);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const a = src[idx + 3];
            if (a === 0 || a === 255) continue;
            // Search outward in a square window for the nearest opaque pixel.
            let foundR = 0, foundG = 0, foundB = 0, bestDist = Infinity, found = false;
            for (let dy = -width; dy <= width; dy++) {
                for (let dx = -width; dx <= width; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
                    const ni = (ny * w + nx) * 4;
                    if (src[ni + 3] !== 255) continue;
                    const d = dx * dx + dy * dy;
                    if (d < bestDist) {
                        bestDist = d;
                        foundR = src[ni];
                        foundG = src[ni + 1];
                        foundB = src[ni + 2];
                        found = true;
                    }
                }
            }
            if (found) {
                data[idx] = foundR;
                data[idx + 1] = foundG;
                data[idx + 2] = foundB;
            }
        }
    }
}

function applyMatteRemoval(data: Uint8ClampedArray, matte: number): void {
    // Pure premultiplied recovery: the observed pixel C = F*a + M*(1-a) where
    // F is the unknown foreground. Solving for F gives F = (C - M*(1-a)) / a.
    for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a === 0 || a === 255) continue;
        const alpha = a / 255;
        const inv = 1 - alpha;
        const r = (data[i] - matte * inv) / alpha;
        const g = (data[i + 1] - matte * inv) / alpha;
        const b = (data[i + 2] - matte * inv) / alpha;
        data[i] = Math.max(0, Math.min(255, Math.round(r)));
        data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
        data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
    }
}

export const createLayersSlice: StateCreator<EditorStore, [], [], LayersSlice> = (set, get) => ({
    layers: [],
    activeLayerId: null,
    selectedLayerIds: [],
    layerSelectionAnchorId: null,
    activeLayerEditTarget: 'layer',
    setActiveLayerEditTarget: (target) => set({ activeLayerEditTarget: target }),

    addLayer: () => {
        get().executeDocumentCommand({
            kind: 'layer-add',
            label: 'New Layer',
            run: () => {
        const { width, height, layers } = get();
        const newLayer = new Layer(width, height, `Layer ${layers.length + 1}`);
        set({
            layers: [...layers, newLayer],
            activeLayerId: newLayer.id,
            selectedLayerIds: [newLayer.id],
            layerSelectionAnchorId: newLayer.id,
            activeLayerEditTarget: 'layer',
        });
            },
        });
    },

    createLayerGroup: (name) => {
        get().executeDocumentCommand({
            kind: 'layer-add',
            label: 'New Group',
            run: () => {
                const { width, height, layers } = get();
                const group = new Layer(width, height, name ?? nextGroupName(layers), 'group');
                set({
                    layers: [...layers, group],
                    activeLayerId: group.id,
                    selectedLayerIds: [group.id],
                    layerSelectionAnchorId: group.id,
                });
            },
        });
    },

    groupLayers: (layerIds, name) => {
        const uniqueIds = Array.from(new Set(layerIds));
        get().executeDocumentCommand({
            kind: 'layer-add',
            label: 'Group Layers',
            affectedIds: uniqueIds,
            run: () => {
                const { width, height, layers } = get();
                const selected = layers.filter(layer => uniqueIds.includes(layer.id) && !descendantLayerIds(layers, layer.id).has(layer.id));
                if (selected.length === 0) return;
                const selectedIds = new Set(selected.map(layer => layer.id));
                const group = new Layer(width, height, name ?? nextGroupName(layers), 'group');
                const insertAt = Math.max(...selected.map(layer => layers.findIndex(item => item.id === layer.id))) + 1;
                const parentId = selected[0]?.parentId ?? null;
                group.parentId = parentId;
                const newLayers = layers.map(layer => {
                    if (selectedIds.has(layer.id)) layer.parentId = group.id;
                    return layer;
                });
                newLayers.splice(insertAt, 0, group);
                set({
                    layers: newLayers,
                    activeLayerId: group.id,
                    selectedLayerIds: [group.id],
                    layerSelectionAnchorId: group.id,
                });
            },
        });
    },

    ungroupLayerGroup: (groupId) => {
        get().executeDocumentCommand({
            kind: 'layer-remove',
            label: 'Ungroup Layers',
            affectedIds: [groupId],
            layerId: groupId,
            run: () => {
                const { layers, activeLayerId, selectedLayerIds } = get();
                const group = layers.find(layer => layer.id === groupId && layer.kind === 'group');
                if (!group) return;
                const newLayers = layers
                    .filter(layer => layer.id !== groupId)
                    .map(layer => {
                        if (layer.parentId === groupId) layer.parentId = group.parentId;
                        return layer;
                    });
                set({
                    layers: newLayers,
                    activeLayerId: activeLayerId === groupId ? newLayers.find(layer => layer.parentId === group.parentId)?.id ?? null : activeLayerId,
                    selectedLayerIds: selectedLayerIds.includes(groupId) ? newLayers.filter(layer => layer.parentId === group.parentId).map(layer => layer.id) : selectedLayerIds.filter(id => id !== groupId),
                    layerSelectionAnchorId: activeLayerId === groupId ? null : get().layerSelectionAnchorId,
                });
            },
        });
    },

    toggleLayerGroupExpanded: (groupId) => get().executeDocumentCommand({
        kind: 'layer-property',
        label: 'Toggle Group',
        affectedIds: [groupId],
        layerId: groupId,
        run: () => set((state) => ({
            layers: state.layers.map(layer => {
                if (layer.id === groupId && layer.kind === 'group') layer.expanded = !layer.expanded;
                return layer;
            }),
        })),
    }),

    addLayerFromImage: (img, name) => {
        get().executeDocumentCommand({
            kind: 'layer-add',
            label: `Place ${name}`,
            run: () => {
        const { width, height, layers } = get();
        const newLayer = new Layer(width, height, name);
        const sourceWidth = Math.max(1, img.naturalWidth || img.width);
        const sourceHeight = Math.max(1, img.naturalHeight || img.height);
        const scale = sourceWidth < width && sourceHeight < height
            ? 1
            : Math.min(width / sourceWidth, height / sourceHeight);
        const drawWidth = Math.round(sourceWidth * scale);
        const drawHeight = Math.round(sourceHeight * scale);
        const x = Math.round((width - drawWidth) / 2);
        const y = Math.round((height - drawHeight) / 2);
        newLayer.ctx.drawImage(img, x, y, drawWidth, drawHeight);
        newLayer.markDirty(null);
        set({
            layers: [...layers, newLayer],
            activeLayerId: newLayer.id,
            selectedLayerIds: [newLayer.id],
            layerSelectionAnchorId: newLayer.id,
            activeLayerEditTarget: 'layer',
        });
            },
        });
    },

    addLayerFromContent: (content, name, insertAfterId) => {
        get().executeDocumentCommand({
            kind: 'layer-add',
            label: `New Layer From ${name}`,
            run: () => {
        const { width, height, layers } = get();
        const newLayer = new Layer(width, height, name);
        newLayer.ctx.drawImage(content, 0, 0);
        newLayer.markDirty(null);

        const newLayers = [...layers];
        if (insertAfterId) {
            const index = newLayers.findIndex(l => l.id === insertAfterId);
            if (index !== -1) {
                newLayers.splice(index + 1, 0, newLayer);
            } else {
                newLayers.push(newLayer);
            }
        } else {
            newLayers.push(newLayer);
        }

        set({
            layers: newLayers,
            activeLayerId: newLayer.id,
            selectedLayerIds: [newLayer.id],
            layerSelectionAnchorId: newLayer.id,
            activeLayerEditTarget: 'layer',
        });
            },
        });
    },

    removeLayer: (id) => {
        get().executeDocumentCommand({
            kind: 'layer-remove',
            label: 'Delete Layer',
            affectedIds: [id],
            layerId: id,
            run: () => {
        const { layers } = get();
        const target = layers.find(l => l.id === id);
        const removeIds = target?.kind === 'group' ? descendantLayerIds(layers, id) : new Set<string>();
        removeIds.add(id);
        set((state) => ({
            layers: state.layers.filter(l => !removeIds.has(l.id)),
            activeLayerId: state.activeLayerId && removeIds.has(state.activeLayerId) ? null : state.activeLayerId,
            selectedLayerIds: state.selectedLayerIds.filter(layerId => !removeIds.has(layerId)),
            layerSelectionAnchorId: state.layerSelectionAnchorId && removeIds.has(state.layerSelectionAnchorId) ? null : state.layerSelectionAnchorId,
        }));
            },
        });
    },

    setActiveLayer: (id) => set({ activeLayerId: id, selectedLayerIds: [id], layerSelectionAnchorId: id, activeLayerEditTarget: 'layer' }),

    selectLayer: (id, mode = 'replace') => set((state) => {
        if (!state.layers.some(layer => layer.id === id)) return {};
        if (mode === 'toggle') {
            const exists = state.selectedLayerIds.includes(id);
            const selectedLayerIds = exists
                ? state.selectedLayerIds.filter(layerId => layerId !== id)
                : [...state.selectedLayerIds, id];
            return {
                activeLayerId: exists ? state.activeLayerId : id,
                selectedLayerIds,
                layerSelectionAnchorId: id,
            };
        }
        if (mode === 'range') {
            const anchorId = state.layerSelectionAnchorId ?? state.activeLayerId ?? id;
            const start = state.layers.findIndex(layer => layer.id === anchorId);
            const end = state.layers.findIndex(layer => layer.id === id);
            if (start === -1 || end === -1) {
                return { activeLayerId: id, selectedLayerIds: [id], layerSelectionAnchorId: id };
            }
            const [from, to] = start < end ? [start, end] : [end, start];
            return {
                activeLayerId: id,
                selectedLayerIds: state.layers.slice(from, to + 1).map(layer => layer.id),
                layerSelectionAnchorId: anchorId,
            };
        }
        return {
            activeLayerId: id,
            selectedLayerIds: [id],
            layerSelectionAnchorId: id,
        };
    }),

    selectAllLayers: () => set((state) => ({
        selectedLayerIds: state.layers.map(layer => layer.id),
        activeLayerId: state.layers.at(-1)?.id ?? null,
        layerSelectionAnchorId: state.layers.at(-1)?.id ?? null,
    })),

    deselectLayers: () => set({
        selectedLayerIds: [],
        layerSelectionAnchorId: null,
    }),

    alignSelectedLayers: (alignment, target = 'selection') => get().executeDocumentCommand({
        kind: 'transform',
        label: `Align ${alignment.replace(/-/g, ' ')}`,
        affectedIds: get().selectedLayerIds,
        run: () => {
            const { layers, selectedLayerIds, width, height } = get();
            const selectedIdSet = new Set(selectedLayerIds);
            const targets = layers
                .filter(layer => selectedIdSet.has(layer.id))
                .filter(layer => !hasSelectedAncestor(layer, selectedIdSet, layers))
                .map(layer => ({ layer, bounds: layerContentBounds(layer, layers) }))
                .filter((item): item is { layer: Layer; bounds: Bounds } => item.bounds !== null);
            if (targets.length < 2) return;
            const reference = target === 'canvas'
                ? { left: 0, top: 0, right: width, bottom: height }
                : unionBounds(targets.map(item => item.bounds));
            if (!reference) return;
            targets.forEach(({ layer, bounds }) => {
                const widthOfBounds = bounds.right - bounds.left;
                const heightOfBounds = bounds.bottom - bounds.top;
                let dx = 0;
                let dy = 0;
                if (alignment === 'left') dx = reference.left - bounds.left;
                if (alignment === 'horizontal-center') dx = (reference.left + reference.right) / 2 - (bounds.left + widthOfBounds / 2);
                if (alignment === 'right') dx = reference.right - bounds.right;
                if (alignment === 'top') dy = reference.top - bounds.top;
                if (alignment === 'vertical-center') dy = (reference.top + reference.bottom) / 2 - (bounds.top + heightOfBounds / 2);
                if (alignment === 'bottom') dy = reference.bottom - bounds.bottom;
                moveLayerPixels(layer, Math.round(dx), Math.round(dy), layers);
            });
            set({ layers: [...layers] });
        },
    }),

    distributeSelectedLayers: (distribution) => get().executeDocumentCommand({
        kind: 'transform',
        label: `Distribute ${distribution.replace(/-/g, ' ')}`,
        affectedIds: get().selectedLayerIds,
        run: () => {
            const { layers, selectedLayerIds } = get();
            const selectedIdSet = new Set(selectedLayerIds);
            const targets = layers
                .filter(layer => selectedIdSet.has(layer.id))
                .filter(layer => !hasSelectedAncestor(layer, selectedIdSet, layers))
                .map(layer => ({ layer, bounds: layerContentBounds(layer, layers) }))
                .filter((item): item is { layer: Layer; bounds: Bounds } => item.bounds !== null);
            if (targets.length < 3) return;
            const metric = (bounds: Bounds): number => {
                if (distribution === 'left') return bounds.left;
                if (distribution === 'horizontal-center') return (bounds.left + bounds.right) / 2;
                if (distribution === 'right') return bounds.right;
                if (distribution === 'top') return bounds.top;
                if (distribution === 'vertical-center') return (bounds.top + bounds.bottom) / 2;
                return bounds.bottom;
            };
            const sorted = [...targets].sort((a, b) => metric(a.bounds) - metric(b.bounds));
            const first = metric(sorted[0].bounds);
            const last = metric(sorted[sorted.length - 1].bounds);
            const step = (last - first) / (sorted.length - 1);
            sorted.forEach((item, index) => {
                const desired = first + step * index;
                const delta = Math.round(desired - metric(item.bounds));
                const horizontal = distribution === 'left' || distribution === 'horizontal-center' || distribution === 'right';
                moveLayerPixels(item.layer, horizontal ? delta : 0, horizontal ? 0 : delta, layers);
            });
            set({ layers: [...layers] });
        },
    }),

    toggleLayerVisibility: (id) => get().executeDocumentCommand({
        kind: 'layer-property',
        label: 'Layer Visibility',
        affectedIds: [id],
        layerId: id,
        run: () => set((state) => ({
        layers: state.layers.map(l => {
            if (l.id === id) {
                l.visible = !l.visible;
                return l;
            }
            return l;
        }),
        })),
    }),

    setLayerOpacity: (id, opacity) => get().executeDocumentCommand({
        kind: 'layer-property',
        label: 'Layer Opacity',
        affectedIds: [id],
        layerId: id,
        run: () => set((state) => ({
        layers: state.layers.map(l => {
            if (l.id === id) {
                l.opacity = opacity;
                return l;
            }
            return l;
        }),
        })),
    }),

    setLayerBlendMode: (id, mode) => get().executeDocumentCommand({
        kind: 'layer-property',
        label: 'Layer Blend Mode',
        affectedIds: [id],
        layerId: id,
        run: () => set((state) => ({
        layers: state.layers.map(l => {
            if (l.id === id) {
                l.blendMode = mode;
                return l;
            }
            return l;
        }),
        })),
    }),

    mergeLayerDown: (id) => {
        get().executeDocumentCommand({
            kind: 'layer-remove',
            label: 'Merge Down',
            affectedIds: [id],
            layerId: id,
            run: () => {
        const { layers } = get();
        const index = layers.findIndex(l => l.id === id);
        if (index <= 0) return;

        const topLayer = layers[index];
        const bottomLayer = layers[index - 1];

        const canvas = document.createElement('canvas');
        canvas.width = topLayer.canvas.width;
        canvas.height = topLayer.canvas.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(bottomLayer.canvas, 0, 0);
        ctx.save();
        ctx.globalAlpha = topLayer.opacity;
        ctx.globalCompositeOperation = topLayer.blendMode;
        if (topLayer.visible) ctx.drawImage(topLayer.canvas, 0, 0);
        ctx.restore();

        bottomLayer.canvas = canvas;
        bottomLayer.ctx = ctx;
        bottomLayer.markDirty(null);

        const newLayers = layers.filter(l => l.id !== topLayer.id);
        set({
            layers: newLayers,
            activeLayerId: bottomLayer.id,
        });
            },
        });
    },

    reorderLayers: (dragIndex, hoverIndex) => get().executeDocumentCommand({
        kind: 'layer-reorder',
        label: 'Reorder Layers',
        run: () => set((state) => {
        const newLayers = [...state.layers];
        const dragLayer = newLayers[dragIndex];
        newLayers.splice(dragIndex, 1);
        newLayers.splice(hoverIndex, 0, dragLayer);
        return { layers: newLayers };
        }),
    }),

    setLayerFill: (id, fill) => get().executeDocumentCommand({
        kind: 'layer-property',
        label: 'Layer Fill',
        affectedIds: [id],
        layerId: id,
        run: () => set((state) => ({
        layers: state.layers.map(l => {
            if (l.id === id) { l.fill = fill; }
            return l;
        }),
        })),
    }),

    soloLayer: (id) => get().executeDocumentCommand({
        kind: 'layer-property',
        label: 'Solo Layer',
        affectedIds: [id],
        layerId: id,
        run: () => set((state) => {
        const allOthersHidden = state.layers.every(l => l.id === id ? l.visible : !l.visible);
        return {
            layers: state.layers.map(l => {
                l.visible = allOthersHidden ? true : l.id === id;
                return l;
            }),
        };
        }),
    }),

    renameLayer: (id, name) => get().executeDocumentCommand({
        kind: 'layer-property',
        label: 'Rename Layer',
        affectedIds: [id],
        layerId: id,
        run: () => set((state) => ({
        layers: state.layers.map(l => {
            if (l.id === id) l.name = name;
            return l;
        }),
        })),
    }),

    setLayerLock: (id, kind, value) => get().executeDocumentCommand({
        kind: 'layer-property',
        label: 'Layer Lock',
        affectedIds: [id],
        layerId: id,
        run: () => set((state) => ({
        layers: state.layers.map(l => {
            if (l.id === id) l.locks = { ...l.locks, [kind]: value };
            return l;
        }),
        })),
    }),

    setLayerColorTag: (id, tag: LayerColorTag) => get().executeDocumentCommand({
        kind: 'layer-property',
        label: 'Layer Color Tag',
        affectedIds: [id],
        layerId: id,
        run: () => set((state) => ({
        layers: state.layers.map(l => {
            if (l.id === id) l.colorTag = tag;
            return l;
        }),
        })),
    }),

    mergeVisible: () => get().executeDocumentCommand({
        kind: 'layer-remove',
        label: 'Merge Visible',
        run: () => {
        const { layers, width, height } = get();
        const merged = new Layer(width, height, 'Merged');
        layers.forEach(l => {
            if (!l.visible) return;
            merged.ctx.save();
            merged.ctx.globalAlpha = l.opacity;
            merged.ctx.globalCompositeOperation = l.blendMode;
            merged.ctx.drawImage(l.canvas, 0, 0);
            merged.ctx.restore();
        });
        merged.markDirty(null);
        const remaining = layers.filter(l => !l.visible);
        set({ layers: [...remaining, merged], activeLayerId: merged.id });
        },
    }),

    stampVisible: () => get().executeDocumentCommand({
        kind: 'layer-add',
        label: 'Stamp Visible',
        run: () => {
        const { layers, width, height } = get();
        const stamped = new Layer(width, height, 'Merged Visible');
        layers.forEach(l => {
            if (!l.visible) return;
            stamped.ctx.save();
            stamped.ctx.globalAlpha = l.opacity;
            stamped.ctx.globalCompositeOperation = l.blendMode;
            stamped.ctx.drawImage(l.canvas, 0, 0);
            stamped.ctx.restore();
        });
        stamped.markDirty(null);
        set({ layers: [...layers, stamped], activeLayerId: stamped.id });
        },
    }),

    flattenImage: () => get().executeDocumentCommand({
        kind: 'layer-remove',
        label: 'Flatten Image',
        run: () => {
        const { layers, width, height } = get();
        const flat = new Layer(width, height, 'Background');
        layers.forEach(l => {
            if (!l.visible) return;
            flat.ctx.save();
            flat.ctx.globalAlpha = l.opacity;
            flat.ctx.globalCompositeOperation = l.blendMode;
            flat.ctx.drawImage(l.canvas, 0, 0);
            flat.ctx.restore();
        });
        flat.markDirty(null);
        set({ layers: [flat], activeLayerId: flat.id });
        },
    }),

    layerViaCopy: () => get().executeDocumentCommand({
        kind: 'layer-add',
        label: 'Layer Via Copy',
        run: () => {
        const { layers, activeLayerId } = get();
        const active = layers.find(l => l.id === activeLayerId);
        if (!active) return;
        const copy = new Layer(active.canvas.width, active.canvas.height, `${active.name} copy`);
        copy.ctx.drawImage(active.canvas, 0, 0);
        copy.opacity = active.opacity;
        copy.blendMode = active.blendMode;
        copy.markDirty(null);
        const idx = layers.findIndex(l => l.id === activeLayerId);
        const newLayers = [...layers];
        newLayers.splice(idx + 1, 0, copy);
        set({ layers: newLayers, activeLayerId: copy.id });
        },
    }),

    addFillLayer: (data, name) => get().executeDocumentCommand({
        kind: 'layer-add',
        label: name ?? (data.kind === 'solid-color' ? 'Color Fill' : 'Gradient Fill'),
        run: () => {
        const { width, height, layers } = get();
        const fill = createFillLayer(width, height, name ?? (data.kind === 'solid-color' ? 'Color Fill' : 'Gradient Fill'), data) as LayerWithMeta;
        fill.fillData = data;
        set({ layers: [...layers, fill], activeLayerId: fill.id });
        },
    }),
    addAdjustmentLayer: (adjustmentId, params, name) => get().executeDocumentCommand({
        kind: 'layer-add',
        label: name ?? 'Adjustment Layer',
        run: () => {
        const { width, height, layers } = get();
        const adj = getAdjustment(adjustmentId);
        if (!adj) return;
        const layer = new Layer(width, height, name ?? adj.label, 'adjustment') as LayerWithMeta;
        layer.adjustment = { id: adjustmentId, params: { ...adj.defaultParams, ...(params ?? {}) } };
        layer.markDirty(null);
        set({ layers: [...layers, layer], activeLayerId: layer.id });
        },
    }),
    addLayerMaskFromSelection: (id, mode) => get().executeDocumentCommand({
        kind: 'layer-property',
        label: mode === 'reveal' ? 'Add Mask From Selection (Reveal)' : 'Add Mask From Selection (Hide)',
        affectedIds: [id],
        layerId: id,
        run: () => {
            const state = get();
            const layer = state.layers.find(l => l.id === id);
            if (!layer || layer.mask) return;
            if (!state.selection.hasSelection) return;
            const w = layer.canvas.width;
            const h = layer.canvas.height;
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            // Default fill: black for "reveal" (we'll fill the selection white) or
            // white for "hide" (we'll fill the selection black).
            ctx.fillStyle = mode === 'reveal' ? '#000000' : '#ffffff';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = mode === 'reveal' ? '#ffffff' : '#000000';
            for (const op of state.selection.operations) {
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
            ctx.globalCompositeOperation = 'source-over';
            // Apply selection feather so the mask edge transitions softly rather
            // than producing a hard cut at the selection border. Implemented as
            // two-pass box blur on the red channel of the mask, then written
            // back as a grayscale image. We avoid ctx.filter because it is not
            // supported by the test backend (node-canvas).
            const feather = state.selection.feather ?? 0;
            if (feather > 0) {
                const radius = Math.max(1, Math.round(feather));
                const img = ctx.getImageData(0, 0, w, h);
                const src = new Uint8ClampedArray(w * h);
                for (let i = 0; i < src.length; i++) src[i] = img.data[i * 4];
                const tmp = new Float32Array(w * h);
                const r = radius;
                for (let y = 0; y < h; y++) {
                    let sum = 0;
                    for (let i = -r; i <= r; i++) sum += src[y * w + Math.max(0, Math.min(w - 1, i))];
                    for (let x = 0; x < w; x++) {
                        tmp[y * w + x] = sum / (2 * r + 1);
                        const xL = x - r;
                        const xR = x + r + 1;
                        sum -= src[y * w + Math.max(0, Math.min(w - 1, xL))];
                        sum += src[y * w + Math.max(0, Math.min(w - 1, xR))];
                    }
                }
                const out = new Uint8ClampedArray(w * h);
                for (let x = 0; x < w; x++) {
                    let sum = 0;
                    for (let i = -r; i <= r; i++) sum += tmp[Math.max(0, Math.min(h - 1, i)) * w + x];
                    for (let y = 0; y < h; y++) {
                        out[y * w + x] = Math.round(sum / (2 * r + 1));
                        const yT = y - r;
                        const yB = y + r + 1;
                        sum -= tmp[Math.max(0, Math.min(h - 1, yT)) * w + x];
                        sum += tmp[Math.max(0, Math.min(h - 1, yB)) * w + x];
                    }
                }
                for (let i = 0; i < out.length; i++) {
                    img.data[i * 4] = out[i];
                    img.data[i * 4 + 1] = out[i];
                    img.data[i * 4 + 2] = out[i];
                    img.data[i * 4 + 3] = 255;
                }
                ctx.putImageData(img, 0, 0);
            }
            layer.mask = { canvas, ctx, enabled: true, linked: true };
            layer.markDirty(null);
            set({ layers: [...state.layers] });
        },
    }),

    addLayerMask: (id, mode) => get().executeDocumentCommand({
        kind: 'layer-property',
        label: 'Add Layer Mask',
        affectedIds: [id],
        layerId: id,
        run: () => {
        const { layers } = get();
        const layer = layers.find(l => l.id === id);
        if (!layer || layer.mask) return;
        const canvas = document.createElement('canvas');
        canvas.width = layer.canvas.width;
        canvas.height = layer.canvas.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = mode === 'reveal-all' ? '#ffffff' : '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        layer.mask = { canvas, ctx, enabled: true, linked: true };
        layer.markDirty(null);
        set({ layers: [...layers] });
        },
    }),
    removeLayerMask: (id) => get().executeDocumentCommand({
        kind: 'layer-property',
        label: 'Delete Layer Mask',
        affectedIds: [id],
        layerId: id,
        run: () => {
        const { layers } = get();
        const layer = layers.find(l => l.id === id);
        if (!layer) return;
        layer.mask = null;
        layer.markDirty(null);
        set({ layers: [...layers] });
        },
    }),
    setLayerMaskEnabled: (id, enabled) => get().executeDocumentCommand({
        kind: 'layer-property',
        label: 'Layer Mask Enabled',
        affectedIds: [id],
        layerId: id,
        run: () => {
        const { layers } = get();
        const layer = layers.find(l => l.id === id);
        if (!layer || !layer.mask) return;
        layer.mask.enabled = enabled;
        layer.markDirty(null);
        set({ layers: [...layers] });
        },
    }),
    setLayerMaskLinked: (id, linked) => get().executeDocumentCommand({
        kind: 'layer-property',
        label: 'Link Layer Mask',
        affectedIds: [id],
        layerId: id,
        run: () => {
        const { layers } = get();
        const layer = layers.find(l => l.id === id);
        if (!layer || !layer.mask) return;
        layer.mask.linked = linked;
        set({ layers: [...layers] });
        },
    }),
    invertLayerMask: (id) => get().executeDocumentCommand({
        kind: 'layer-property',
        label: 'Invert Layer Mask',
        affectedIds: [id],
        layerId: id,
        run: () => {
        const { layers } = get();
        const layer = layers.find(l => l.id === id);
        if (!layer || !layer.mask) return;
        const ctx = layer.mask.ctx;
        const w = layer.mask.canvas.width;
        const h = layer.mask.canvas.height;
        const img = ctx.getImageData(0, 0, w, h);
        for (let i = 0; i < img.data.length; i += 4) {
            img.data[i] = 255 - img.data[i];
            img.data[i + 1] = 255 - img.data[i + 1];
            img.data[i + 2] = 255 - img.data[i + 2];
        }
        ctx.putImageData(img, 0, 0);
        layer.markDirty(null);
        set({ layers: [...layers] });
        },
    }),
    applyLayerMask: (id) => get().executeDocumentCommand({
        kind: 'layer-property',
        label: 'Apply Layer Mask',
        affectedIds: [id],
        layerId: id,
        run: () => {
        const { layers } = get();
        const layer = layers.find(l => l.id === id);
        if (!layer || !layer.mask) return;
        const w = layer.canvas.width;
        const h = layer.canvas.height;
        const lctx = layer.ctx;
        const layerData = lctx.getImageData(0, 0, w, h);
        const maskData = layer.mask.ctx.getImageData(0, 0, w, h).data;
        for (let i = 0; i < layerData.data.length; i += 4) {
            const m = maskData[i] / 255;
            layerData.data[i + 3] = Math.round(layerData.data[i + 3] * m);
        }
        lctx.putImageData(layerData, 0, 0);
        layer.mask = null;
        layer.markDirty(null);
        set({ layers: [...layers] });
        },
    }),

    defringeLayer: (width) => {
        const state = get();
        const layerId = state.activeLayerId;
        if (!layerId) return;
        const layer = state.layers.find(l => l.id === layerId);
        if (!layer || layer.kind === 'group') return;
        const w = layer.canvas.width;
        const h = layer.canvas.height;
        const rect = { x: 0, y: 0, width: w, height: h };
        const before = captureLayerRegion(layer, rect);
        const img = layer.ctx.getImageData(0, 0, w, h);
        applyDefringe(img.data, w, h, Math.max(1, Math.round(width)));
        layer.ctx.putImageData(img, 0, 0);
        layer.markDirty(null);
        state.commitHistory(createPixelHistoryAction(layer, rect, before, 'Defringe'));
        set(s => ({ layers: [...s.layers] }));
    },

    removeWhiteMatte: () => {
        const state = get();
        const layerId = state.activeLayerId;
        if (!layerId) return;
        const layer = state.layers.find(l => l.id === layerId);
        if (!layer || layer.kind === 'group') return;
        const w = layer.canvas.width;
        const h = layer.canvas.height;
        const rect = { x: 0, y: 0, width: w, height: h };
        const before = captureLayerRegion(layer, rect);
        const img = layer.ctx.getImageData(0, 0, w, h);
        applyMatteRemoval(img.data, 255);
        layer.ctx.putImageData(img, 0, 0);
        layer.markDirty(null);
        state.commitHistory(createPixelHistoryAction(layer, rect, before, 'Remove White Matte'));
        set(s => ({ layers: [...s.layers] }));
    },

    removeBlackMatte: () => {
        const state = get();
        const layerId = state.activeLayerId;
        if (!layerId) return;
        const layer = state.layers.find(l => l.id === layerId);
        if (!layer || layer.kind === 'group') return;
        const w = layer.canvas.width;
        const h = layer.canvas.height;
        const rect = { x: 0, y: 0, width: w, height: h };
        const before = captureLayerRegion(layer, rect);
        const img = layer.ctx.getImageData(0, 0, w, h);
        applyMatteRemoval(img.data, 0);
        layer.ctx.putImageData(img, 0, 0);
        layer.markDirty(null);
        state.commitHistory(createPixelHistoryAction(layer, rect, before, 'Remove Black Matte'));
        set(s => ({ layers: [...s.layers] }));
    },

    setLayerMaskDensity: (id, density) => get().executeDocumentCommand({
        kind: 'layer-property',
        label: 'Mask Density',
        affectedIds: [id],
        layerId: id,
        run: () => {
            const { layers } = get();
            const layer = layers.find(l => l.id === id);
            if (!layer || !layer.mask) return;
            layer.mask.density = Math.max(0, Math.min(1, density));
            layer.markDirty(null);
            set({ layers: [...layers] });
        },
    }),

    setLayerMaskFeather: (id, feather) => get().executeDocumentCommand({
        kind: 'layer-property',
        label: 'Mask Feather',
        affectedIds: [id],
        layerId: id,
        run: () => {
            const { layers } = get();
            const layer = layers.find(l => l.id === id);
            if (!layer || !layer.mask) return;
            layer.mask.feather = Math.max(0, feather);
            layer.markDirty(null);
            set({ layers: [...layers] });
        },
    }),

    setLayerAdjustmentParams: (id, params) => get().executeDocumentCommand({
        kind: 'layer-property',
        label: 'Adjustment Params',
        affectedIds: [id],
        layerId: id,
        run: () => {
            const { layers } = get();
            const layer = layers.find(l => l.id === id) as LayerWithMeta | undefined;
            if (!layer || layer.kind !== 'adjustment' || !layer.adjustment) return;
            layer.adjustment = { ...layer.adjustment, params: { ...layer.adjustment.params, ...params } };
            layer.markDirty(null);
            set({ layers: [...layers] });
        },
    }),

    setLayerFillData: (id, data) => get().executeDocumentCommand({
        kind: 'layer-property',
        label: 'Fill Data',
        affectedIds: [id],
        layerId: id,
        run: () => {
            const { layers, width, height } = get();
            const layer = layers.find(l => l.id === id) as LayerWithMeta | undefined;
            if (!layer || layer.kind !== 'fill') return;
            layer.fillData = data;
            paintFillLayer(layer, data, width, height);
            layer.markDirty(null);
            set({ layers: [...layers] });
        },
    }),

    addLayerEffect: (id, kind) => get().executeDocumentCommand({
        kind: 'layer-property',
        label: `Add ${kind}`,
        affectedIds: [id], layerId: id,
        run: () => {
            const { layers } = get();
            const layer = layers.find(l => l.id === id);
            if (!layer) return;
            // Pull the renderer's defaults via async-safe lookup; fallback to {}.
            const effect = { kind, enabled: true, params: {} };
            layer.effects = [...(layer.effects ?? []), effect];
            layer.markDirty(null);
            set({ layers: [...layers] });
        },
    }),

    removeLayerEffect: (id, index) => get().executeDocumentCommand({
        kind: 'layer-property',
        label: 'Remove Effect',
        affectedIds: [id], layerId: id,
        run: () => {
            const { layers } = get();
            const layer = layers.find(l => l.id === id);
            if (!layer || !layer.effects) return;
            layer.effects = layer.effects.filter((_, i) => i !== index);
            layer.markDirty(null);
            set({ layers: [...layers] });
        },
    }),

    setLayerEffectEnabled: (id, index, enabled) => get().executeDocumentCommand({
        kind: 'layer-property',
        label: 'Toggle Effect',
        affectedIds: [id], layerId: id,
        run: () => {
            const { layers } = get();
            const layer = layers.find(l => l.id === id);
            if (!layer || !layer.effects || !layer.effects[index]) return;
            layer.effects = layer.effects.map((e, i) => i === index ? { ...e, enabled } : e);
            layer.markDirty(null);
            set({ layers: [...layers] });
        },
    }),

    setLayerEffectParams: (id, index, params) => get().executeDocumentCommand({
        kind: 'layer-property',
        label: 'Effect Params',
        affectedIds: [id], layerId: id,
        run: () => {
            const { layers } = get();
            const layer = layers.find(l => l.id === id);
            if (!layer || !layer.effects || !layer.effects[index]) return;
            layer.effects = layer.effects.map((e, i) =>
                i === index ? { ...e, params: { ...e.params, ...params } } : e,
            );
            layer.markDirty(null);
            set({ layers: [...layers] });
        },
    }),

    copyLayerStyle: (id) => {
        const { layers } = get();
        const layer = layers.find(l => l.id === id);
        if (!layer) return;
        const clone = (layer.effects ?? []).map(e => ({
            kind: e.kind,
            enabled: e.enabled,
            params: { ...e.params },
        }));
        get().setCopiedLayerStyle(clone);
    },

    pasteLayerStyle: (id) => {
        const copied = get().copiedLayerStyle;
        if (!copied) return;
        get().executeDocumentCommand({
            kind: 'layer-property',
            label: 'Paste Layer Style',
            affectedIds: [id], layerId: id,
            run: () => {
                const { layers } = get();
                const layer = layers.find(l => l.id === id);
                if (!layer) return;
                layer.effects = copied.map(e => ({
                    kind: e.kind,
                    enabled: e.enabled,
                    params: { ...e.params },
                }));
                layer.markDirty(null);
                set({ layers: [...layers] });
            },
        });
    },

    clearLayerStyle: (id) => get().executeDocumentCommand({
        kind: 'layer-property',
        label: 'Clear Layer Style',
        affectedIds: [id], layerId: id,
        run: () => {
            const { layers } = get();
            const layer = layers.find(l => l.id === id);
            if (!layer) return;
            layer.effects = [];
            layer.markDirty(null);
            set({ layers: [...layers] });
        },
    }),

    scaleLayerEffects: (id, scalePercent) => get().executeDocumentCommand({
        kind: 'layer-property',
        label: 'Scale Effects',
        affectedIds: [id], layerId: id,
        run: () => {
            const { layers } = get();
            const layer = layers.find(l => l.id === id);
            if (!layer || !layer.effects) return;
            const factor = Math.max(0.01, scalePercent / 100);
            const SCALABLE = new Set(['size', 'distance', 'spread', 'depth', 'soften']);
            layer.effects = layer.effects.map(e => {
                const next: Record<string, unknown> = { ...e.params };
                for (const key of Object.keys(next)) {
                    if (SCALABLE.has(key) && typeof next[key] === 'number') {
                        next[key] = (next[key] as number) * factor;
                    }
                }
                return { kind: e.kind, enabled: e.enabled, params: next };
            });
            layer.markDirty(null);
            set({ layers: [...layers] });
        },
    }),

    rasterizeTypeLayer: (id) => get().executeDocumentCommand({
        kind: 'layer-property',
        label: 'Rasterize Type',
        affectedIds: [id], layerId: id,
        run: () => {
            const { layers } = get();
            const layer = layers.find(l => l.id === id);
            if (!layer || layer.kind !== 'type') return;
            // The layer canvas already holds the rasterized text from
            // commitTypeLayer/rerenderTypeLayer. Drop the typeData source and
            // change kind to 'raster' so Type-tool double-click stops re-entering
            // edit mode.
            (layer as unknown as { kind: string }).kind = 'raster';
            layer.typeData = null;
            layer.markDirty(null);
            set({ layers: [...layers] });
        },
    }),

    duplicateLayer: (id) => get().executeDocumentCommand({
        kind: 'layer-add',
        label: 'Duplicate Layer',
        run: () => {
            const { layers } = get();
            const src = layers.find(l => l.id === id);
            if (!src) return;
            const dup = new Layer(src.canvas.width, src.canvas.height, `${src.name} copy`, src.kind) as LayerWithMeta;
            dup.visible = src.visible;
            dup.opacity = src.opacity;
            dup.fill = src.fill;
            dup.blendMode = src.blendMode;
            dup.parentId = src.parentId;
            dup.expanded = src.expanded;
            dup.locks = { ...src.locks };
            dup.colorTag = src.colorTag;
            dup.typeData = src.typeData ? structuredClone(src.typeData) : null;
            const srcMeta = src as LayerWithMeta;
            if (srcMeta.adjustment) dup.adjustment = { id: srcMeta.adjustment.id, params: { ...srcMeta.adjustment.params } };
            if (srcMeta.fillData) dup.fillData = JSON.parse(JSON.stringify(srcMeta.fillData)) as FillLayerData;
            if (src.effects) dup.effects = src.effects.map(e => ({ ...e, params: { ...e.params } }));
            dup.ctx.drawImage(src.canvas, 0, 0);
            if (src.mask) {
                const maskCanvas = document.createElement('canvas');
                maskCanvas.width = src.mask.canvas.width;
                maskCanvas.height = src.mask.canvas.height;
                const mctx = maskCanvas.getContext('2d');
                if (mctx) {
                    mctx.drawImage(src.mask.canvas, 0, 0);
                    dup.mask = {
                        canvas: maskCanvas, ctx: mctx,
                        enabled: src.mask.enabled,
                        linked: src.mask.linked,
                        density: src.mask.density,
                        feather: src.mask.feather,
                    };
                }
            }
            dup.markDirty(null);
            const idx = layers.findIndex(l => l.id === id);
            const next = [...layers];
            next.splice(idx + 1, 0, dup);
            set({
                layers: next,
                activeLayerId: dup.id,
                selectedLayerIds: [dup.id],
                layerSelectionAnchorId: dup.id,
                activeLayerEditTarget: 'layer',
            });
        },
    }),

    setLayerName: (id, name) => get().executeDocumentCommand({
        kind: 'layer-property',
        label: 'Rename Layer',
        affectedIds: [id],
        layerId: id,
        run: () => {
            const { layers } = get();
            const layer = layers.find(l => l.id === id);
            if (!layer) return;
            layer.name = name;
            set({ layers: [...layers] });
        },
    }),

    layerViaCut: () => get().executeDocumentCommand({
        kind: 'layer-add',
        label: 'Layer Via Cut',
        run: () => {
        const { layers, activeLayerId } = get();
        const active = layers.find(l => l.id === activeLayerId);
        if (!active) return;
        const cut = new Layer(active.canvas.width, active.canvas.height, `${active.name} cut`);
        cut.ctx.drawImage(active.canvas, 0, 0);
        active.ctx.clearRect(0, 0, active.canvas.width, active.canvas.height);
        cut.markDirty(null);
        active.markDirty(null);
        const idx = layers.findIndex(l => l.id === activeLayerId);
        const newLayers = [...layers];
        newLayers.splice(idx + 1, 0, cut);
        set({ layers: newLayers, activeLayerId: cut.id });
        },
    }),
});
