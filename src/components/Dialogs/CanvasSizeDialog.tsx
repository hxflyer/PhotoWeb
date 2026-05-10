import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface CanvasSizeDialogProps {
    isOpen: boolean;
    currentWidth: number;
    currentHeight: number;
    onConfirm: (w: number, h: number, anchorX: number, anchorY: number, extensionColor: string) => void;
    onClose: () => void;
}

const ANCHORS: [number, number][] = [
    [0, 0], [0.5, 0], [1, 0],
    [0, 0.5], [0.5, 0.5], [1, 0.5],
    [0, 1], [0.5, 1], [1, 1],
];

export function CanvasSizeDialog({ isOpen, currentWidth, currentHeight, onConfirm, onClose }: CanvasSizeDialogProps) {
    const [w, setW] = useState(currentWidth);
    const [h, setH] = useState(currentHeight);
    const [anchorIdx, setAnchorIdx] = useState(4); // center
    const [extensionColor, setExtensionColor] = useState('transparent');

    useEffect(() => {
        if (isOpen) { setW(currentWidth); setH(currentHeight); } // eslint-disable-line react-hooks/set-state-in-effect
    }, [isOpen, currentWidth, currentHeight]);

    if (!isOpen) return null;

    const [anchorX, anchorY] = ANCHORS[anchorIdx];

    const inputStyle: React.CSSProperties = {
        background: 'hsl(var(--bg-input))',
        border: '1px solid hsl(var(--border-light))',
        color: 'hsl(var(--text-main))',
        padding: '6px 8px',
        borderRadius: '4px',
        width: '80px',
    };

    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }} onClick={onClose}>
            <div style={{ width: '380px', background: 'hsl(var(--bg-panel))', border: '1px solid hsl(var(--border-light))', borderRadius: '8px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid hsl(var(--border-light))', background: 'hsl(var(--bg-header))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'hsl(var(--text-main))' }}>Canvas Size</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer' }}><X size={16} /></button>
                </div>
                <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                        <div>
                            <div style={{ fontSize: '12px', color: 'hsl(var(--text-muted))', marginBottom: '4px' }}>Width</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <input data-testid="canvas-size-w" type="number" min={1} value={w} onChange={e => setW(Number(e.target.value))} style={inputStyle} />
                                <span style={{ fontSize: '12px', color: 'hsl(var(--text-muted))' }}>px</span>
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: 'hsl(var(--text-muted))', marginBottom: '4px' }}>Height</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <input data-testid="canvas-size-h" type="number" min={1} value={h} onChange={e => setH(Number(e.target.value))} style={inputStyle} />
                                <span style={{ fontSize: '12px', color: 'hsl(var(--text-muted))' }}>px</span>
                            </div>
                        </div>
                    </div>

                    {/* Anchor grid */}
                    <div style={{ fontSize: '12px', color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Anchor</div>
                    <div data-testid="anchor-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 28px)', gap: '3px', marginBottom: '16px' }}>
                        {ANCHORS.map((_, idx) => (
                            <button
                                key={idx}
                                data-testid={`anchor-${idx}`}
                                onClick={() => setAnchorIdx(idx)}
                                style={{
                                    width: '28px', height: '28px', borderRadius: '4px', cursor: 'pointer',
                                    background: idx === anchorIdx ? 'hsl(var(--accent-primary))' : 'hsl(var(--bg-input))',
                                    border: `1px solid ${idx === anchorIdx ? 'hsl(var(--accent-primary))' : 'hsl(var(--border-light))'}`,
                                }}
                            />
                        ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'hsl(var(--text-muted))', minWidth: '110px' }}>Extension Color</span>
                        <select data-testid="canvas-extension-color" value={extensionColor} onChange={e => setExtensionColor(e.target.value)}
                            style={{ flex: 1, padding: '6px', background: 'hsl(var(--bg-input))', color: 'hsl(var(--text-main))', border: '1px solid hsl(var(--border-light))', borderRadius: '4px', fontSize: '12px' }}>
                            <option value="transparent">Transparent</option>
                            <option value="white">White</option>
                            <option value="black">Black</option>
                        </select>
                    </div>
                </div>
                <div style={{ padding: '12px 16px', borderTop: '1px solid hsl(var(--border-light))', background: 'hsl(var(--bg-header))', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={onClose} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid hsl(var(--border-light))', color: 'hsl(var(--text-main))', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                    <button data-testid="canvas-size-ok" onClick={() => { onConfirm(w, h, anchorX, anchorY, extensionColor); onClose(); }}
                        style={{ padding: '6px 12px', background: 'hsl(var(--accent-primary))', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>OK</button>
                </div>
            </div>
        </div>
    );
}
