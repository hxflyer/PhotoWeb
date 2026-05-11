import { describe, it, expect, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Toolbar } from '../components/Panels/Toolbar';
import { LayersPanel } from '../components/Panels/LayersPanel';
import { useEditorStore } from '../store/editorStore';
import { runScript } from './simulator';

function reset() {
    useEditorStore.setState((s) => ({ ...s, layers: [], activeLayerId: null, selectedLayerIds: [], layerSelectionAnchorId: null }));
}

describe('UI: Toolbar simulated clicks', () => {
    beforeEach(() => { cleanup(); reset(); });

    it('clicking the Move button sets activeTool to "move"', async () => {
        const { container } = render(<Toolbar />);
        const moveBtn = container.querySelector('button[title^="Move Tool"]') as HTMLElement;
        expect(moveBtn).toBeTruthy();
        await runScript([{ type: 'click', target: moveBtn }], container);
        expect(useEditorStore.getState().activeTool).toBe('move');
    });

    it('clicking the Magic Wand button sets activeTool to "magic-wand"', async () => {
        const { container } = render(<Toolbar />);
        // Magic Wand is a sub-tool; first click activates quick-selection group, then flyout reveals wand
        // The primary is Quick Selection; Magic Wand is in the sub-flyout.
        // We can find the button by its title in the rendered DOM (sub-tool buttons are rendered lazily via flyout)
        // Click the group primary (Quick Selection) to open the flyout, then click Magic Wand
        const btn = container.querySelector('button[title^="Quick Selection Tool"]') as HTMLElement;
        expect(btn).toBeTruthy();
        await runScript([{ type: 'click', target: btn }], container);
        expect(useEditorStore.getState().activeTool).toBe('quick-selection');
    });

    it('clicking Lasso sets activeTool to lasso', async () => {
        const { container } = render(<Toolbar />);
        const btn = container.querySelector('button[title^="Lasso Tool"]') as HTMLElement;
        expect(btn).toBeTruthy();
        await runScript([{ type: 'click', target: btn }], container);
        const state = useEditorStore.getState();
        expect(state.activeTool).toBe('lasso');
    });

    it('every tool group has a clickable primary button', () => {
        const { container } = render(<Toolbar />);
        const expected = [
            'Move Tool', 'Rectangular Marquee Tool', 'Lasso Tool',
            'Quick Selection Tool', 'Crop Tool', 'Eyedropper Tool',
            'Brush Tool', 'Clone Stamp Tool', 'Eraser Tool',
            'Paint Bucket Tool', 'Dodge Tool',
            'Pen Tool', 'Horizontal Type Tool', 'Path Selection Tool',
            'Rectangle Tool', 'Hand Tool',
        ];
        expected.forEach(label => {
            const btn = container.querySelector(`button[title^="${label}"]`);
            expect(btn, `missing toolbar button: ${label}`).toBeTruthy();
        });
    });
});

describe('UI: LayersPanel simulated interactions', () => {
    beforeEach(() => { cleanup(); reset(); useEditorStore.getState().addLayer(); });

    it('clicking the "+" header button adds a new layer', async () => {
        const { container } = render(<LayersPanel />);
        const addBtn = container.querySelector('button[title="New Layer"]') as HTMLElement;
        const before = useEditorStore.getState().layers.length;
        await runScript([{ type: 'click', target: addBtn }], container);
        const after = useEditorStore.getState().layers.length;
        expect(after).toBe(before + 1);
    });

    it('clicking the folder button adds a group row', async () => {
        const { container } = render(<LayersPanel />);
        const groupBtn = container.querySelector('button[title="New Group"]') as HTMLElement;
        await runScript([{ type: 'click', target: groupBtn }], container);
        const group = useEditorStore.getState().layers.find(layer => layer.kind === 'group');
        expect(group).toBeTruthy();
        expect(container.textContent).toContain(group!.name);
    });

    it('collapsing a group hides its child layer rows', async () => {
        useEditorStore.getState().addLayer();
        const ids = useEditorStore.getState().layers.map(layer => layer.id);
        useEditorStore.getState().renameLayer(ids[0], 'Child A');
        useEditorStore.getState().renameLayer(ids[1], 'Child B');
        useEditorStore.getState().groupLayers(ids, 'Folder');

        const { container } = render(<LayersPanel />);
        expect(container.textContent).toContain('Child A');
        expect(container.textContent).toContain('Child B');
        const collapseBtn = container.querySelector('button[title="Collapse group"]') as HTMLElement;
        await runScript([{ type: 'click', target: collapseBtn }], container);
        expect(container.textContent).toContain('Folder');
        expect(container.textContent).not.toContain('Child A');
        expect(container.textContent).not.toContain('Child B');
    });

    it('supports Ctrl/Command toggle and Shift range selection in the Layers panel', async () => {
        useEditorStore.getState().addLayer();
        useEditorStore.getState().addLayer();
        const ids = useEditorStore.getState().layers.map(layer => layer.id);
        const { container } = render(<LayersPanel />);
        const bottomRow = container.querySelector(`[data-testid="layer-row-${ids[0]}"]`) as HTMLElement;
        const middleRow = container.querySelector(`[data-testid="layer-row-${ids[1]}"]`) as HTMLElement;
        const topRow = container.querySelector(`[data-testid="layer-row-${ids[2]}"]`) as HTMLElement;

        await runScript([{ type: 'click', target: bottomRow }], container);
        expect(useEditorStore.getState().selectedLayerIds).toEqual([ids[0]]);

        await runScript([{ type: 'click', target: topRow, modifiers: { meta: true } }], container);
        expect(useEditorStore.getState().selectedLayerIds).toEqual([ids[0], ids[2]]);
        expect(topRow.getAttribute('data-layer-selected')).toBe('true');

        await runScript([{ type: 'click', target: middleRow, modifiers: { shift: true } }], container);
        expect(useEditorStore.getState().selectedLayerIds).toEqual([ids[1], ids[2]]);
        expect(middleRow.getAttribute('data-layer-active')).toBe('true');
    });

    it('shows layer mask thumbnail plus enabled and linked controls', async () => {
        const layer = useEditorStore.getState().layers[0];
        useEditorStore.getState().addLayerMask(layer.id, 'reveal-all');
        const { container } = render(<LayersPanel />);
        const maskThumb = container.querySelector(`[data-testid="mask-thumbnail-${layer.id}"]`) as HTMLElement;
        const link = container.querySelector(`[data-testid="mask-link-${layer.id}"]`) as HTMLElement;
        expect(maskThumb).toBeTruthy();
        expect(maskThumb.getAttribute('data-mask-enabled')).toBe('true');
        expect(link.getAttribute('data-mask-linked')).toBe('true');

        // Plain click now focuses the mask for paint mode.
        await runScript([{ type: 'click', target: maskThumb.parentElement as HTMLElement }], container);
        expect(useEditorStore.getState().activeLayerEditTarget).toBe('mask');

        // Alt-click toggles enabled.
        await runScript([{ type: 'click', target: maskThumb.parentElement as HTMLElement, modifiers: { alt: true } }], container);
        expect(useEditorStore.getState().layers[0].mask?.enabled).toBe(false);
        expect(maskThumb.getAttribute('data-mask-enabled')).toBe('false');

        await runScript([{ type: 'click', target: link }], container);
        expect(useEditorStore.getState().layers[0].mask?.linked).toBe(false);
        expect(link.getAttribute('data-mask-linked')).toBe('false');
    });
});
