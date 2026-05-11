import { useEffect, useState } from 'react';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import { useEditorStore } from '../../store/editorStore';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (width: number) => void;
}

export function DefringeDialog({ isOpen, onClose, onConfirm }: Props) {
    const persistedWidth = useEditorStore(s => s.selectionDialogPrefs.defringeWidth);
    const setPref = useEditorStore.getState().setSelectionDialogPref;
    const [width, setWidth] = useState(persistedWidth);
    const dialogRef = useDialogA11y(isOpen, onClose);

    useEffect(() => {
        if (isOpen) setWidth(persistedWidth);
    }, [isOpen, persistedWidth]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        setPref('defringeWidth', width);
        onConfirm(width);
        onClose();
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="defringe-title"
                tabIndex={-1}
                data-testid="defringe-dialog"
                style={{
                    background: '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: '6px',
                    padding: '16px',
                    minWidth: '280px',
                    color: 'white',
                    fontSize: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
            >
                <div id="defringe-title" style={{ fontWeight: 600, marginBottom: '12px', fontSize: '13px' }}>Defringe</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ width: '80px', fontSize: '11px' }}>Width (px)</span>
                    <input
                        type="range"
                        min={1}
                        max={10}
                        value={width}
                        onChange={e => setWidth(Number(e.target.value))}
                        style={{ flex: 1 }}
                        data-testid="defringe-width-slider"
                    />
                    <input
                        type="number"
                        min={1}
                        max={10}
                        value={width}
                        onChange={e => setWidth(Math.max(1, Math.min(10, Number(e.target.value))))}
                        data-testid="defringe-width-input"
                        style={{ width: 48, background: '#333', border: '1px solid #555', borderRadius: 3, color: 'white', padding: '2px 6px', fontSize: 11 }}
                    />
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={onClose} style={{ padding: '4px 12px', background: 'transparent', border: '1px solid #555', borderRadius: '3px', color: 'white', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                    <button
                        onClick={handleConfirm}
                        style={{ padding: '4px 12px', background: '#0090ff', border: 'none', borderRadius: '3px', color: 'white', cursor: 'pointer', fontSize: '12px' }}
                        data-testid="defringe-ok"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}
