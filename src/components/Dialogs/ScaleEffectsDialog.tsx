import { useEffect, useState } from 'react';
import { useDialogA11y } from '../../hooks/useDialogA11y';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (scalePercent: number) => void;
    onPreview?: (scalePercent: number) => void;
    onCancelPreview?: () => void;
}

export function ScaleEffectsDialog({ isOpen, onClose, onConfirm, onPreview, onCancelPreview }: Props) {
    const [scale, setScale] = useState(100);
    const [preview, setPreview] = useState(true);
    const dialogRef = useDialogA11y(isOpen, onClose);

    useEffect(() => {
        if (!isOpen) return;
        if (preview && onPreview) onPreview(scale);
    }, [isOpen, preview, scale, onPreview]);

    useEffect(() => {
        if (!isOpen) return;
        function onKey(e: KeyboardEvent) {
            // Opt+P toggles Preview.
            if (e.altKey && (e.key === 'p' || e.key === 'P' || e.key === 'π')) {
                e.preventDefault();
                e.stopPropagation();
                setPreview(v => !v);
            }
        }
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [isOpen]);

    if (!isOpen) return null;

    function handleCancel() {
        if (onCancelPreview) onCancelPreview();
        onClose();
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="scale-effects-title"
                tabIndex={-1}
                data-testid="scale-effects-dialog"
                style={{
                    background: 'hsl(var(--bg-panel))',
                    border: '1px solid hsl(var(--border-light))',
                    borderRadius: '6px',
                    padding: '16px',
                    minWidth: '320px',
                    color: 'hsl(var(--text-main))',
                    fontSize: '12px',
                    boxShadow: 'var(--shadow-lg)',
                }}
            >
                <div id="scale-effects-title" style={{ fontWeight: 600, marginBottom: '12px', fontSize: '13px' }}>Scale Layer Effects</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ width: '80px', fontSize: '11px' }}>Scale</span>
                    <input
                        type="range"
                        min={1}
                        max={1000}
                        value={scale}
                        onChange={e => setScale(Number(e.target.value))}
                        style={{ flex: 1 }}
                        data-testid="scale-effects-slider"
                    />
                    <input
                        type="number"
                        min={1}
                        max={1000}
                        value={scale}
                        onChange={e => setScale(Math.max(1, Math.min(1000, Number(e.target.value) || 100)))}
                        style={{ width: '64px', background: 'hsl(var(--bg-input))', border: '1px solid hsl(var(--border-light))', color: 'hsl(var(--text-main))', padding: '2px 4px', fontSize: '11px' }}
                        data-testid="scale-effects-input"
                    />
                    <span>%</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', fontSize: '11px' }}>
                    <input
                        type="checkbox"
                        checked={preview}
                        onChange={e => {
                            const next = e.target.checked;
                            setPreview(next);
                            if (!next && onCancelPreview) onCancelPreview();
                        }}
                        data-testid="scale-effects-preview"
                    />
                    Preview
                    <span style={{ opacity: 0.5, marginLeft: 'auto' }}>Opt+P</span>
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={handleCancel} style={{ padding: '4px 12px', background: 'transparent', border: '1px solid hsl(var(--border-light))', borderRadius: '3px', color: 'hsl(var(--text-main))', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                    <button
                        onClick={() => { onConfirm(scale); onClose(); }}
                        style={{ padding: '4px 12px', background: 'hsl(var(--accent-primary))', border: 'none', borderRadius: '3px', color: 'white', cursor: 'pointer', fontSize: '12px' }}
                        data-testid="scale-effects-ok"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}
