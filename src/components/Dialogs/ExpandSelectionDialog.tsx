import { useEffect, useState } from 'react';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import { useEditorStore } from '../../store/editorStore';

export function ExpandSelectionDialog() {
    const isOpen = useEditorStore(s => s.isExpandSelectionDialogOpen);
    const persisted = useEditorStore(s => s.selectionDialogPrefs.expandPx);
    const close = useEditorStore.getState().closeExpandSelectionDialog;
    const setPref = useEditorStore.getState().setSelectionDialogPref;
    const [px, setPx] = useState(persisted);
    const dialogRef = useDialogA11y(isOpen, close);

    useEffect(() => {
        if (isOpen) setPx(persisted);
    }, [isOpen, persisted]);

    if (!isOpen) return null;

    const handleOk = () => {
        const v = Math.max(1, Math.min(500, Math.round(px)));
        setPref('expandPx', v);
        useEditorStore.getState().expandSelection(v);
        close();
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={close}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="expand-title"
                tabIndex={-1}
                data-testid="expand-selection-dialog"
                onClick={e => e.stopPropagation()}
                style={{ background: '#2a2a2a', border: '1px solid #444', borderRadius: 6, padding: 16, minWidth: 280, color: 'white', fontSize: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
            >
                <div id="expand-title" style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>Expand Selection</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span style={{ width: 80, fontSize: 11 }}>Expand By (px)</span>
                    <input
                        type="number"
                        min={1}
                        max={500}
                        value={px}
                        onChange={e => setPx(Math.max(1, Math.min(500, Number(e.target.value))))}
                        onKeyDown={e => { if (e.key === 'Enter') handleOk(); }}
                        autoFocus
                        data-testid="expand-px-input"
                        style={{ flex: 1, background: '#333', border: '1px solid #555', borderRadius: 3, color: 'white', padding: '4px 8px', fontSize: 12 }}
                    />
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={close} style={{ padding: '4px 12px', background: 'transparent', border: '1px solid #555', borderRadius: 3, color: 'white', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                    <button onClick={handleOk} data-testid="expand-selection-ok" style={{ padding: '4px 12px', background: '#0090ff', border: 'none', borderRadius: 3, color: 'white', cursor: 'pointer', fontSize: 12 }}>OK</button>
                </div>
            </div>
        </div>
    );
}

export function ContractSelectionDialog() {
    const isOpen = useEditorStore(s => s.isContractSelectionDialogOpen);
    const persisted = useEditorStore(s => s.selectionDialogPrefs.contractPx);
    const close = useEditorStore.getState().closeContractSelectionDialog;
    const setPref = useEditorStore.getState().setSelectionDialogPref;
    const [px, setPx] = useState(persisted);
    const dialogRef = useDialogA11y(isOpen, close);

    useEffect(() => {
        if (isOpen) setPx(persisted);
    }, [isOpen, persisted]);

    if (!isOpen) return null;

    const handleOk = () => {
        const v = Math.max(1, Math.min(500, Math.round(px)));
        setPref('contractPx', v);
        useEditorStore.getState().contractSelection(v);
        close();
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={close}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="contract-title"
                tabIndex={-1}
                data-testid="contract-selection-dialog"
                onClick={e => e.stopPropagation()}
                style={{ background: '#2a2a2a', border: '1px solid #444', borderRadius: 6, padding: 16, minWidth: 280, color: 'white', fontSize: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
            >
                <div id="contract-title" style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>Contract Selection</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span style={{ width: 80, fontSize: 11 }}>Contract By (px)</span>
                    <input
                        type="number"
                        min={1}
                        max={500}
                        value={px}
                        onChange={e => setPx(Math.max(1, Math.min(500, Number(e.target.value))))}
                        onKeyDown={e => { if (e.key === 'Enter') handleOk(); }}
                        autoFocus
                        data-testid="contract-px-input"
                        style={{ flex: 1, background: '#333', border: '1px solid #555', borderRadius: 3, color: 'white', padding: '4px 8px', fontSize: 12 }}
                    />
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={close} style={{ padding: '4px 12px', background: 'transparent', border: '1px solid #555', borderRadius: 3, color: 'white', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                    <button onClick={handleOk} data-testid="contract-selection-ok" style={{ padding: '4px 12px', background: '#0090ff', border: 'none', borderRadius: 3, color: 'white', cursor: 'pointer', fontSize: 12 }}>OK</button>
                </div>
            </div>
        </div>
    );
}
