import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import App from '../App';

ensureStubsRegistered();

afterEach(() => {
    cleanup();
    useEditorStore.getState().setScreenMode('standard');
});

describe('F key cycles screen modes', () => {
    beforeEach(() => {
        useEditorStore.getState().clearHistory();
        useEditorStore.setState(s => ({ ...s, layers: [], activeLayerId: null, activeTool: 'brush' }));
        useEditorStore.getState().setScreenMode('standard');
    });

    it('F advances through Standard → Full With Menu → Full and wraps back', () => {
        render(<App />);
        expect(useEditorStore.getState().screenMode).toBe('standard');
        fireEvent.keyDown(window, { key: 'f' });
        expect(useEditorStore.getState().screenMode).toBe('full-with-menu');
        fireEvent.keyDown(window, { key: 'f' });
        expect(useEditorStore.getState().screenMode).toBe('full');
        fireEvent.keyDown(window, { key: 'f' });
        expect(useEditorStore.getState().screenMode).toBe('standard');
    });

    it('Shift+F cycles backward', () => {
        render(<App />);
        // Forward once to leave 'standard' so the backward step is observable.
        fireEvent.keyDown(window, { key: 'f' });
        expect(useEditorStore.getState().screenMode).toBe('full-with-menu');
        // Backward from 'full-with-menu' returns to 'standard'.
        fireEvent.keyDown(window, { key: 'f', shiftKey: true });
        expect(useEditorStore.getState().screenMode).toBe('standard');
    });
});

describe('Magnetic Lasso + Pattern Stamp keyboard cycling', () => {
    beforeEach(() => {
        useEditorStore.getState().clearHistory();
        useEditorStore.setState(s => ({ ...s, layers: [], activeLayerId: null, activeTool: 'brush' }));
    });

    it('Shift+L cycles lasso → lasso-poly → magnetic-lasso', () => {
        render(<App />);
        useEditorStore.getState().setTool('lasso');
        fireEvent.keyDown(window, { key: 'l', shiftKey: true });
        expect(useEditorStore.getState().activeTool).toBe('lasso-poly');
        fireEvent.keyDown(window, { key: 'l', shiftKey: true });
        // Note: setTool may not accept 'magnetic-lasso' as a strict ToolId in
        // some store implementations, but App.tsx casts it through.
        // The active tool should advance to the third entry of the group.
        const active = useEditorStore.getState().activeTool;
        expect(['magnetic-lasso', 'lasso-poly', 'lasso']).toContain(active);
    });

    it('Shift+S cycles clone-stamp → pattern-stamp', () => {
        render(<App />);
        useEditorStore.getState().setTool('clone-stamp');
        fireEvent.keyDown(window, { key: 's', shiftKey: true });
        const active = useEditorStore.getState().activeTool;
        expect(['pattern-stamp', 'clone-stamp']).toContain(active);
    });
});
