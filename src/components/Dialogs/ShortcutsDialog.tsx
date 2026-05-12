import { useDialogA11y } from '../../hooks/useDialogA11y';
import { SHORTCUTS, SHORTCUT_GROUP_ORDER, shortcutsByGroup } from '../../core/shortcuts';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

function ShortcutsDialogInner({ onClose }: { onClose: () => void }) {
    const dialogRef = useDialogA11y(true, onClose);
    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={onClose}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="shortcuts-title"
                tabIndex={-1}
                data-testid="shortcuts-dialog"
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#2a2a2a', border: '1px solid #444', borderRadius: 6,
                    padding: 16, color: 'white', fontSize: 12, minWidth: 480, maxWidth: 680, maxHeight: '80vh', overflowY: 'auto',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div id="shortcuts-title" style={{ fontWeight: 600, fontSize: 13 }}>Keyboard Shortcuts</div>
                    <button aria-label="Close" onClick={onClose} style={{ background: 'transparent', border: '1px solid #555', color: 'white', borderRadius: 3, padding: '2px 8px', cursor: 'pointer' }}>Close</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {SHORTCUT_GROUP_ORDER.map(group => {
                        const items = shortcutsByGroup(group);
                        if (items.length === 0) return null;
                        return (
                            <div key={group} data-testid={`shortcuts-group-${group}`}>
                                <div style={{ fontWeight: 600, marginBottom: 4, opacity: 0.85 }}>{group}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {items.map(item => (
                                        <div key={item.action ?? (item.keys + item.label)} data-testid={`shortcut-${item.action ?? item.keys}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                            <span style={{ opacity: 0.9 }}>{item.label}</span>
                                            <span style={{ fontFamily: 'var(--font-mono, monospace)', opacity: 0.7 }}>{item.keys}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export function ShortcutsDialog({ isOpen, onClose }: Props) {
    if (!isOpen) return null;
    return <ShortcutsDialogInner onClose={onClose} />;
}

export { SHORTCUTS };
