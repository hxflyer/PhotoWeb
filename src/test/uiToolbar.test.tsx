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
        const moveBtn = container.querySelector('button[title="Move"]') as HTMLElement;
        expect(moveBtn).toBeTruthy();
        await runScript([{ type: 'click', target: moveBtn }], container);
        expect(useEditorStore.getState().activeTool).toBe('move');
    });

    it('clicking the Magic Wand button sets activeTool to "magic-wand"', async () => {
        const { container } = render(<Toolbar />);
        const btn = container.querySelector('button[title="Magic Wand"]') as HTMLElement;
        expect(btn).toBeTruthy();
        await runScript([{ type: 'click', target: btn }], container);
        expect(useEditorStore.getState().activeTool).toBe('magic-wand');
    });

    it('clicking Polygonal Lasso sets select tool with mode lasso-poly', async () => {
        const { container } = render(<Toolbar />);
        const btn = container.querySelector('button[title="Polygonal Lasso"]') as HTMLElement;
        await runScript([{ type: 'click', target: btn }], container);
        const state = useEditorStore.getState();
        expect(state.activeTool).toBe('select');
        expect(state.selection.mode).toBe('lasso-poly');
    });

    it('every registered tool has a clickable Toolbar button', () => {
        const { container } = render(<Toolbar />);
        const expected = [
            'Move', 'Rectangular Marquee', 'Elliptical Marquee', 'Lasso', 'Polygonal Lasso',
            'Magic Wand', 'Quick Selection',
            'Crop (use selection)', 'Eyedropper (Alt+Click sets secondary)',
            'Brush', 'Pencil', 'Eraser', 'Clone Stamp (Alt+Click sets source)',
            'Paint Bucket', 'Gradient', 'Dodge', 'Burn', 'Sponge',
            'Pen', 'Freeform Pen', 'Path Selection', 'Direct Selection',
            'Horizontal Type', 'Vertical Type',
            'Rectangle', 'Rounded Rectangle', 'Ellipse', 'Polygon', 'Line', 'Custom Shape',
            'Hand', 'Zoom (Alt+Click to zoom out)',
        ];
        expected.forEach(label => {
            const btn = container.querySelector(`button[title="${label}"]`);
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
