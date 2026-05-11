import { useEffect, useState } from 'react';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import { useEditorStore } from '../../store/editorStore';

export function BorderSelectionDialog() {
    const isOpen = useEditorStore(s => s.isBorderSelectionDialogOpen);
    const persistedWidth = useEditorStore(s => s.selectionDialogPrefs.borderWidth);
    const close = useEditorStore.getState().closeBorderSelectionDialog;
    const setPref = useEditorStore.getState().setSelectionDialogPref;
    const [width, setWidth] = useState(persistedWidth);
    const dialogRef = useDialogA11y(isOpen, close);

    useEffect(() => {
        if (isOpen) setWidth(persistedWidth);
    }, [isOpen, persistedWidth]);

    if (!isOpen) return null;

    const handleOk = () => {
        const w = Math.max(1, Math.min(250, Math.round(width)));
        setPref('borderWidth', w);
        useEditorStore.getState().borderSelection(w);
        close();
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={close}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="border-title"
                tabIndex={-1}
                data-testid="border-selection-dialog"
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
                <div id="border-title" style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>Border Selection</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span style={{ width: 80, fontSize: 11 }}>Width (px)</span>
                    <input
                        type="number"
                        min={1}
                        max={250}
                        value={width}
                        onChange={e => setWidth(Math.max(1, Math.min(250, Number(e.target.value))))}
                        onKeyDown={e => { if (e.key === 'Enter') handleOk(); }}
                        autoFocus
                        data-testid="border-width-input"
                        style={{ flex: 1, background: '#333', border: '1px solid #555', borderRadius: 3, color: 'white', padding: '4px 8px', fontSize: 12 }}
                    />
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={close} style={{ padding: '4px 12px', background: 'transparent', border: '1px solid #555', borderRadius: 3, color: 'white', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                    <button
                        onClick={handleOk}
                        data-testid="border-selection-ok"
                        style={{ padding: '4px 12px', background: '#0090ff', border: 'none', borderRadius: 3, color: 'white', cursor: 'pointer', fontSize: 12 }}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}
