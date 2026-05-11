/**
 * History-safe wrappers for type-layer edits driven by Properties / Character /
 * Paragraph panels. Photoshop treats every panel-driven type style change as a
 * single undoable command, and rapid slider drags coalesce into one entry per
 * drag end. The helpers below mirror that contract while keeping the existing
 * `rerenderTypeLayer` lifecycle and the contenteditable overlay intact.
 */
import { useEditorStore } from '../store/editorStore';
import { createCommandAction } from '../core/history';
import type { Layer } from '../core/Layer';
import { commitActiveEditingType, rerenderTypeLayer, typeToolState, type TypeLayerData } from './type';
import type { TextStyle } from '../components/Canvas/TextEditOverlay';
import { traceLayerToPathD } from './textToPath';
import { rerenderShapeLayer } from './shapeRender';
import type { ShapeCustomData } from '../store/types';

function cloneTypeData(data: TypeLayerData): TypeLayerData {
    if (typeof structuredClone === 'function') return structuredClone(data) as TypeLayerData;
    return JSON.parse(JSON.stringify(data)) as TypeLayerData;
}

function findLayer(layerId: string): Layer | undefined {
    return useEditorStore.getState().layers.find(l => l.id === layerId);
}

function setTypeDataAndRerender(layer: Layer, data: TypeLayerData): void {
    layer.typeData = data;
    rerenderTypeLayer(layer);
    useEditorStore.setState(state => ({ layers: [...state.layers] }));
}

function commitOverlayIfTargeting(layerId: string): void {
    if (typeToolState.editing?.targetLayerId === layerId) {
        commitActiveEditingType();
    }
}

/**
 * Apply a full TypeLayerData patch as a single undoable command. Use this for
 * one-shot edits (textarea change, select change, color pick, blurred numeric).
 * Live re-rasterization happens inside the apply/revert closures so undo/redo
 * always shows the right pixels.
 */
export function applyTypeEdit(
    layerId: string,
    label: string,
    patch: Partial<TypeLayerData>,
): void {
    commitOverlayIfTargeting(layerId);
    const layer = findLayer(layerId);
    if (!layer) return;
    const current = layer.typeData as TypeLayerData | null;
    if (!current) return;
    const before = cloneTypeData(current);
    const after: TypeLayerData = { ...cloneTypeData(current), ...patch };
    const action = createCommandAction({
        kind: 'layer-property',
        label,
        layerId,
        affectedIds: [layerId],
        apply: () => {
            const l = findLayer(layerId);
            if (!l) return;
            setTypeDataAndRerender(l, cloneTypeData(after));
        },
        revert: () => {
            const l = findLayer(layerId);
            if (!l) return;
            setTypeDataAndRerender(l, cloneTypeData(before));
        },
    });
    useEditorStore.getState().executeCommand(action);
}

/**
 * Apply a TextStyle patch (Character/Paragraph control) as a single undoable
 * command. Wraps `applyTypeEdit` so the same before/after snapshot/replay path
 * is reused.
 */
export function applyTypeStyleEdit(
    layerId: string,
    label: string,
    patch: Partial<TextStyle>,
): void {
    const layer = findLayer(layerId);
    if (!layer) return;
    const current = layer.typeData as TypeLayerData | null;
    if (!current) return;
    applyTypeEdit(layerId, label, { style: { ...current.style, ...patch } });
}

interface CoalescedSession {
    layerId: string;
    label: string;
    before: TypeLayerData;
}

let activeSession: CoalescedSession | null = null;

/**
 * Begin a coalesced edit session for a slider/numeric drag. Subsequent
 * `applyCoalesced*` calls mutate the layer's typeData live (with rerender) but
 * do NOT touch history. On `commitCoalescedTypeEdit()` a single command is
 * recorded that snapshots from the pre-drag value to the final value.
 *
 * If a session is already active for a different layer/label, that session is
 * committed first so each drag gets its own history entry.
 */
export function beginCoalescedTypeEdit(layerId: string, label: string): void {
    if (activeSession && (activeSession.layerId !== layerId || activeSession.label !== label)) {
        commitCoalescedTypeEdit();
    }
    if (activeSession) return;
    const layer = findLayer(layerId);
    if (!layer) return;
    const current = layer.typeData as TypeLayerData | null;
    if (!current) return;
    commitOverlayIfTargeting(layerId);
    activeSession = { layerId, label, before: cloneTypeData(current) };
}

/**
 * Apply a transient TextStyle patch within an active coalesced session. If no
 * session is active, falls back to a one-shot history entry so callers can wire
 * onChange handlers identically and rely on onMouseUp/onBlur to coalesce.
 */
export function applyCoalescedStylePatch(layerId: string, label: string, patch: Partial<TextStyle>): void {
    if (!activeSession || activeSession.layerId !== layerId) {
        applyTypeStyleEdit(layerId, label, patch);
        return;
    }
    const layer = findLayer(layerId);
    if (!layer) return;
    const current = layer.typeData as TypeLayerData | null;
    if (!current) return;
    const next: TypeLayerData = { ...cloneTypeData(current), style: { ...current.style, ...patch } };
    setTypeDataAndRerender(layer, next);
}

/**
 * Apply a transient TypeLayerData patch within an active coalesced session.
 * Falls back to a one-shot history entry if no session is active.
 */
export function applyCoalescedDataPatch(layerId: string, label: string, patch: Partial<TypeLayerData>): void {
    if (!activeSession || activeSession.layerId !== layerId) {
        applyTypeEdit(layerId, label, patch);
        return;
    }
    const layer = findLayer(layerId);
    if (!layer) return;
    const current = layer.typeData as TypeLayerData | null;
    if (!current) return;
    const next: TypeLayerData = { ...cloneTypeData(current), ...patch };
    setTypeDataAndRerender(layer, next);
}

/**
 * Close an active coalesced session and record one history command from the
 * pre-drag snapshot to the current value. If the value did not actually change
 * the session is dropped without committing.
 */
export function commitCoalescedTypeEdit(): void {
    const session = activeSession;
    activeSession = null;
    if (!session) return;
    const layer = findLayer(session.layerId);
    if (!layer) return;
    const current = layer.typeData as TypeLayerData | null;
    if (!current) return;
    const beforeJson = JSON.stringify(session.before);
    const afterJson = JSON.stringify(current);
    if (beforeJson === afterJson) return;
    const after = cloneTypeData(current);
    const before = session.before;
    const action = createCommandAction({
        kind: 'layer-property',
        label: session.label,
        layerId: session.layerId,
        affectedIds: [session.layerId],
        apply: () => {
            const l = findLayer(session.layerId);
            if (!l) return;
            setTypeDataAndRerender(l, cloneTypeData(after));
        },
        revert: () => {
            const l = findLayer(session.layerId);
            if (!l) return;
            setTypeDataAndRerender(l, cloneTypeData(before));
        },
    });
    useEditorStore.getState().commitHistory(action);
}

/** Abort an active coalesced session without recording history. */
export function cancelCoalescedTypeEdit(): void {
    activeSession = null;
}

/** Exposed for tests that need to assert whether a coalesced session is open. */
export function hasActiveCoalescedTypeEdit(): boolean {
    return activeSession !== null;
}

/**
 * Route a Character / Paragraph style patch through the history system. When
 * there is an active type edit session (contenteditable overlay open), defer
 * to `updateEditingStyle` so the overlay updates live and history is captured
 * on commit. When there is no edit session but a selected type layer, run the
 * patch through the coalesced helper so rapid slider drags become one entry.
 *
 * Caller is responsible for invoking `commitCoalescedTypeEdit()` on the
 * commit event (onMouseUp / onBlur / select change) to close the session.
 */
export function applyCharacterPanelEdit(
    label: string,
    patch: Partial<TextStyle>,
): void {
    const state = useEditorStore.getState();
    const activeLayer = state.layers.find(l => l.id === state.activeLayerId);
    if (!activeLayer || activeLayer.kind !== 'type' || !activeLayer.typeData) {
        return;
    }
    beginCoalescedTypeEdit(activeLayer.id, label);
    applyCoalescedStylePatch(activeLayer.id, label, patch);
}

/**
 * Convert the active layer (typically a type layer, but any raster layer with
 * opaque pixels works) into an editable shape layer. Traces the layer's alpha
 * into a normalized SVG `pathD` and rewrites the layer in place to `kind:
 * 'shape'` with `shapeData.kind === 'custom'`. Records a single history entry
 * so undo restores the original kind/typeData/pixels.
 */
export function convertActiveLayerToShape(): boolean {
    const state = useEditorStore.getState();
    const layer = state.layers.find(l => l.id === state.activeLayerId);
    if (!layer) return false;
    if (layer.kind === 'type') commitOverlayIfTargeting(layer.id);
    const traced = traceLayerToPathD(layer);
    if (!traced) return false;
    const td = layer.typeData as { color?: string } | null;
    const fillColor = td?.color ?? state.primaryColor ?? '#000000';
    const shapeData: ShapeCustomData = {
        kind: 'custom',
        presetId: 'type-shape',
        pathD: traced.pathD,
        bounds: traced.bounds,
        fill: { type: 'solid', color: fillColor },
        stroke: null,
    };

    const beforePixels = layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
    const beforeKind = layer.kind;
    const beforeTypeData = layer.typeData;
    const beforeShapeData = layer.shapeData;

    const action = createCommandAction({
        kind: 'layer-property',
        label: 'Convert to Shape',
        layerId: layer.id,
        affectedIds: [layer.id],
        apply: () => {
            const l = findLayer(layer.id);
            if (!l) return;
            (l as unknown as { kind: string }).kind = 'shape';
            l.shapeData = shapeData;
            l.typeData = null;
            l.ctx.clearRect(0, 0, l.canvas.width, l.canvas.height);
            rerenderShapeLayer(l);
            l.markDirty(null);
            useEditorStore.setState(s => ({ layers: [...s.layers] }));
        },
        revert: () => {
            const l = findLayer(layer.id);
            if (!l) return;
            (l as unknown as { kind: string }).kind = beforeKind;
            l.shapeData = beforeShapeData;
            l.typeData = beforeTypeData;
            l.ctx.putImageData(beforePixels, 0, 0);
            l.markDirty(null);
            useEditorStore.setState(s => ({ layers: [...s.layers] }));
        },
    });
    useEditorStore.getState().executeCommand(action);
    return true;
}

/**
 * Route a Character / Paragraph data-shape patch (e.g. orientation) through
 * the history system on the active type layer.
 */
export function applyCharacterPanelDataEdit(
    label: string,
    patch: Partial<TypeLayerData>,
): void {
    const state = useEditorStore.getState();
    const activeLayer = state.layers.find(l => l.id === state.activeLayerId);
    if (!activeLayer || activeLayer.kind !== 'type' || !activeLayer.typeData) {
        return;
    }
    beginCoalescedTypeEdit(activeLayer.id, label);
    applyCoalescedDataPatch(activeLayer.id, label, patch);
}

