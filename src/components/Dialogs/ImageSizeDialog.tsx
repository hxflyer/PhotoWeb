import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { RESAMPLE_METHOD_LABELS, type ResampleMethod } from '../../core/imageTransforms';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import { evaluateNumericExpression } from '../../utils/numericExpression';

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

// Photoshop-style chain-link / broken-link glyph for Constrain Proportions.
function ChainLinkIcon({ linked }: { linked: boolean }) {
    const stroke = 'currentColor';
    if (linked) {
        return (
            <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden data-testid="chain-link-locked">
                <path d="M5 4 C3.5 4 2.5 5 2.5 6.5 C2.5 8 3.5 9 5 9 L6 9" stroke={stroke} strokeWidth={1.4} fill="none" strokeLinecap="round" />
                <path d="M9 5 L8 5 C9.5 5 10.5 6 10.5 7.5 C10.5 9 9.5 10 8 10 L7 10" stroke={stroke} strokeWidth={1.4} fill="none" strokeLinecap="round" />
                <path d="M6 7 L8 7" stroke={stroke} strokeWidth={1.4} strokeLinecap="round" />
            </svg>
        );
    }
    return (
        <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden data-testid="chain-link-broken">
            <path d="M5 4 C3.5 4 2.5 5 2.5 6.5 C2.5 8 3.5 9 5 9" stroke={stroke} strokeWidth={1.4} fill="none" strokeLinecap="round" />
            <path d="M9 5 C10.5 5 11.5 6 11.5 7.5 C11.5 9 10.5 10 9 10" stroke={stroke} strokeWidth={1.4} fill="none" strokeLinecap="round" />
            <path d="M5 7 L6 7 M8 7 L9 7" stroke={stroke} strokeWidth={1.4} strokeLinecap="round" />
        </svg>
    );
}

export function ImageSizeDialog({ isOpen, currentWidth, currentHeight, onConfirm, onClose }: ImageSizeDialogProps) {
    const [w, setW] = useState(currentWidth);
    const [h, setH] = useState(currentHeight);
    const [wText, setWText] = useState(String(currentWidth));
    const [hText, setHText] = useState(String(currentHeight));
    const [constrain, setConstrain] = useState(true);
    const [resample, setResample] = useState(true);
    const [method, setMethod] = useState<ResampleMethod>('automatic');
    const dialogRef = useDialogA11y(isOpen, onClose);

    useEffect(() => {
        if (isOpen) {
            /* eslint-disable react-hooks/set-state-in-effect */
            setW(currentWidth); setH(currentHeight);
            setWText(String(currentWidth)); setHText(String(currentHeight));
            /* eslint-enable react-hooks/set-state-in-effect */
        }
    }, [isOpen, currentWidth, currentHeight]);

    if (!isOpen) return null;

    const aspect = currentWidth / currentHeight;

    const handleWidthChange = (val: number) => {
        setW(val);
        setWText(String(val));
        if (constrain) {
            const newH = Math.round(val / aspect);
            setH(newH);
            setHText(String(newH));
        }
    };
    const handleHeightChange = (val: number) => {
        setH(val);
        setHText(String(val));
        if (constrain) {
            const newW = Math.round(val * aspect);
            setW(newW);
            setWText(String(newW));
        }
    };
    const commitWidth = (text: string) => {
        const v = evaluateNumericExpression(text);
        if (v !== null && v > 0) handleWidthChange(Math.round(v));
        else setWText(String(w));
    };
    const commitHeight = (text: string) => {
        const v = evaluateNumericExpression(text);
        if (v !== null && v > 0) handleHeightChange(Math.round(v));
        else setHText(String(h));
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
                            type="text"
                            value={wText}
                            disabled={!resample}
                            onChange={e => {
                                setWText(e.target.value);
                                const v = evaluateNumericExpression(e.target.value);
                                if (v !== null && v > 0) {
                                    setW(Math.round(v));
                                    if (constrain) {
                                        const newH = Math.round(Math.round(v) / aspect);
                                        setH(newH);
                                        setHText(String(newH));
                                    }
                                }
                            }}
                            onBlur={e => commitWidth(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitWidth((e.target as HTMLInputElement).value); } }}
                            style={{ ...inputStyle, opacity: resample ? 1 : 0.6 }}
                        />
                        <span style={{ fontSize: '12px', color: 'hsl(var(--text-muted))' }}>px</span>
                    </div>
                    <div style={rowStyle}>
                        <span style={labelStyle}>Height</span>
                        <input
                            data-testid="img-size-h"
                            type="text"
                            value={hText}
                            disabled={!resample}
                            onChange={e => {
                                setHText(e.target.value);
                                const v = evaluateNumericExpression(e.target.value);
                                if (v !== null && v > 0) {
                                    setH(Math.round(v));
                                    if (constrain) {
                                        const newW = Math.round(Math.round(v) * aspect);
                                        setW(newW);
                                        setWText(String(newW));
                                    }
                                }
                            }}
                            onBlur={e => commitHeight(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitHeight((e.target as HTMLInputElement).value); } }}
                            style={{ ...inputStyle, opacity: resample ? 1 : 0.6 }}
                        />
                        <span style={{ fontSize: '12px', color: 'hsl(var(--text-muted))' }}>px</span>
                    </div>
                    <div style={{ ...rowStyle, marginTop: '4px' }}>
                        <button
                            data-testid="img-size-constrain"
                            aria-pressed={constrain}
                            aria-label="Constrain Proportions"
                            title="Constrain Proportions"
                            onClick={() => setConstrain(c => !c)}
                            style={{
                                width: 24, height: 24,
                                background: constrain ? 'hsl(var(--accent-primary))' : 'hsl(var(--bg-input))',
                                color: constrain ? '#fff' : 'hsl(var(--text-main))',
                                border: '1px solid hsl(var(--border-light))',
                                borderRadius: 4,
                                cursor: 'pointer',
                                padding: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            <ChainLinkIcon linked={constrain} />
                        </button>
                        <span style={{ fontSize: '12px', color: 'hsl(var(--text-muted))' }}>Constrain Proportions</span>
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
