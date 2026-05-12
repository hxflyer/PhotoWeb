import { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import type { SaveSelectionMode } from '../../store/types';

const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
};
const card: React.CSSProperties = {
    background: '#2a2a2a',
    border: '1px solid #444',
    borderRadius: 6,
    padding: 16,
    minWidth: 320,
    color: 'white',
    fontSize: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};
const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#333',
    border: '1px solid #555',
    borderRadius: 3,
    color: 'white',
    padding: '4px 8px',
    fontSize: 12,
};
const btn: React.CSSProperties = {
    padding: '4px 12px',
    background: 'transparent',
    border: '1px solid #555',
    borderRadius: 3,
    color: 'white',
    cursor: 'pointer',
    fontSize: 12,
};
const primaryBtn: React.CSSProperties = { ...btn, background: '#0090ff', border: 'none' };

export function SaveSelectionDialog() {
    const isOpen = useEditorStore(s => s.dialogs.isSaveSelectionDialogOpen);
    const close = useEditorStore.getState().closeSaveSelectionDialog;
    const saveSelection = useEditorStore.getState().saveSelection;
    const saved = useEditorStore(s => s.savedSelections);
    const [name, setName] = useState('Selection');
    const [mode, setMode] = useState<SaveSelectionMode>('new');
    const dialogRef = useDialogA11y(isOpen, close);

    if (!isOpen) return null;

    const exists = saved.some(s => s.name === name.trim());

    function commit() {
        if (!name.trim()) return;
        saveSelection(name.trim(), mode);
        close();
    }

    const saveModes: { id: SaveSelectionMode; label: string }[] = [
        { id: 'new', label: 'New Channel' },
        { id: 'replace', label: 'Replace Channel' },
        { id: 'add', label: 'Add to Channel' },
        { id: 'sub', label: 'Subtract from Channel' },
        { id: 'intersect', label: 'Intersect with Channel' },
    ];

    return (
        <div style={overlay} onClick={close}>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="save-selection-title" tabIndex={-1} style={card} onClick={e => e.stopPropagation()}>
                <div id="save-selection-title" style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>Save Selection</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    <label style={{ fontSize: 11, opacity: 0.7 }}>Name</label>
                    <input type="text" value={name} autoFocus
                        onChange={e => setName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') close(); }}
                        style={inputStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                    <label style={{ fontSize: 11, opacity: 0.7 }}>Operation</label>
                    {saveModes.map(m => {
                        const disabled = (m.id === 'add' || m.id === 'sub' || m.id === 'intersect' || m.id === 'replace') && !exists;
                        return (
                            <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, opacity: disabled ? 0.5 : 1 }}>
                                <input
                                    type="radio"
                                    name="saveSelectionMode"
                                    checked={mode === m.id}
                                    disabled={disabled}
                                    onChange={() => setMode(m.id)}
                                    data-testid={`save-selection-mode-${m.id}`}
                                />
                                {m.label}
                            </label>
                        );
                    })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={close} style={btn}>Cancel</button>
                    <button onClick={commit} style={primaryBtn}>Save</button>
                </div>
            </div>
        </div>
    );
}

export function LoadSelectionDialog() {
    const isOpen = useEditorStore(s => s.dialogs.isLoadSelectionDialogOpen);
    const close = useEditorStore.getState().closeLoadSelectionDialog;
    const saved = useEditorStore(s => s.savedSelections);
    const hasExisting = useEditorStore(s => s.selection.hasSelection);
    const loadSelection = useEditorStore.getState().loadSelection;
    const toggleInvert = useEditorStore.getState().toggleInvertSelection;
    const [picked, setPicked] = useState<string>(saved[0]?.name ?? '');
    const [mode, setMode] = useState<'replace' | 'add' | 'sub' | 'intersect'>('replace');
    const [invert, setInvert] = useState(false);
    const dialogRef = useDialogA11y(isOpen, close);

    if (!isOpen) return null;

    function commit() {
        if (!picked) return;
        loadSelection(picked, mode);
        if (invert) toggleInvert();
        close();
    }

    const modes: { id: typeof mode; label: string }[] = [
        { id: 'replace', label: 'New Selection' },
        { id: 'add', label: 'Add to Selection' },
        { id: 'sub', label: 'Subtract from Selection' },
        { id: 'intersect', label: 'Intersect with Selection' },
    ];

    return (
        <div style={overlay} onClick={close}>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="load-selection-title" tabIndex={-1} style={card} onClick={e => e.stopPropagation()}>
                <div id="load-selection-title" style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>Load Selection</div>
                {saved.length === 0 ? (
                    <div style={{ marginBottom: 12, opacity: 0.7 }}>No saved selections.</div>
                ) : (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                            <label style={{ fontSize: 11, opacity: 0.7 }}>Channel</label>
                            <select value={picked} onChange={e => setPicked(e.target.value)} style={inputStyle}>
                                {saved.map(s => <option key={s.name} value={s.name} style={{ background: '#333' }}>{s.name}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                            <label style={{ fontSize: 11, opacity: 0.7 }}>Operation</label>
                            {modes.map(m => (
                                <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, opacity: !hasExisting && m.id !== 'replace' ? 0.5 : 1 }}>
                                    <input type="radio" name="loadSelectionMode"
                                        checked={mode === m.id}
                                        disabled={!hasExisting && m.id !== 'replace'}
                                        onChange={() => setMode(m.id)} />
                                    {m.label}
                                </label>
                            ))}
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, marginBottom: 12, cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={invert}
                                onChange={e => setInvert(e.target.checked)}
                                data-testid="load-selection-invert"
                            />
                            Invert
                        </label>
                    </>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={close} style={btn}>Cancel</button>
                    <button onClick={commit} disabled={saved.length === 0} style={primaryBtn}>Load</button>
                </div>
            </div>
        </div>
    );
}
