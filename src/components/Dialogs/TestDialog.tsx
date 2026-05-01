import { X } from 'lucide-react';


interface TestDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function TestDialog({ isOpen, onClose }: TestDialogProps) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(2px)'
        }} onClick={onClose}>
            <div style={{
                width: '400px',
                backgroundColor: 'hsl(var(--bg-panel))',
                border: '1px solid hsl(var(--border-light))',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-lg)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid hsl(var(--border-light))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'hsl(var(--bg-header))'
                }}>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'hsl(var(--text-main))' }}>Test Dialog</h3>
                    <button onClick={onClose} style={{
                        background: 'none',
                        border: 'none',
                        color: 'hsl(var(--text-muted))',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        borderRadius: '4px'
                    }}>
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '24px', color: 'hsl(var(--text-muted))', fontSize: '14px' }}>
                    <p style={{ marginTop: 0 }}>This is a test dialog box for testing purposes.</p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                        <button style={{
                            flex: 1,
                            padding: '8px',
                            backgroundColor: 'hsl(var(--accent-primary))',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}>Confirm</button>
                        <button onClick={onClose} style={{
                            flex: 1,
                            padding: '8px',
                            backgroundColor: 'transparent',
                            border: '1px solid hsl(var(--border-light))',
                            color: 'hsl(var(--text-main))',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}>Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
