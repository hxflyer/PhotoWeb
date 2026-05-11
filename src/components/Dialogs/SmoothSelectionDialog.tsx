import { useEffect, useState } from 'react';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import { useEditorStore } from '../../store/editorStore';

export function SmoothSelectionDialog() {
    const isOpen = useEditorStore(s => s.isSmoothSelectionDialogOpen);
    const persistedRadius = useEditorStore(s => s.selectionDialogPrefs.smoothRadius);
    const close = useEditorStore.getState().closeSmoothSelectionDialog;
    const setPref = useEditorStore.getState().setSelectionDialogPref;
    const [radius, setRadius] = useState(persistedRadius);
    const dialogRef = useDialogA11y(isOpen, close);

    useEffect(() => {
        if (isOpen) setRadius(persistedRadius);
    }, [isOpen, persistedRadius]);

    if (!isOpen) return null;

    const handleOk = () => {
        const r = Math.max(1, Math.min(100, Math.round(radius)));
        setPref('smoothRadius', r);
        useEditorStore.getState().smoothSelection(r);
        close();
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={close}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="smooth-title"
                tabIndex={-1}
                data-testid="smooth-selection-dialog"
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: 6,
                    padding: 16,
                    minWidth: 280,
                    color: 'white',
                    fontSize: 12,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
            >
                <div id="smooth-title" style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>Smooth Selection</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span style={{ width: 80, fontSize: 11 }}>Radius (px)</span>
                    <input
                        type="number"
                        min={1}
                        max={100}
                        value={radius}
                        onChange={e => setRadius(Math.max(1, Math.min(100, Number(e.target.value))))}
                        onKeyDown={e => { if (e.key === 'Enter') handleOk(); }}
                        autoFocus
                        data-testid="smooth-radius-input"
                        style={{ flex: 1, background: '#333', border: '1px solid #555', borderRadius: 3, color: 'white', padding: '4px 8px', fontSize: 12 }}
                    />
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={close} style={{ padding: '4px 12px', background: 'transparent', border: '1px solid #555', borderRadius: 3, color: 'white', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                    <button
                        onClick={handleOk}
                        data-testid="smooth-selection-ok"
                        style={{ padding: '4px 12px', background: '#0090ff', border: 'none', borderRadius: 3, color: 'white', cursor: 'pointer', fontSize: 12 }}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}
