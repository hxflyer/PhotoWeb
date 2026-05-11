/**
 * Batch 6 - Slice C - Type & Shape UI completeness.
 *
 * Covers the audit-flagged gaps that ship in this slice:
 *   - Paragraph panel numeric inputs (Space Before / Space After / Indent
 *     Left / Indent Right / First Line Indent) — drive `typeData.style.*` and
 *     re-rasterize the layer.
 *   - Character panel All Caps / Small Caps toggle buttons.
 *   - FontPicker `layerId` prop: two instances bound to the same layer share a
 *     single source of truth via the editor store.
 *   - Text Mode toggle (Point / Paragraph) in Properties Type section.
 *   - Vertical type per-character measured advance (the previous renderer used
 *     a uniform line-step which collapsed "iMiM" onto identical Y offsets).
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
    bindTypeOverlayHandlers, bindTypePanelStore, cancelEditingType,
    commitTypeLayer, defaultTextStyle, type TypeLayerData,
} from '../tools/type';
import { __setAvailableFontsForTest } from '../utils/fontList';

ensureStubsRegistered();

const KNOWN_FONTS = ['Arial', 'Helvetica', 'Georgia', 'Courier New', 'Verdana'];

function makeTypeLayer(overrides: Partial<TypeLayerData> = {}): { layer: Layer; data: TypeLayerData } {
    const layer = new Layer(400, 240, 'Type layer', 'type');
    const data: TypeLayerData = {
        id: 'type-' + Math.random().toString(36).slice(2),
        text: 'Hello',
        style: { ...defaultTextStyle, fontFamily: 'Arial', fontSize: 24, color: '#000000', textAlign: 'left' },
        orientation: 'horizontal',
        transform: { x: 30, y: 40, width: 200, height: 80, rotation: 0 },
        textMode: 'point',
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
        width: 400,
        height: 240,
    }));
}

function resetStore(): void {
    cancelEditingType();
    useEditorStore.setState(s => ({
        ...s,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        width: 400,
        height: 240,
    }));
    useEditorStore.getState().clearHistory();
    bindTypePanelStore(() => {
        const st = useEditorStore.getState();
        return {
            layers: st.layers,
            activeLayerId: st.activeLayerId,
            forceRender: () => useEditorStore.setState(state => ({ layers: [...state.layers] })),
        };
    });
    bindTypeOverlayHandlers((data) => {
        const st = useEditorStore.getState();
        if (data.targetLayerId) {
            const layer = st.layers.find(l => l.id === data.targetLayerId);
            if (layer) {
                layer.kind = 'type';
                commitTypeLayer(layer.canvas, data);
                layer.typeData = data;
                layer.markDirty(null);
            }
        }
        useEditorStore.setState(state => ({ layers: [...state.layers] }));
    }, () => {
        useEditorStore.setState(state => ({ layers: [...state.layers] }));
    });
}

describe('Batch 6 Slice C - Type & Shape UI completeness', () => {
    beforeEach(() => {
        cleanup();
        resetStore();
        __setAvailableFontsForTest(KNOWN_FONTS);
    });

    it('Paragraph panel writes Space Before through to typeData.style.spaceBefore', () => {
        const { layer } = makeTypeLayer();
        installTypeLayer(layer);
        const { getByTitle } = render(<ParagraphPanel />);
        const beforeInput = getByTitle('Space before paragraph').nextSibling as HTMLElement;
        // The numeric <input> is the only descendant input under the field wrapper.
        const input = beforeInput.querySelector('input[type="number"]') as HTMLInputElement;
        expect(input).toBeTruthy();
        fireEvent.change(input, { target: { value: '18' } });
        fireEvent.blur(input);
        const updated = (useEditorStore.getState().layers[0].typeData as TypeLayerData).style;
        expect(updated.spaceBefore).toBe(18);
    });

    it('Paragraph panel writes Left Indent through to typeData.style.indentLeft', () => {
        const { layer } = makeTypeLayer();
        installTypeLayer(layer);
        const { getByTitle } = render(<ParagraphPanel />);
        const leftInputWrapper = getByTitle('Indent left margin').nextSibling as HTMLElement;
        const input = leftInputWrapper.querySelector('input[type="number"]') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '20' } });
        fireEvent.blur(input);
        const updated = (useEditorStore.getState().layers[0].typeData as TypeLayerData).style;
        expect(updated.indentLeft).toBe(20);
    });

    it('Character panel All Caps button toggles typeData.style.allCaps', () => {
        const { layer } = makeTypeLayer();
        installTypeLayer(layer);
        const { getByTitle } = render(<CharacterPanel />);
        const btn = getByTitle('All Caps');
        expect(((useEditorStore.getState().layers[0].typeData as TypeLayerData).style.allCaps)).toBe(false);
        fireEvent.click(btn);
        expect(((useEditorStore.getState().layers[0].typeData as TypeLayerData).style.allCaps)).toBe(true);
    });

    it('Character panel Small Caps button toggles typeData.style.smallCaps', () => {
        const { layer } = makeTypeLayer();
        installTypeLayer(layer);
        const { getByTitle } = render(<CharacterPanel />);
        const btn = getByTitle('Small Caps');
        expect(((useEditorStore.getState().layers[0].typeData as TypeLayerData).style.smallCaps)).toBe(false);
        fireEvent.click(btn);
        expect(((useEditorStore.getState().layers[0].typeData as TypeLayerData).style.smallCaps)).toBe(true);
    });

    it('two FontPickers bound to the same layer share a single source of truth', () => {
        // Character panel and Properties Type section both pass layerId={activeLayer}.
        // Updating the store's typeData.style.fontFamily must update both inputs on next render.
        const { layer } = makeTypeLayer({
            style: { ...defaultTextStyle, fontFamily: 'Arial', fontSize: 24, color: '#000000', textAlign: 'left' },
        });
        installTypeLayer(layer);

        const character = render(<CharacterPanel />);
        const properties = render(<PropertiesPanel />);
        const charInput = character.getByTestId('character-font-picker-input') as HTMLInputElement;
        const propInput = properties.getByTestId('properties-font-picker-input') as HTMLInputElement;
        expect(charInput.value).toBe('Arial');
        expect(propInput.value).toBe('Arial');

        // Mutate the store directly (simulating undo, programmatic edit, or
        // the other panel committing a font change) and verify both pickers
        // reflect the new font without prop drilling.
        const data = useEditorStore.getState().layers[0].typeData as TypeLayerData;
        useEditorStore.setState(s => {
            const layers = s.layers.map(l => {
                if (l.id !== layer.id) return l;
                l.typeData = { ...data, style: { ...data.style, fontFamily: 'Georgia' } };
                return l;
            });
            return { layers };
        });
        // Force a rerender on both panels by reading the listbox.
        character.rerender(<CharacterPanel />);
        properties.rerender(<PropertiesPanel />);
        expect((character.getByTestId('character-font-picker-input') as HTMLInputElement).value).toBe('Georgia');
        expect((properties.getByTestId('properties-font-picker-input') as HTMLInputElement).value).toBe('Georgia');
    });

    it('Properties Text Mode toggle switches a point text layer to paragraph (box) mode', () => {
        const { layer } = makeTypeLayer({ textMode: 'point' });
        installTypeLayer(layer);
        const { getByTestId } = render(<PropertiesPanel />);
        const boxBtn = getByTestId('properties-type-mode-box');
        fireEvent.click(boxBtn);
        const updated = useEditorStore.getState().layers[0].typeData as TypeLayerData;
        expect(updated.textMode).toBe('box');
    });

    it('Properties Text Mode toggle switches a box text layer back to point', () => {
        const { layer } = makeTypeLayer({ textMode: 'box' });
        installTypeLayer(layer);
        const { getByTestId } = render(<PropertiesPanel />);
        const pointBtn = getByTestId('properties-type-mode-point');
        fireEvent.click(pointBtn);
        const updated = useEditorStore.getState().layers[0].typeData as TypeLayerData;
        expect(updated.textMode).toBe('point');
    });

    it('vertical type renders mixed-width chars at distinct y offsets (per-char measured advance)', () => {
        // The vertical renderer must walk each character by its actual measured
        // advance so "iM" produces two different y advances (M wider than i).
        // We can't sample real font pixels reliably under node-canvas, so we
        // instead measure that the rasterized text fills *more rows* for a
        // wider character than for a narrower one.
        const layerNarrow = new Layer(64, 200, 'V-i', 'type');
        const dataNarrow: TypeLayerData = {
            id: 'v-narrow',
            text: 'ii',
            style: { ...defaultTextStyle, fontFamily: 'Arial', fontSize: 32, color: '#000000' },
            orientation: 'vertical',
            transform: { x: 4, y: 4, width: 40, height: 160, rotation: 0 },
            textMode: 'point',
            targetLayerId: layerNarrow.id,
        };
        commitTypeLayer(layerNarrow.canvas, dataNarrow);

        const layerWide = new Layer(64, 200, 'V-M', 'type');
        const dataWide: TypeLayerData = {
            id: 'v-wide',
            text: 'MM',
            style: { ...defaultTextStyle, fontFamily: 'Arial', fontSize: 32, color: '#000000' },
            orientation: 'vertical',
            transform: { x: 4, y: 4, width: 40, height: 160, rotation: 0 },
            textMode: 'point',
            targetLayerId: layerWide.id,
        };
        commitTypeLayer(layerWide.canvas, dataWide);

        // After committing, bounds.h reflects the vertical extent. With per-char
        // advance, "MM" must occupy a taller column than "ii" because M's
        // measured width (used as vertical advance in vertical mode) > i's.
        const narrowH = dataNarrow.bounds?.h ?? 0;
        const wideH = dataWide.bounds?.h ?? 0;
        expect(narrowH).toBeGreaterThan(0);
        expect(wideH).toBeGreaterThan(0);
        expect(wideH).toBeGreaterThan(narrowH);
    });

    it('vertical type with a newline wraps to a second column', () => {
        const layer = new Layer(120, 200, 'V-newline', 'type');
        const data: TypeLayerData = {
            id: 'v-nl',
            text: 'A\nB',
            style: { ...defaultTextStyle, fontFamily: 'Arial', fontSize: 32, color: '#000000' },
            orientation: 'vertical',
            transform: { x: 4, y: 4, width: 100, height: 160, rotation: 0 },
            textMode: 'point',
            targetLayerId: layer.id,
        };
        commitTypeLayer(layer.canvas, data);
        // Two columns at columnStep = fontSize * 1.2 = 38.4 => maxLineWidth ~ 76.8.
        expect((data.bounds?.w ?? 0)).toBeGreaterThan(60);
    });
});
