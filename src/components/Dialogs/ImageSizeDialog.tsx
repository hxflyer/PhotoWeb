import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { RESAMPLE_METHOD_LABELS, type ResampleMethod } from '../../core/imageTransforms';
import { useDialogA11y } from '../../hooks/useDialogA11y';

interface ImageSizeDialogProps {
    isOpen: boolean;
    currentWidth: number;
    currentHeight: number;
    onConfirm: (w: number, h: number, method: ResampleMethod) => void;
    onClose: () => void;
}

const METHOD_ORDER: ResampleMethod[] = [
    'automatic',
    'bicubic-smoother',
    'bicubic-sharper',
    'bicubic',
    'bilinear',
    'nearest',
];

export function ImageSizeDialog({ isOpen, currentWidth, currentHeight, onConfirm, onClose }: ImageSizeDialogProps) {
    const [w, setW] = useState(currentWidth);
    const [h, setH] = useState(currentHeight);
    const [constrain, setConstrain] = useState(true);
    const [resample, setResample] = useState(true);
    const [method, setMethod] = useState<ResampleMethod>('automatic');
    const dialogRef = useDialogA11y(isOpen, onClose);

    useEffect(() => {
        if (isOpen) { setW(currentWidth); setH(currentHeight); } // eslint-disable-line react-hooks/set-state-in-effect
    }, [isOpen, currentWidth, currentHeight]);

    if (!isOpen) return null;

    const aspect = currentWidth / currentHeight;

    const handleWidthChange = (val: number) => {
        setW(val);
        if (constrain) setH(Math.round(val / aspect));
    };
    const handleHeightChange = (val: number) => {
        setH(val);
        if (constrain) setW(Math.round(val * aspect));
    };

    const effectiveMethod: ResampleMethod = resample ? method : 'nearest';
    const effectiveW = resample ? w : currentWidth;
    const effectiveH = resample ? h : currentHeight;

    const inputStyle: React.CSSProperties = {
        background: 'hsl(var(--bg-input))',
        border: '1px solid hsl(var(--border-light))',
        color: 'hsl(var(--text-main))',
        padding: '6px 8px',
        borderRadius: '4px',
        width: '80px',
        boxSizing: 'border-box',
    };
    const labelStyle: React.CSSProperties = { fontSize: '12px', color: 'hsl(var(--text-muted))', minWidth: '80px' };
    const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' };

    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }} onClick={onClose}>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="image-size-title" tabIndex={-1} style={{ width: '340px', background: 'hsl(var(--bg-panel))', border: '1px solid hsl(var(--border-light))', borderRadius: '8px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid hsl(var(--border-light))', background: 'hsl(var(--bg-header))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 id="image-size-title" style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'hsl(var(--text-main))' }}>Image Size</h3>
                    <button aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer', padding: '4px' }}><X size={16} /></button>
                </div>
                <div style={{ padding: '20px' }}>
                    <div style={rowStyle}>
                        <span style={labelStyle}>Width</span>
                        <input
                            data-testid="img-size-w"
                            type="number"
                            min={1}
                            value={w}
                            disabled={!resample}
                            onChange={e => handleWidthChange(Number(e.target.value))}
                            style={{ ...inputStyle, opacity: resample ? 1 : 0.6 }}
                        />
                        <span style={{ fontSize: '12px', color: 'hsl(var(--text-muted))' }}>px</span>
                    </div>
                    <div style={rowStyle}>
                        <span style={labelStyle}>Height</span>
                        <input
                            data-testid="img-size-h"
                            type="number"
                            min={1}
                            value={h}
                            disabled={!resample}
                            onChange={e => handleHeightChange(Number(e.target.value))}
                            style={{ ...inputStyle, opacity: resample ? 1 : 0.6 }}
                        />
                        <span style={{ fontSize: '12px', color: 'hsl(var(--text-muted))' }}>px</span>
                    </div>
                    <div style={{ ...rowStyle, marginTop: '4px' }}>
                        <label style={{ fontSize: '12px', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input type="checkbox" checked={constrain} onChange={e => setConstrain(e.target.checked)} />
                            Constrain Proportions
                        </label>
                    </div>
                    <div style={{ ...rowStyle, marginTop: '8px' }}>
                        <label style={{ fontSize: '12px', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input data-testid="img-size-resample-toggle" type="checkbox" checked={resample} onChange={e => setResample(e.target.checked)} />
                            Resample
                        </label>
                    </div>
                    <div style={{ ...rowStyle, marginTop: '4px' }}>
                        <span style={labelStyle}>Method</span>
                        <select data-testid="img-size-resample" value={method} disabled={!resample} onChange={e => setMethod(e.target.value as ResampleMethod)}
                            style={{ flex: 1, padding: '6px', background: 'hsl(var(--bg-input))', color: 'hsl(var(--text-main))', border: '1px solid hsl(var(--border-light))', borderRadius: '4px', fontSize: '12px', opacity: resample ? 1 : 0.6 }}>
                            {METHOD_ORDER.map(m => (
                                <option key={m} value={m}>{RESAMPLE_METHOD_LABELS[m]}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div style={{ padding: '12px 16px', borderTop: '1px solid hsl(var(--border-light))', background: 'hsl(var(--bg-header))', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={onClose} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid hsl(var(--border-light))', color: 'hsl(var(--text-main))', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                    <button data-testid="img-size-ok" onClick={() => { onConfirm(effectiveW, effectiveH, effectiveMethod); onClose(); }}
                        style={{ padding: '6px 12px', background: 'hsl(var(--accent-primary))', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>OK</button>
                </div>
            </div>
        </div>
    );
}
