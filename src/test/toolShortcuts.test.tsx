import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import App from '../App';
import { runScript } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        activeTool: 'brush',
    }));
}

afterEach(() => {
    // Tear down between tests so the App's global keyboard listener doesn't
    // accumulate across renders and cause Shift-cycle to advance multiple steps.
    cleanup();
});

describe('tool shortcuts — Phase 7.4', () => {
    beforeEach(reset);

    it('B activates brush', async () => {
        render(<App />);
        useEditorStore.getState().setTool('move');
        await runScript([{ type: 'keyDown', key: 'b' }]);
        expect(useEditorStore.getState().activeTool).toBe('brush');
    });

    it('Shift+B cycles between brush and pencil', async () => {
        render(<App />);
        useEditorStore.getState().setTool('brush');
        await runScript([{ type: 'keyDown', key: 'b', modifiers: { shift: true } }]);
        expect(useEditorStore.getState().activeTool).toBe('pencil');
        await runScript([{ type: 'keyDown', key: 'b', modifiers: { shift: true } }]);
        expect(useEditorStore.getState().activeTool).toBe('brush');
    });

    it('Shift+M cycles between Rect and Ellipse marquee', async () => {
        render(<App />);
        useEditorStore.getState().setTool('marquee-rect');
        await runScript([{ type: 'keyDown', key: 'm', modifiers: { shift: true } }]);
        expect(useEditorStore.getState().activeTool).toBe('marquee-ellipse');
        await runScript([{ type: 'keyDown', key: 'm', modifiers: { shift: true } }]);
        expect(useEditorStore.getState().activeTool).toBe('marquee-rect');
    });

    it('Shift+G cycles between Paint Bucket and Gradient', async () => {
        render(<App />);
        useEditorStore.getState().setTool('fill');
        await runScript([{ type: 'keyDown', key: 'g', modifiers: { shift: true } }]);
        expect(useEditorStore.getState().activeTool).toBe('gradient');
    });

    it('Shift+O cycles Dodge / Burn / Sponge', async () => {
        render(<App />);
        useEditorStore.getState().setTool('dodge');
        await runScript([{ type: 'keyDown', key: 'o', modifiers: { shift: true } }]);
        expect(useEditorStore.getState().activeTool).toBe('burn');
        await runScript([{ type: 'keyDown', key: 'o', modifiers: { shift: true } }]);
        expect(useEditorStore.getState().activeTool).toBe('sponge');
        await runScript([{ type: 'keyDown', key: 'o', modifiers: { shift: true } }]);
        expect(useEditorStore.getState().activeTool).toBe('dodge');
    });
});
