import { useState } from 'react';
import { X } from 'lucide-react';
import { useDialogA11y } from '../../hooks/useDialogA11y';

interface ArbitraryRotationDialogProps {
    isOpen: boolean;
    onConfirm: (degrees: number) => void;
    onClose: () => void;
}

export function ArbitraryRotationDialog({ isOpen, onConfirm, onClose }: ArbitraryRotationDialogProps) {
    const [angleText, setAngleText] = useState('0');
    const [direction, setDirection] = useState<'cw' | 'ccw'>('cw');
    const dialogRef = useDialogA11y(isOpen, onClose);

    if (!isOpen) return null;

    const value = Number.parseFloat(angleText);
    const valid = Number.isFinite(value) && Math.abs(value) > 0.0001;
    const submit = () => {
        if (!valid) return;
        onConfirm(direction === 'cw' ? value : -value);
        onClose();
    };

    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }} onClick={onClose}>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="arbitrary-rotation-title" tabIndex={-1}
                style={{ width: 300, background: 'hsl(var(--bg-panel))', border: '1px solid hsl(var(--border-light))', borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}
                onClick={e => e.stopPropagation()}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid hsl(var(--border-light))', background: 'hsl(var(--bg-header))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 id="arbitrary-rotation-title" style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'hsl(var(--text-main))' }}>Rotate Canvas</h3>
                    <button aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer' }}><X size={16} /></button>
                </div>
                <div style={{ padding: 18, display: 'grid', gap: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'hsl(var(--text-main))' }}>
                        Angle:
                        <input
                            autoFocus
                            data-testid="arbitrary-rotation-angle"
                            type="number"
                            step="0.1"
                            value={angleText}
                            onChange={e => setAngleText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
                            style={{ width: 88 }}
                            className="opts-input"
                        />
                        °
                    </label>
                    <div style={{ display: 'grid', gap: 6, fontSize: 12, color: 'hsl(var(--text-main))' }}>
                        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input type="radio" name="arbitrary-rotation-direction" checked={direction === 'cw'} onChange={() => setDirection('cw')} />
                            CW
                        </label>
                        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input type="radio" name="arbitrary-rotation-direction" checked={direction === 'ccw'} onChange={() => setDirection('ccw')} />
                            CCW
                        </label>
                    </div>
                </div>
                <div style={{ padding: '12px 16px', borderTop: '1px solid hsl(var(--border-light))', background: 'hsl(var(--bg-header))', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={onClose} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid hsl(var(--border-light))', color: 'hsl(var(--text-main))', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                    <button data-testid="arbitrary-rotation-ok" disabled={!valid} onClick={submit}
                        style={{ padding: '6px 12px', background: valid ? 'hsl(var(--accent-primary))' : 'hsl(var(--bg-elevated))', color: valid ? 'white' : 'hsl(var(--text-muted))', border: 'none', borderRadius: 4, cursor: valid ? 'pointer' : 'default', fontSize: 12, fontWeight: 500 }}>OK</button>
                </div>
            </div>
        </div>
    );
}
