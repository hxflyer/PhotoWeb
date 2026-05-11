/**
 * History-safe wrappers for editable shape-layer edits driven by the
 * Properties panel (PROPS-05). Photoshop treats every Properties-panel shape
 * tweak as a single undoable command, with slider drags coalesced into one
 * entry on drag end (mouseUp / blur / select change). The helpers below
 * mirror that contract while keeping the existing `rerenderShapeLayer`
 * lifecycle intact.
 */
import { useEditorStore } from '../store/editorStore';
import { createCommandAction } from '../core/history';
import type { Layer } from '../core/Layer';
import { rerenderShapeLayer } from './shapeRender';
import type { ShapeData } from '../store/types';

export function cloneShapeData(data: ShapeData): ShapeData {
    if (typeof structuredClone === 'function') return structuredClone(data) as ShapeData;
    return JSON.parse(JSON.stringify(data)) as ShapeData;
}

/**
 * Rewrite a shape's geometry in-place: translate by (dx, dy), scale by
 * (scaleX, scaleY) around its centroid, and rotate by `rotationDelta` radians.
 * Each variant translates the relevant fields (bounds / center / endpoints)
 * rather than rasterizing — Move Tool and Free Transform call this to keep
 * shape layers editable across transforms.
 */
export function moveShapeTarget(
    data: ShapeData,
    dx: number,
    dy: number,
    scaleX: number,
    scaleY: number,
    rotationDelta: number,
): ShapeData {
    const next = cloneShapeData(data);
    switch (next.kind) {
        case 'rect':
        case 'rounded-rect':
        case 'ellipse':
        case 'custom': {
            next.bounds = {
                x: next.bounds.x * scaleX + dx,
                y: next.bounds.y * scaleY + dy,
                w: Math.max(1, next.bounds.w * scaleX),
                h: Math.max(1, next.bounds.h * scaleY),
            };
            return next;
        }
        case 'polygon': {
            next.center = { x: next.center.x * scaleX + dx, y: next.center.y * scaleY + dy };
            const radiusScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
            next.radius = Math.max(1, next.radius * radiusScale);
            next.rotation = (next.rotation ?? 0) + rotationDelta;
            return next;
        }
        case 'line': {
            const p0 = { x: next.p0.x, y: next.p0.y };
            const p1 = { x: next.p1.x, y: next.p1.y };
            const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
            const scaleAround = (pt: { x: number; y: number }) => ({
                x: mid.x + (pt.x - mid.x) * scaleX,
                y: mid.y + (pt.y - mid.y) * scaleY,
            });
            let s0 = scaleAround(p0);
            let s1 = scaleAround(p1);
            if (rotationDelta !== 0) {
                const cos = Math.cos(rotationDelta);
                const sin = Math.sin(rotationDelta);
                const rotateAround = (pt: { x: number; y: number }) => ({
                    x: mid.x + (pt.x - mid.x) * cos - (pt.y - mid.y) * sin,
                    y: mid.y + (pt.x - mid.x) * sin + (pt.y - mid.y) * cos,
                });
                s0 = rotateAround(s0);
                s1 = rotateAround(s1);
            }
            next.p0 = { x: s0.x + dx, y: s0.y + dy };
            next.p1 = { x: s1.x + dx, y: s1.y + dy };
            return next;
        }
    }
}

function findLayer(layerId: string): Layer | undefined {
    return useEditorStore.getState().layers.find(l => l.id === layerId);
}

function setShapeDataAndRerender(layer: Layer, data: ShapeData): void {
    layer.shapeData = data;
    rerenderShapeLayer(layer);
    useEditorStore.setState(state => ({ layers: [...state.layers] }));
}

/**
 * Apply a partial ShapeData patch as a single undoable command. Use this for
 * one-shot edits (color pick, select change, blurred numeric, toggle). The
 * patch is merged onto a clone of the current shapeData so the discriminated
 * `kind` stays intact and unrelated fields are preserved.
 */
export function applyShapeEdit(
    layerId: string,
    label: string,
    patch: Partial<ShapeData>,
): void {
    const layer = findLayer(layerId);
    if (!layer) return;
    const current = layer.shapeData as ShapeData | null;
    if (!current) return;
    const before = cloneShapeData(current);
    const merged = { ...cloneShapeData(current), ...patch } as ShapeData;
    const action = createCommandAction({
        kind: 'layer-property',
        label,
        layerId,
        affectedIds: [layerId],
        apply: () => {
            const l = findLayer(layerId);
            if (!l) return;
            setShapeDataAndRerender(l, cloneShapeData(merged));
        },
        revert: () => {
            const l = findLayer(layerId);
            if (!l) return;
            setShapeDataAndRerender(l, cloneShapeData(before));
        },
    });
    useEditorStore.getState().executeCommand(action);
}

interface CoalescedShapeSession {
    layerId: string;
    label: string;
    before: ShapeData;
}

let activeSession: CoalescedShapeSession | null = null;

/**
 * Begin a coalesced shape-edit session for a slider/numeric drag. Subsequent
 * `applyCoalescedShapePatch` calls mutate the layer's shapeData live (with
 * rerender) but do NOT touch history. On `commitCoalescedShapeEdit()` a
 * single command is recorded that snapshots from the pre-drag value to the
 * final value.
 *
 * If a session is already active for a different layer/label, that session is
 * committed first so each drag gets its own history entry.
 */
export function beginCoalescedShapeEdit(layerId: string, label: string): void {
    if (activeSession && (activeSession.layerId !== layerId || activeSession.label !== label)) {
        commitCoalescedShapeEdit();
    }
    if (activeSession) return;
    const layer = findLayer(layerId);
    if (!layer) return;
    const current = layer.shapeData as ShapeData | null;
    if (!current) return;
    activeSession = { layerId, label, before: cloneShapeData(current) };
}

/**
 * Apply a transient ShapeData patch within an active coalesced session. If no
 * session is active, falls back to a one-shot history entry so callers can
 * wire onChange handlers identically and rely on onMouseUp/onBlur to coalesce.
 */
export function applyCoalescedShapePatch(
    layerId: string,
    label: string,
    patch: Partial<ShapeData>,
): void {
    if (!activeSession || activeSession.layerId !== layerId) {
        applyShapeEdit(layerId, label, patch);
        return;
    }
    const layer = findLayer(layerId);
    if (!layer) return;
    const current = layer.shapeData as ShapeData | null;
    if (!current) return;
    const next = { ...cloneShapeData(current), ...patch } as ShapeData;
    setShapeDataAndRerender(layer, next);
}

/**
 * Close an active coalesced session and record one history command from the
 * pre-drag snapshot to the current value. If the value did not actually
 * change the session is dropped without committing.
 */
export function commitCoalescedShapeEdit(): void {
    const session = activeSession;
    activeSession = null;
    if (!session) return;
    const layer = findLayer(session.layerId);
    if (!layer) return;
    const current = layer.shapeData as ShapeData | null;
    if (!current) return;
    const beforeJson = JSON.stringify(session.before);
    const afterJson = JSON.stringify(current);
    if (beforeJson === afterJson) return;
    const after = cloneShapeData(current);
    const before = session.before;
    const action = createCommandAction({
        kind: 'layer-property',
        label: session.label,
        layerId: session.layerId,
        affectedIds: [session.layerId],
        apply: () => {
            const l = findLayer(session.layerId);
            if (!l) return;
            setShapeDataAndRerender(l, cloneShapeData(after));
        },
        revert: () => {
            const l = findLayer(session.layerId);
            if (!l) return;
            setShapeDataAndRerender(l, cloneShapeData(before));
        },
    });
    useEditorStore.getState().commitHistory(action);
}

/** Abort an active coalesced session without recording history. */
export function cancelCoalescedShapeEdit(): void {
    activeSession = null;
}

/** Exposed for tests that need to assert whether a session is open. */
export function hasActiveCoalescedShapeEdit(): boolean {
    return activeSession !== null;
}
