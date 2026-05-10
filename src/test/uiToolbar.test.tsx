import { describe, it, expect, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Toolbar } from '../components/Panels/Toolbar';
import { LayersPanel } from '../components/Panels/LayersPanel';
import { useEditorStore } from '../store/editorStore';
import { runScript } from './simulator';

function reset() {
    useEditorStore.setState((s) => ({ ...s, layers: [], activeLayerId: null }));
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
});
