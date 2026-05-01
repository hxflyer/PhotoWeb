import type { StateCreator } from 'zustand';
import { Layer } from '../core/Layer';
import type { LayerColorTag } from '../core/Layer';
import { createFillLayer, type FillLayerData } from '../core/fillLayer';
import { getAdjustment } from '../adjustments';
import type { EditorStore, LayersSlice } from './types';

interface LayerWithMeta extends Layer {
    adjustment?: { id: string; params: Record<string, unknown> };
    fillData?: FillLayerData;
}

export const createLayersSlice: StateCreator<EditorStore, [], [], LayersSlice> = (set, get) => ({
    layers: [],
    activeLayerId: null,

    addLayer: () => {
        const { width, height, layers } = get();
        const newLayer = new Layer(width, height, `Layer ${layers.length + 1}`);
        set({
            layers: [...layers, newLayer],
            activeLayerId: newLayer.id,
        });
    },

    addLayerFromImage: (img, name) => {
        const { width, height, layers } = get();
        const newLayer = new Layer(width, height, name);
        const x = (width - img.width) / 2;
        const y = (height - img.height) / 2;
        newLayer.ctx.drawImage(img, x, y);
        newLayer.markDirty(null);
        set({
            layers: [...layers, newLayer],
            activeLayerId: newLayer.id,
        });
    },

    addLayerFromContent: (content, name, insertAfterId) => {
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
        });
    },

    removeLayer: (id) => {
        set((state) => ({
            layers: state.layers.filter(l => l.id !== id),
            activeLayerId: state.activeLayerId === id ? null : state.activeLayerId,
        }));
    },

    setActiveLayer: (id) => set({ activeLayerId: id }),

    toggleLayerVisibility: (id) => set((state) => ({
        layers: state.layers.map(l => {
            if (l.id === id) {
                l.visible = !l.visible;
                return l;
            }
            return l;
        }),
    })),

    setLayerOpacity: (id, opacity) => set((state) => ({
        layers: state.layers.map(l => {
            if (l.id === id) {
                l.opacity = opacity;
                return l;
            }
            return l;
        }),
    })),

    setLayerBlendMode: (id, mode) => set((state) => ({
        layers: state.layers.map(l => {
            if (l.id === id) {
                l.blendMode = mode;
                return l;
            }
            return l;
        }),
    })),

    mergeLayerDown: (id) => {
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

    reorderLayers: (dragIndex, hoverIndex) => set((state) => {
        const newLayers = [...state.layers];
        const dragLayer = newLayers[dragIndex];
        newLayers.splice(dragIndex, 1);
        newLayers.splice(hoverIndex, 0, dragLayer);
        return { layers: newLayers };
    }),

    setLayerFill: (id, fill) => set((state) => ({
        layers: state.layers.map(l => {
            if (l.id === id) { l.fill = fill; }
            return l;
        }),
    })),

    soloLayer: (id) => set((state) => {
        const allOthersHidden = state.layers.every(l => l.id === id ? l.visible : !l.visible);
        return {
            layers: state.layers.map(l => {
                l.visible = allOthersHidden ? true : l.id === id;
                return l;
            }),
        };
    }),

    renameLayer: (id, name) => set((state) => ({
        layers: state.layers.map(l => {
            if (l.id === id) l.name = name;
            return l;
        }),
    })),

    setLayerLock: (id, kind, value) => set((state) => ({
        layers: state.layers.map(l => {
            if (l.id === id) l.locks = { ...l.locks, [kind]: value };
            return l;
        }),
    })),

    setLayerColorTag: (id, tag: LayerColorTag) => set((state) => ({
        layers: state.layers.map(l => {
            if (l.id === id) l.colorTag = tag;
            return l;
        }),
    })),

    mergeVisible: () => {
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

    stampVisible: () => {
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

    flattenImage: () => {
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

    layerViaCopy: () => {
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

    addFillLayer: (data, name) => {
        const { width, height, layers } = get();
        const fill = createFillLayer(width, height, name ?? (data.kind === 'solid-color' ? 'Color Fill' : 'Gradient Fill'), data) as LayerWithMeta;
        fill.fillData = data;
        set({ layers: [...layers, fill], activeLayerId: fill.id });
    },
    addAdjustmentLayer: (adjustmentId, params, name) => {
        const { width, height, layers } = get();
        const adj = getAdjustment(adjustmentId);
        if (!adj) return;
        const layer = new Layer(width, height, name ?? adj.label, 'adjustment') as LayerWithMeta;
        layer.adjustment = { id: adjustmentId, params: params ?? adj.defaultParams };
        layer.markDirty(null);
        set({ layers: [...layers, layer], activeLayerId: layer.id });
    },
    addLayerMask: (id, mode) => {
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
    removeLayerMask: (id) => {
        const { layers } = get();
        const layer = layers.find(l => l.id === id);
        if (!layer) return;
        layer.mask = null;
        layer.markDirty(null);
        set({ layers: [...layers] });
    },
    setLayerMaskEnabled: (id, enabled) => {
        const { layers } = get();
        const layer = layers.find(l => l.id === id);
        if (!layer || !layer.mask) return;
        layer.mask.enabled = enabled;
        layer.markDirty(null);
        set({ layers: [...layers] });
    },
    setLayerMaskLinked: (id, linked) => {
        const { layers } = get();
        const layer = layers.find(l => l.id === id);
        if (!layer || !layer.mask) return;
        layer.mask.linked = linked;
        set({ layers: [...layers] });
    },
    invertLayerMask: (id) => {
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
    applyLayerMask: (id) => {
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

    layerViaCut: () => {
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
});
