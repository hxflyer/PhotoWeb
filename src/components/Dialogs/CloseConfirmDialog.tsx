import { useDialogA11y } from '../../hooks/useDialogA11y';

interface Props {
    isOpen: boolean;
    documentName: string;
    onDontSave: () => void;
    onCancel: () => void;
    onSave: () => void;
}

// Photoshop's save-on-close dialog: title is "Save changes to the Adobe
// Photoshop document '<name>' before closing?". Three buttons in this order:
// Don't Save, Cancel, Save (Save is the blue default). On macOS, Cmd+D triggers
// Don't Save per Apple HIG; Photoshop honours that on Mac builds.
export function CloseConfirmDialog({ isOpen, documentName, onDontSave, onCancel, onSave }: Props) {
    const dialogRef = useDialogA11y(isOpen, onCancel);
    if (!isOpen) return null;

    function handleKey(e: React.KeyboardEvent<HTMLDivElement>) {
        if (e.key === 'Enter') { e.preventDefault(); onSave(); return; }
        if ((e.metaKey || e.ctrlKey) && (e.key === 'd' || e.key === 'D')) {
            e.preventDefault();
            onDontSave();
        }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="close-confirm-title"
                tabIndex={-1}
                data-testid="close-confirm-dialog"
                onKeyDown={handleKey}
                style={{
                    background: '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: '6px',
                    padding: '18px 18px 14px',
                    color: 'white',
                    fontSize: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    minWidth: '360px',
                    maxWidth: '440px',
                }}
            >
                <div id="close-confirm-title" data-testid="close-confirm-title" style={{ fontSize: '13px', marginBottom: '18px', lineHeight: 1.45 }}>
                    Save changes to the Adobe Photoshop document &quot;{documentName || 'Untitled'}&quot; before closing?
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                        data-testid="close-confirm-dont-save"
                        onClick={onDontSave}
                        style={{ padding: '5px 14px', background: 'transparent', border: '1px solid #555', borderRadius: '3px', color: 'white', cursor: 'pointer', fontSize: '12px' }}
                    >
                        Don&apos;t Save
                    </button>
                    <button
                        data-testid="close-confirm-cancel"
                        onClick={onCancel}
                        style={{ padding: '5px 14px', background: 'transparent', border: '1px solid #555', borderRadius: '3px', color: 'white', cursor: 'pointer', fontSize: '12px' }}
                    >
                        Cancel
                    </button>
                    <button
                        data-testid="close-confirm-save"
                        onClick={onSave}
                        autoFocus
                        style={{ padding: '5px 14px', background: '#0090ff', border: 'none', borderRadius: '3px', color: 'white', cursor: 'pointer', fontSize: '12px' }}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
