import type { Tool, ToolContext } from './Tool';
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

// Photoshop Zoom Tool: click zooms in (or out with Alt) AROUND the click
// point — the clicked pixel stays under the cursor. Drag horizontally
// (Scrubby Zoom) maps drag distance to an exponential zoom factor, again
// anchored at the initial click.
const SCRUBBY_THRESHOLD_PX = 4;
const SCRUBBY_K = 0.005;

interface ZoomDrag {
    anchorCanvasX: number;
    anchorCanvasY: number;
    anchorClientX: number;
    anchorClientY: number;
    startZoom: number;
    scrubbed: boolean;
    altAtDown: boolean;
}
let zoomDrag: ZoomDrag | null = null;

function applyZoomAtPoint(ctx: ToolContext, anchorCanvas: { x: number; y: number }, newZoom: number): void {
    const store = ctx.getStore();
    const clamped = Math.max(0.05, Math.min(32, newZoom));
    if (clamped === store.zoom) return;
    // The display transform is `screen = pan + canvas * zoom`. To keep the
    // anchor pixel on screen, the new pan satisfies:
    //   pan_new = pan_old + anchor * (zoom_old - zoom_new)
    const newPanX = store.pan.x + anchorCanvas.x * (store.zoom - clamped);
    const newPanY = store.pan.y + anchorCanvas.y * (store.zoom - clamped);
    store.setZoom(clamped);
    store.setPan(newPanX, newPanY);
}

export const zoomTool: Tool = {
    id: 'zoom',
    label: 'Zoom',
    cursor: 'zoom-in',
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        const store = ctx.getStore();
        zoomDrag = {
            anchorCanvasX: e.canvasX,
            anchorCanvasY: e.canvasY,
            anchorClientX: e.clientX,
            anchorClientY: e.clientY,
            startZoom: store.zoom,
            scrubbed: false,
            altAtDown: e.alt,
        };
    },
    onPointerMove: (e, ctx) => {
        if (!zoomDrag) return;
        const dx = e.clientX - zoomDrag.anchorClientX;
        const dy = e.clientY - zoomDrag.anchorClientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (!zoomDrag.scrubbed && dist <= SCRUBBY_THRESHOLD_PX) return;
        zoomDrag.scrubbed = true;
        const factor = Math.exp(dx * SCRUBBY_K);
        applyZoomAtPoint(ctx, { x: zoomDrag.anchorCanvasX, y: zoomDrag.anchorCanvasY }, zoomDrag.startZoom * factor);
    },
    onPointerUp: (e, ctx) => {
        if (!zoomDrag) return;
        const wasScrubbed = zoomDrag.scrubbed;
        const anchor = { x: zoomDrag.anchorCanvasX, y: zoomDrag.anchorCanvasY };
        const alt = zoomDrag.altAtDown || e.alt;
        const store = ctx.getStore();
        zoomDrag = null;
        if (wasScrubbed) return; // drag already updated zoom continuously
        const factor = alt ? 0.5 : 2;
        applyZoomAtPoint(ctx, anchor, store.zoom * factor);
    },
};

registerTool(handTool);
registerTool(zoomTool);

// Exposed for non-tool callers (e.g. Alt+wheel handler in Viewport, scrubby
// slider in StatusBar) that need the same zoom-at-point math without going
// through the Tool interface.
export { applyZoomAtPoint };
