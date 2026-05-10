// Move tool — reference Tool migration. Pattern (followed by every other tool):
//   1. Tool defines pure behavior in onPointerDown / onPointerMove / onPointerUp /
//      onKeyDown. It NEVER mutates state directly — every change goes through
//      store actions (store.setPan, store.commitHistory, ...). Per-stroke local
//      state lives in module-level let bindings or closures, NOT in the store.
//   2. Tool registers itself in src/tools/registry.ts; the Viewport dispatches
//      pointer/key events to whichever Tool is active. The Viewport must stay
//      tool-agnostic — no `if (activeTool === 'move')` branches.
//   3. Pixel-mutating tools commit a {kind: 'pixel', beforeBuffer, afterBuffer,
//      dirtyRect} action via store.commitHistory before releasing the stroke.
//      Non-pixel tools (Move, Hand, selection tools that only change selection
//      state) commit a generic {apply, revert} action.
import type { Tool } from './Tool';
import type { Layer } from '../core/Layer';
import { registerTool } from './registry';

interface DragState {
    startCanvasX: number;
    startCanvasY: number;
    lastDx: number;
    lastDy: number;
    moved: boolean;
    targets: MoveTarget[];
}

interface MoveTarget {
    layer: Layer;
    layerId: string;
    name: string;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    before: ImageData;
    snapshotCanvas: HTMLCanvasElement;
}

let drag: DragState | null = null;

export const moveTool: Tool = {
    id: 'move',
    label: 'Move',
    cursor: 'grab',
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        const { layers, activeLayerId } = ctx.getStore();
        const activeLayer = layers.find(layer => layer.id === activeLayerId);
        if (!activeLayer || activeLayer.lockPosition || activeLayer.locks.all) return;

        const before = activeLayer.ctx.getImageData(0, 0, activeLayer.canvas.width, activeLayer.canvas.height);
        const snapshotCanvas = document.createElement('canvas');
        snapshotCanvas.width = activeLayer.canvas.width;
        snapshotCanvas.height = activeLayer.canvas.height;
        const snapshotCtx = snapshotCanvas.getContext('2d');
        if (!snapshotCtx) return;
        snapshotCtx.putImageData(before, 0, 0);

        drag = {
            startCanvasX: e.canvasX,
            startCanvasY: e.canvasY,
            lastDx: 0,
            lastDy: 0,
            moved: false,
            targets: [{
                layer: activeLayer,
                layerId: activeLayer.id,
                name: activeLayer.name,
                canvas: activeLayer.canvas,
                ctx: activeLayer.ctx,
                before,
                snapshotCanvas,
            }],
        };
        e.rawEvent.preventDefault();
    },
    onPointerMove: (e, ctx) => {
        if (!drag) return;
        const dx = Math.round(e.canvasX - drag.startCanvasX);
        const dy = Math.round(e.canvasY - drag.startCanvasY);
        if (dx === drag.lastDx && dy === drag.lastDy) return;
        drag.lastDx = dx;
        drag.lastDy = dy;
        drag.moved = drag.moved || dx !== 0 || dy !== 0;

        for (const target of drag.targets) {
            target.ctx.clearRect(0, 0, target.canvas.width, target.canvas.height);
            target.ctx.drawImage(target.snapshotCanvas, dx, dy);
            target.layer.markDirty(null);
        }
        ctx.requestRender();
    },
    onPointerUp: (_e, ctx) => {
        if (drag?.moved && drag.targets.length > 0) {
            const targets = drag.targets.map(target => ({
                layerId: target.layerId,
                name: target.name,
                layer: target.layer,
                ctx: target.ctx,
                canvas: target.canvas,
                before: target.before,
                after: target.ctx.getImageData(0, 0, target.canvas.width, target.canvas.height),
            }));
            ctx.getStore().commitHistory({
                kind: 'transform',
                label: targets.length === 1 ? `Move ${targets[0].name}` : `Move ${targets.length} Layers`,
                timestamp: Date.now(),
                apply: () => {
                    for (const target of targets) {
                        target.ctx.putImageData(target.after, 0, 0);
                        target.layer.markDirty(null);
                    }
                },
                revert: () => {
                    for (const target of targets) {
                        target.ctx.putImageData(target.before, 0, 0);
                        target.layer.markDirty(null);
                    }
                },
            });
        }
        drag = null;
        ctx.requestRender();
    },
};

registerTool(moveTool);
