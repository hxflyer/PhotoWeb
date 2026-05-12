// Shared Preset dropdown used in every adjustment + filter dialog. Provides
// Save Preset…, Load Preset, Delete Preset, Reset to Default actions backed by
// the presets slice. The dropdown is purely UI; the dialog supplies the
// current params and a callback to apply a loaded preset.

import { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import type { PresetKind } from '../../store/presetsSlice';
import { useShallow } from 'zustand/react/shallow';

interface PresetDropdownProps {
    kind: PresetKind;
    /** Adjustment id or Filter id; presets are keyed by `(kind, id, name)`. */
    id: string;
    /** Current params snapshot — used when the user clicks Save Preset…. */
    currentParams: Record<string, unknown>;
    /** Default params — used when the user clicks Reset to Default. */
    defaultParams: Record<string, unknown>;
    /** Apply a chosen preset's params back to the dialog. */
    onApply: (params: Record<string, unknown>) => void;
}

const inputStyle: React.CSSProperties = {
    background: 'hsl(var(--bg-input))',
    border: '1px solid hsl(var(--border-light))',
    borderRadius: 2,
    color: 'hsl(var(--text-main))',
    padding: '3px 5px',
    fontSize: 11,
};

export function PresetDropdown({ kind, id, currentParams, defaultParams, onApply }: PresetDropdownProps) {
    const { savePreset, deletePreset, presets } = useEditorStore(
        useShallow((s) => ({
            savePreset: s.savePreset,
            deletePreset: s.deletePreset,
            presets: s.presetStore[kind][id] ?? [],
        }))
    );
    const [selectedId, setSelectedId] = useState<string>('');

    const handleChange = (value: string) => {
        if (value === '__save__') {
            const name = window.prompt('Preset name', 'Custom');
            if (!name) { setSelectedId(''); return; }
            const entry = savePreset(kind, id, name, currentParams);
            setSelectedId(entry.id);
            return;
        }
        if (value === '__reset__') {
            onApply({ ...defaultParams });
            setSelectedId('');
            return;
        }
        if (value === '__delete__') {
            if (!selectedId) return;
            deletePreset(kind, id, selectedId);
            setSelectedId('');
            return;
        }
        if (value === '__default__') {
            setSelectedId('');
            onApply({ ...defaultParams });
            return;
        }
        const preset = presets.find(p => p.id === value);
        if (preset) {
            setSelectedId(preset.id);
            onApply({ ...preset.params });
        }
    };

    return (
        <label
            data-testid={`preset-dropdown-${kind}-${id}`}
            style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: 8, alignItems: 'center', marginBottom: 8 }}
        >
            <span>Preset</span>
            <select
                data-testid={`preset-select-${kind}-${id}`}
                value={selectedId}
                onChange={e => handleChange(e.target.value)}
                style={{ ...inputStyle, width: '100%' }}
            >
                <option value="__default__">Default</option>
                {presets.length > 0 && <option disabled>──────────</option>}
                {presets.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                ))}
                <option disabled>──────────</option>
                <option value="__save__">Save Preset…</option>
                <option value="__delete__" disabled={!selectedId}>Delete Preset</option>
                <option value="__reset__">Reset to Default</option>
            </select>
        </label>
    );
}
