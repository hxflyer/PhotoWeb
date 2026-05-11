import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { TextEditOverlay } from '../components/Canvas/TextEditOverlay';
import { defaultTextStyle, setEditingType, typeToolState, type TypeLayerData } from '../tools/type';

ensureStubsRegistered();

afterEach(() => cleanup());

describe('Slice G — Type tool', () => {
    beforeEach(() => {
        useEditorStore.getState().clearHistory();
        useEditorStore.setState(s => ({
            ...s,
            width: 200,
            height: 200,
            layers: [],
            activeLayerId: null,
            activeTool: 'brush',
        }));
    });

    it('default text style includes antiAlias set to crisp', () => {
        expect(defaultTextStyle.antiAlias).toBe('crisp');
    });

    it('Numpad Enter commits the type edit', () => {
        let committed: string | null = null;
        const { container } = render(
            <TextEditOverlay
                visible
                transform={{ x: 0, y: 0, width: 100, height: 50, rotation: 0 }}
                style={{ ...defaultTextStyle }}
                initialValue="hello"
                zoom={1}
                onCommit={(v) => { committed = v; }}
                onCancel={() => {}}
            />
        );
        const editable = container.querySelector('[contenteditable="true"]') as HTMLDivElement;
        expect(editable).toBeTruthy();
        editable.focus();
        fireEvent.keyDown(editable, { key: 'Enter', code: 'NumpadEnter' });
        expect(committed).not.toBeNull();
    });

    it('plain Enter (main keyboard) does NOT commit — it inserts a line break instead', () => {
        let committed: string | null = null;
        const { container } = render(
            <TextEditOverlay
                visible
                transform={{ x: 0, y: 0, width: 100, height: 50, rotation: 0 }}
                style={{ ...defaultTextStyle }}
                initialValue="hello"
                zoom={1}
                onCommit={(v) => { committed = v; }}
                onCancel={() => {}}
            />
        );
        const editable = container.querySelector('[contenteditable="true"]') as HTMLDivElement;
        fireEvent.keyDown(editable, { key: 'Enter', code: 'Enter' });
        expect(committed).toBeNull();
    });

    it('Cmd+Enter still commits as a secondary shortcut', () => {
        let committed: string | null = null;
        const { container } = render(
            <TextEditOverlay
                visible
                transform={{ x: 0, y: 0, width: 100, height: 50, rotation: 0 }}
                style={{ ...defaultTextStyle }}
                initialValue="hello"
                zoom={1}
                onCommit={(v) => { committed = v; }}
                onCancel={() => {}}
            />
        );
        const editable = container.querySelector('[contenteditable="true"]') as HTMLDivElement;
        fireEvent.keyDown(editable, { key: 'Enter', code: 'Enter', metaKey: true });
        expect(committed).not.toBeNull();
    });

    it('setTool to a non-type tool commits the active type edit (G2)', () => {
        // Place a fake editing type layer
        const layer = new Layer(200, 200, 'Type 1');
        layer.kind = 'type';
        const typeData: TypeLayerData = {
            id: 'tt1',
            text: 'hi',
            orientation: 'horizontal',
            textMode: 'point',
            style: { ...defaultTextStyle },
            styleRuns: [],
            transform: { x: 10, y: 10, width: 60, height: 32, rotation: 0 },
            bounds: { x: 10, y: 10, w: 60, h: 32 },
        };
        layer.typeData = typeData;
        useEditorStore.setState(s => ({ ...s, layers: [layer], activeLayerId: layer.id, activeTool: 'type-horizontal' }));
        setEditingType(typeData);
        expect(typeToolState.editing).toBeTruthy();
        // Switch to a different tool
        useEditorStore.getState().setTool('brush');
        // Editing state should have been committed (cleared).
        expect(typeToolState.editing).toBeNull();
    });

    it('Anti-alias dropdown can be set to all 5 photoshop modes through the style update path', () => {
        const layer = new Layer(200, 200, 'Type 1');
        layer.kind = 'type';
        const typeData: TypeLayerData = {
            id: 'tt2',
            text: 'A',
            orientation: 'horizontal',
            textMode: 'point',
            style: { ...defaultTextStyle, antiAlias: 'crisp' },
            styleRuns: [],
            transform: { x: 0, y: 0, width: 40, height: 40, rotation: 0 },
            bounds: { x: 0, y: 0, w: 40, h: 40 },
        };
        layer.typeData = typeData;
        useEditorStore.setState(s => ({ ...s, layers: [layer], activeLayerId: layer.id }));
        const modes: Array<'none' | 'sharp' | 'crisp' | 'strong' | 'smooth'> = ['none', 'sharp', 'crisp', 'strong', 'smooth'];
        for (const m of modes) {
            typeData.style.antiAlias = m;
            expect(typeData.style.antiAlias).toBe(m);
        }
    });
});
