import { nearestAxisStraightenDegrees } from '../core/imageTransforms';
import { useEditorStore } from '../store/editorStore';
import type { Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';

export interface RulerMeasurement {
    start: { x: number; y: number };
    end: { x: number; y: number };
}

type RulerDrag =
    | { mode: 'new'; point: { x: number; y: number } }
    | { mode: 'start' | 'end' };

const MIN_RULER_LENGTH = 4;

const state: {
    measurement: RulerMeasurement | null;
    drag: RulerDrag | null;
} = {
    measurement: null,
    drag: null,
};

function point(e: ToolPointerEvent): { x: number; y: number } {
    return { x: e.canvasX, y: e.canvasY };
}

function endpointAt(p: { x: number; y: number }, zoom: number): 'start' | 'end' | null {
    if (!state.measurement) return null;
    const hit = 10 / Math.max(zoom, 0.01);
    const near = (q: { x: number; y: number }) => Math.hypot(p.x - q.x, p.y - q.y) <= hit;
    if (near(state.measurement.start)) return 'start';
    if (near(state.measurement.end)) return 'end';
    return null;
}

export function getRulerMeasurement(): RulerMeasurement | null {
    return state.measurement
        ? { start: { ...state.measurement.start }, end: { ...state.measurement.end } }
        : null;
}

export function clearRulerMeasurement(): void {
    state.measurement = null;
    state.drag = null;
}

export function rulerCanStraighten(): boolean {
    if (!state.measurement) return false;
    const dx = state.measurement.end.x - state.measurement.start.x;
    const dy = state.measurement.end.y - state.measurement.start.y;
    return Math.hypot(dx, dy) > MIN_RULER_LENGTH && !!useEditorStore.getState().activeLayerId;
}

export function straightenRulerMeasurement(): boolean {
    if (!state.measurement || !rulerCanStraighten()) return false;
    const dx = state.measurement.end.x - state.measurement.start.x;
    const dy = state.measurement.end.y - state.measurement.start.y;
    const correction = nearestAxisStraightenDegrees(dx, dy);
    if (Math.abs(correction) < 0.0001) return false;
    useEditorStore.getState().straightenActiveLayer(correction);
    return true;
}

export const rulerTool: Tool = {
    id: 'ruler',
    label: 'Ruler',
    cursor: 'crosshair',
    onPointerDown: (e, ctx) => {
        if (e.button !== 0) return;
        const p = point(e);
        const endpoint = endpointAt(p, ctx.getStore().zoom);
        if (endpoint) {
            state.drag = { mode: endpoint };
        } else {
            state.measurement = { start: p, end: p };
            state.drag = { mode: 'new', point: p };
        }
        ctx.requestRender();
    },
    onPointerMove: (e, ctx) => {
        if (!state.drag || !state.measurement) return;
        const p = point(e);
        if (state.drag.mode === 'start') state.measurement.start = p;
        else state.measurement.end = p;
        ctx.requestRender();
    },
    onPointerUp: (_e, ctx) => {
        state.drag = null;
        ctx.requestRender();
    },
    onKeyDown: (e, ctx) => {
        if (e.key === 'Escape') {
            e.rawEvent.preventDefault();
            clearRulerMeasurement();
            ctx.requestRender();
        }
    },
    renderOverlay: ({ ctx, zoom }) => {
        const m = state.measurement;
        if (!m) return;
        const r = 5 / Math.max(zoom, 0.01);
        ctx.save();
        ctx.strokeStyle = '#22a3ff';
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 2 / Math.max(zoom, 0.01);
        ctx.beginPath();
        ctx.moveTo(m.start.x, m.start.y);
        ctx.lineTo(m.end.x, m.end.y);
        ctx.stroke();
        for (const p of [m.start, m.end]) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();
    },
};

registerTool(rulerTool);
