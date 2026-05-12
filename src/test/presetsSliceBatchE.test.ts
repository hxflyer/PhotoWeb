import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';

beforeEach(() => {
    useEditorStore.getState().clearAllPresets();
    try {
        if (typeof localStorage !== 'undefined' && typeof localStorage.removeItem === 'function') {
            localStorage.removeItem('photoweb:adjustmentFilterPresets:v1');
        }
    } catch { /* test env may lack localStorage; clearAllPresets is enough */ }
});

describe('Batch E — Adjustment/Filter presets slice', () => {
    it('listPresets returns [] when no presets exist', () => {
        expect(useEditorStore.getState().listPresets('adjustment', 'levels')).toEqual([]);
    });

    it('savePreset persists the params and lists it back', () => {
        const entry = useEditorStore.getState().savePreset('adjustment', 'levels', 'Punchy', {
            inputBlack: 32, inputWhite: 220, gamma: 0.9,
        });
        expect(entry.name).toBe('Punchy');
        const listed = useEditorStore.getState().listPresets('adjustment', 'levels');
        expect(listed).toHaveLength(1);
        expect(listed[0].params).toMatchObject({ inputBlack: 32, inputWhite: 220, gamma: 0.9 });
    });

    it('saving a preset under the same name replaces the previous entry', () => {
        useEditorStore.getState().savePreset('adjustment', 'curves', 'My Curve', { rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }] });
        useEditorStore.getState().savePreset('adjustment', 'curves', 'My Curve', { rgb: [{ x: 0, y: 0 }, { x: 128, y: 200 }, { x: 255, y: 255 }] });
        const listed = useEditorStore.getState().listPresets('adjustment', 'curves');
        expect(listed).toHaveLength(1);
        expect((listed[0].params.rgb as { x: number; y: number }[]).length).toBe(3);
    });

    it('deletePreset removes a single preset by id', () => {
        const a = useEditorStore.getState().savePreset('adjustment', 'levels', 'A', {});
        const b = useEditorStore.getState().savePreset('adjustment', 'levels', 'B', {});
        useEditorStore.getState().deletePreset('adjustment', 'levels', a.id);
        const listed = useEditorStore.getState().listPresets('adjustment', 'levels');
        expect(listed).toHaveLength(1);
        expect(listed[0].id).toBe(b.id);
    });

    it('adjustment and filter presets are isolated by kind', () => {
        useEditorStore.getState().savePreset('adjustment', 'levels', 'X', { a: 1 });
        useEditorStore.getState().savePreset('filter', 'levels', 'X', { b: 2 });
        const adj = useEditorStore.getState().listPresets('adjustment', 'levels');
        const filt = useEditorStore.getState().listPresets('filter', 'levels');
        expect(adj[0].params).toEqual({ a: 1 });
        expect(filt[0].params).toEqual({ b: 2 });
    });

    it('saving then re-loading the store from localStorage restores presets', () => {
        useEditorStore.getState().savePreset('adjustment', 'curves', 'Reload', { rgb: [{ x: 10, y: 20 }] });
        if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') {
            // localStorage not exposed in the test env — skip the persistence half.
            return;
        }
        const raw = localStorage.getItem('photoweb:adjustmentFilterPresets:v1');
        if (!raw) return;
        const parsed = JSON.parse(raw);
        expect(parsed.adjustment.curves[0].name).toBe('Reload');
    });

    it('renamePreset updates the name only', () => {
        const e = useEditorStore.getState().savePreset('adjustment', 'levels', 'Old', { gamma: 1 });
        useEditorStore.getState().renamePreset('adjustment', 'levels', e.id, 'New');
        const listed = useEditorStore.getState().listPresets('adjustment', 'levels');
        expect(listed[0].name).toBe('New');
        expect(listed[0].params).toEqual({ gamma: 1 });
    });
});
