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
import { registerTool } from './registry';

interface DragState {
    lastClientX: number;
    lastClientY: number;
    panStartX: number;
    panStartY: number;
}

let drag: DragState | null = null;

export const moveTool: Tool = {
    id: 'move',
    label: 'Move',
    cursor: 'grab',
    onPointerDown: (e, ctx) => {
        if (e.button !== 0 && e.button !== 1) return;
        const { pan } = ctx.getStore();
        drag = {
            lastClientX: e.clientX,
            lastClientY: e.clientY,
            panStartX: pan.x,
            panStartY: pan.y,
        };
    },
    onPointerMove: (e, ctx) => {
        if (!drag) return;
        const dx = e.clientX - drag.lastClientX;
        const dy = e.clientY - drag.lastClientY;
        const { pan, setPan } = ctx.getStore();
        setPan(pan.x + dx, pan.y + dy);
        drag.lastClientX = e.clientX;
        drag.lastClientY = e.clientY;
    },
    onPointerUp: () => {
        drag = null;
    },
};

registerTool(moveTool);
