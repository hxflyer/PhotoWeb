import { useState } from 'react';
import { X } from 'lucide-react';
import type { TrimBasis } from '../../core/imageTransforms';
import { useDialogA11y } from '../../hooks/useDialogA11y';

interface TrimDialogProps {
    isOpen: boolean;
    onConfirm: (basis: TrimBasis, sides: { top: boolean; right: boolean; bottom: boolean; left: boolean }) => void;
    onClose: () => void;
}

export function TrimDialog({ isOpen, onConfirm, onClose }: TrimDialogProps) {
    const [basis, setBasis] = useState<TrimBasis>('transparent');
    const [sides, setSides] = useState({ top: true, right: true, bottom: true, left: true });
    const dialogRef = useDialogA11y(isOpen, onClose);

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }} onClick={onClose}>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="trim-title" tabIndex={-1} style={{ width: '300px', background: 'hsl(var(--bg-panel))', border: '1px solid hsl(var(--border-light))', borderRadius: '8px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid hsl(var(--border-light))', background: 'hsl(var(--bg-header))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 id="trim-title" style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'hsl(var(--text-main))' }}>Trim</h3>
                    <button aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer' }}><X size={16} /></button>
                </div>
                <div style={{ padding: '20px' }}>
                    <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '12px', color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Based On</div>
                        {(['transparent', 'top-left', 'bottom-right'] as TrimBasis[]).map(b => (
                            <label key={b} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'hsl(var(--text-main))', marginBottom: '4px', cursor: 'pointer' }}>
                                <input type="radio" name="trim-basis" value={b} checked={basis === b} onChange={() => setBasis(b)} />
                                {b === 'transparent' ? 'Transparent Pixels' : b === 'top-left' ? 'Top Left Pixel Color' : 'Bottom Right Pixel Color'}
                            </label>
                        ))}
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Trim Away</div>
                        {(['top', 'right', 'bottom', 'left'] as const).map(side => (
                            <label key={side} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'hsl(var(--text-main))', marginBottom: '4px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={sides[side]} onChange={e => setSides(s => ({ ...s, [side]: e.target.checked }))} />
                                {side.charAt(0).toUpperCase() + side.slice(1)}
                            </label>
                        ))}
                    </div>
                </div>
                <div style={{ padding: '12px 16px', borderTop: '1px solid hsl(var(--border-light))', background: 'hsl(var(--bg-header))', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={onClose} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid hsl(var(--border-light))', color: 'hsl(var(--text-main))', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                    <button data-testid="trim-ok" onClick={() => { onConfirm(basis, sides); onClose(); }}
                        style={{ padding: '6px 12px', background: 'hsl(var(--accent-primary))', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>OK</button>
                </div>
            </div>
        </div>
    );
}
