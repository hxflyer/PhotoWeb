import type { Tool } from './Tool';
import { registerTool } from './registry';

let panState: { lastClientX: number; lastClientY: number } | null = null;

export const handTool: Tool = {
    id: 'hand',
    label: 'Hand',
    cursor: 'grab',
    onPointerDown: (e) => {
        if (e.button !== 0 && e.button !== 1) return;
        panState = { lastClientX: e.clientX, lastClientY: e.clientY };
    },
    onPointerMove: (e, ctx) => {
        if (!panState) return;
        const store = ctx.getStore();
        const dx = e.clientX - panState.lastClientX;
        const dy = e.clientY - panState.lastClientY;
        store.setPan(store.pan.x + dx, store.pan.y + dy);
        panState.lastClientX = e.clientX;
        panState.lastClientY = e.clientY;
    },
    onPointerUp: () => { panState = null; },
};

export const zoomTool: Tool = {
    id: 'zoom',
    label: 'Zoom',
    cursor: 'zoom-in',
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        const store = ctx.getStore();
        const factor = e.alt ? 0.5 : 2;
        const newZoom = Math.max(0.05, Math.min(32, store.zoom * factor));
        store.setZoom(newZoom);
    },
};

registerTool(handTool);
registerTool(zoomTool);
