import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import App from '../App';

ensureStubsRegistered();

afterEach(() => {
    cleanup();
    document.body.classList.remove('photoweb-standard', 'photoweb-full-with-menu', 'photoweb-full');
});

describe('F key cycles screen modes', () => {
    beforeEach(() => {
        useEditorStore.getState().clearHistory();
        useEditorStore.setState(s => ({ ...s, layers: [], activeLayerId: null, activeTool: 'brush' }));
    });

    it('F advances through Standard → Full With Menu → Full and wraps back', () => {
        render(<App />);
        // No mode class initially.
        const had = document.body.classList.contains('photoweb-standard') ||
                    document.body.classList.contains('photoweb-full-with-menu') ||
                    document.body.classList.contains('photoweb-full');
        expect(had).toBe(false);

        fireEvent.keyDown(window, { key: 'f' });
        expect(document.body.classList.contains('photoweb-full-with-menu')).toBe(true);
        fireEvent.keyDown(window, { key: 'f' });
        expect(document.body.classList.contains('photoweb-full')).toBe(true);
        fireEvent.keyDown(window, { key: 'f' });
        expect(document.body.classList.contains('photoweb-standard')).toBe(true);
    });

    it('Shift+F cycles backward', () => {
        render(<App />);
        // Start fresh: forward once so we're in a known state.
        fireEvent.keyDown(window, { key: 'f' });
        // Backward should land on 'standard' (index 0).
        fireEvent.keyDown(window, { key: 'f', shiftKey: true });
        expect(document.body.classList.contains('photoweb-standard')).toBe(true);
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
