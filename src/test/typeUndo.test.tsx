/**
 * PROPS-04 — undo/redo coverage for Properties / Character / Paragraph type
 * edits. Every panel-driven change must record exactly one undoable command,
 * with slider drags coalesced into a single entry on commit (mouseUp / blur).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { PropertiesPanel } from '../components/Panels/PropertiesPanel';
import { CharacterPanel } from '../components/Panels/CharacterPanel';
import { ParagraphPanel } from '../components/Panels/ParagraphPanel';
import { Layer } from '../core/Layer';
import {
    bindTypePanelStore, bindTypeOverlayHandlers, cancelEditingType,
    commitTypeLayer, defaultTextStyle, findTypeLayerAt, setEditingType,
    typeToolState, type TypeLayerData,
} from '../tools/type';
import {
    beginCoalescedTypeEdit, applyCoalescedStylePatch, commitCoalescedTypeEdit,
} from '../tools/typeCommands';
import { getTool } from '../tools/registry';
import { makeToolPointerEvent } from './simulator';

ensureStubsRegistered();

function makeTypeLayer(overrides: Partial<TypeLayerData> = {}): { layer: Layer; data: TypeLayerData } {
    const layer = new Layer(300, 200, 'Type layer', 'type');
    const data: TypeLayerData = {
        id: 'type-' + Math.random().toString(36).slice(2),
        text: 'Hello',
        style: { ...defaultTextStyle, fontFamily: 'Arial', fontSize: 24, color: '#000000', textAlign: 'left' },
        orientation: 'horizontal',
        transform: { x: 30, y: 40, width: 200, height: 80, rotation: 0 },
        textMode: 'box',
        targetLayerId: layer.id,
        ...overrides,
    };
    commitTypeLayer(layer.canvas, data);
    layer.typeData = data;
    return { layer, data };
}

function installTypeLayer(layer: Layer): void {
    useEditorStore.setState(s => ({
        ...s,
        layers: [layer],
        activeLayerId: layer.id,
        selectedLayerIds: [layer.id],
        width: 300,
        height: 200,
    }));
}

function resetStore() {
    cancelEditingType();
    useEditorStore.setState(s => ({
        ...s,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        width: 300,
        height: 200,
    }));
    useEditorStore.getState().clearHistory();
    bindTypePanelStore(() => {
        const s = useEditorStore.getState();
        return {
            layers: s.layers,
            activeLayerId: s.activeLayerId,
            forceRender: () => useEditorStore.setState(state => ({ layers: [...state.layers] })),
        };
    });
    bindTypeOverlayHandlers((data) => {
        const s = useEditorStore.getState();
        if (data.targetLayerId) {
            const layer = s.layers.find(l => l.id === data.targetLayerId);
            if (layer) {
                layer.kind = 'type';
                commitTypeLayer(layer.canvas, data);
                layer.typeData = data;
                layer.markDirty(null);
            }
        }
        useEditorStore.setState(state => ({ layers: [...state.layers] }));
    }, () => {});
}

describe('Type Properties undo (PROPS-04)', () => {
    beforeEach(resetStore);
    beforeEach(cleanup);

    it('editing text via Properties is undoable', () => {
        const { layer } = makeTypeLayer({ text: 'Original' });
        installTypeLayer(layer);
        const { getByTestId } = render(<PropertiesPanel />);

        fireEvent.change(getByTestId('properties-type-text'), { target: { value: 'Updated' } });
        fireEvent.blur(getByTestId('properties-type-text'));
        expect((layer.typeData as TypeLayerData).text).toBe('Updated');

        useEditorStore.getState().undo();
        expect((useEditorStore.getState().layers[0].typeData as TypeLayerData).text).toBe('Original');

        useEditorStore.getState().redo();
        expect((useEditorStore.getState().layers[0].typeData as TypeLayerData).text).toBe('Updated');
    });

    it('editing font size via Properties is undoable', () => {
        const { layer } = makeTypeLayer({ style: { ...defaultTextStyle, fontSize: 24 } });
        installTypeLayer(layer);
        const { getByTestId } = render(<PropertiesPanel />);

        fireEvent.change(getByTestId('properties-type-size'), { target: { value: '64' } });
        fireEvent.blur(getByTestId('properties-type-size'));
        expect((layer.typeData as TypeLayerData).style.fontSize).toBe(64);

        useEditorStore.getState().undo();
        expect((useEditorStore.getState().layers[0].typeData as TypeLayerData).style.fontSize).toBe(24);
    });

    it('editing font family via Character panel is undoable', () => {
        const { layer } = makeTypeLayer({ style: { ...defaultTextStyle, fontFamily: 'Arial' } });
        installTypeLayer(layer);
        // Render so the panel can read the active layer's style.
        const { getByTestId } = render(<CharacterPanel />);
        const fontInput = getByTestId('character-font-picker-input') as HTMLInputElement;
        fireEvent.focus(fontInput);
        fireEvent.change(fontInput, { target: { value: 'Georgia' } });
        fireEvent.keyDown(fontInput, { key: 'Enter' });
        expect((layer.typeData as TypeLayerData).style.fontFamily).toBe('Georgia');

        useEditorStore.getState().undo();
        expect((useEditorStore.getState().layers[0].typeData as TypeLayerData).style.fontFamily).toBe('Arial');

        useEditorStore.getState().redo();
        expect((useEditorStore.getState().layers[0].typeData as TypeLayerData).style.fontFamily).toBe('Georgia');
    });

    it('editing text alignment via Paragraph panel is undoable', () => {
        const { layer } = makeTypeLayer({ style: { ...defaultTextStyle, textAlign: 'left' } });
        installTypeLayer(layer);
        const { getByTitle } = render(<ParagraphPanel />);

        fireEvent.click(getByTitle('Center align'));
        expect((layer.typeData as TypeLayerData).style.textAlign).toBe('center');

        useEditorStore.getState().undo();
        expect((useEditorStore.getState().layers[0].typeData as TypeLayerData).style.textAlign).toBe('left');

        useEditorStore.getState().redo();
        expect((useEditorStore.getState().layers[0].typeData as TypeLayerData).style.textAlign).toBe('center');
    });

    it('rapid slider drag onChange events record exactly one history entry on commit', () => {
        const { layer } = makeTypeLayer({ style: { ...defaultTextStyle, fontSize: 24 } });
        installTypeLayer(layer);
        const beforeCount = useEditorStore.getState().historyEntries.length;

        // Simulate a drag: multiple onChange calls coalesced by begin/commit.
        beginCoalescedTypeEdit(layer.id, 'Edit Font Size');
        applyCoalescedStylePatch(layer.id, 'Edit Font Size', { fontSize: 30 });
        applyCoalescedStylePatch(layer.id, 'Edit Font Size', { fontSize: 40 });
        applyCoalescedStylePatch(layer.id, 'Edit Font Size', { fontSize: 50 });
        applyCoalescedStylePatch(layer.id, 'Edit Font Size', { fontSize: 64 });
        // Mid-drag changes must NOT have committed yet.
        expect(useEditorStore.getState().historyEntries.length).toBe(beforeCount);
        commitCoalescedTypeEdit();

        const after = useEditorStore.getState().historyEntries;
        expect(after.length).toBe(beforeCount + 1);
        expect((layer.typeData as TypeLayerData).style.fontSize).toBe(64);

        // Undo must restore the pre-drag value, not the intermediate ones.
        useEditorStore.getState().undo();
        expect((useEditorStore.getState().layers[0].typeData as TypeLayerData).style.fontSize).toBe(24);
    });

    it('Properties edit on a rotated type layer preserves the rotation through undo/redo', () => {
        const rotation = Math.PI / 4;
        const { layer } = makeTypeLayer({
            text: 'Rotated',
            transform: { x: 50, y: 60, width: 200, height: 80, rotation },
            style: { ...defaultTextStyle, fontSize: 36, color: '#0000ff' },
        });
        installTypeLayer(layer);
        const { getByTestId } = render(<PropertiesPanel />);

        fireEvent.change(getByTestId('properties-type-color'), { target: { value: '#00ff00' } });
        fireEvent.blur(getByTestId('properties-type-color'));
        const updated = layer.typeData as TypeLayerData;
        expect(updated.style.color).toBe('#00ff00');
        expect(updated.transform.rotation).toBeCloseTo(rotation);

        useEditorStore.getState().undo();
        const reverted = useEditorStore.getState().layers[0].typeData as TypeLayerData;
        expect(reverted.style.color).toBe('#0000ff');
        expect(reverted.transform.rotation).toBeCloseTo(rotation);

        useEditorStore.getState().redo();
        const redone = useEditorStore.getState().layers[0].typeData as TypeLayerData;
        expect(redone.style.color).toBe('#00ff00');
        expect(redone.transform.rotation).toBeCloseTo(rotation);
    });

    it('re-editing with the type tool after a Properties undo mounts on the right layer', () => {
        const { layer } = makeTypeLayer({ text: 'Original' });
        installTypeLayer(layer);
        const { getByTestId } = render(<PropertiesPanel />);

        fireEvent.change(getByTestId('properties-type-text'), { target: { value: 'Updated' } });
        fireEvent.blur(getByTestId('properties-type-text'));
        useEditorStore.getState().undo();

        const layers = useEditorStore.getState().layers;
        const currentData = layers[0].typeData as TypeLayerData;
        expect(currentData.text).toBe('Original');

        // After re-rendering, the layer's bounds must be present for hit-testing.
        expect(currentData.bounds).toBeTruthy();
        const tool = getTool('type-horizontal')!;
        tool.onPointerDown!(
            makeToolPointerEvent({
                canvasX: Math.floor(currentData.bounds!.x + 4),
                canvasY: Math.floor(currentData.bounds!.y + 4),
            }),
            {
                store: useEditorStore.getState(),
                getStore: () => useEditorStore.getState(),
                requestRender: () => {},
            },
        );
        expect(typeToolState.editing?.targetLayerId).toBe(layer.id);
        expect(typeToolState.editing?.text).toBe('Original');

        // Confirm the same hit-test resolves to our layer.
        const hit = findTypeLayerAt(useEditorStore.getState().layers, currentData.bounds!.x + 4, currentData.bounds!.y + 4);
        expect(hit?.id).toBe(layer.id);
    });

    it('editing while the contenteditable overlay is active does not double-record history', () => {
        const { layer } = makeTypeLayer({ text: 'Live' });
        installTypeLayer(layer);
        // Simulate an open edit session targeting this layer.
        setEditingType({ ...(layer.typeData as TypeLayerData) });
        const beforeCount = useEditorStore.getState().historyEntries.length;

        // Coalesced calls while overlay is open shouldn't commit history.
        beginCoalescedTypeEdit(layer.id, 'Edit Font Size');
        // beginCoalescedTypeEdit commits the overlay first; check history is unchanged
        // (the overlay commit handler in this test does not itself dispatch history).
        applyCoalescedStylePatch(layer.id, 'Edit Font Size', { fontSize: 40 });
        commitCoalescedTypeEdit();

        const after = useEditorStore.getState().historyEntries.length;
        // Exactly one entry recorded by the coalesced helper.
        expect(after - beforeCount).toBe(1);
    });
});
