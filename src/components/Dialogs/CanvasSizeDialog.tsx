import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import { evaluateNumericExpression } from '../../utils/numericExpression';

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

// Compass-style arrow used in the anchor grid: rotation is computed from the
// signed (dx, dy) offset between the cell and the anchor, so cells "around"
// the anchor point outward toward themselves.
function AnchorArrow({ dx, dy }: { dx: number; dy: number }) {
    // Angle in degrees; 0 = up. atan2 gives (y up), so flip sign.
    const angle = Math.atan2(dx, -dy) * 180 / Math.PI;
    return (
        <svg
            data-testid={`anchor-arrow-${dx}-${dy}`}
            width={12}
            height={12}
            viewBox="0 0 12 12"
            style={{ transform: `rotate(${angle}deg)` }}
            aria-hidden
        >
            {/* Up arrow: a stem with a triangle head. */}
            <path d="M6 2 L6 10 M3 5 L6 2 L9 5" stroke="hsl(var(--text-main))" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function formatSize(w: number, h: number): string {
    // RGBA bytes for a flat canvas, mirrors Photoshop's "X.X M" header.
    const bytes = Math.max(0, w) * Math.max(0, h) * 4;
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} M`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} K`;
    return `${bytes} B`;
}

export function CanvasSizeDialog({ isOpen, currentWidth, currentHeight, onConfirm, onClose }: CanvasSizeDialogProps) {
    const [w, setW] = useState(currentWidth);
    const [h, setH] = useState(currentHeight);
    const [wText, setWText] = useState(String(currentWidth));
    const [hText, setHText] = useState(String(currentHeight));
    const [relative, setRelative] = useState(false);
    const [anchorIdx, setAnchorIdx] = useState(4); // center
    const [extensionColor, setExtensionColor] = useState('transparent');
    const dialogRef = useDialogA11y(isOpen, onClose);

    useEffect(() => {
        if (isOpen) {
            /* eslint-disable react-hooks/set-state-in-effect */
            setW(currentWidth);
            setH(currentHeight);
            setWText(String(currentWidth));
            setHText(String(currentHeight));
            setRelative(false);
            /* eslint-enable react-hooks/set-state-in-effect */
        }
    }, [isOpen, currentWidth, currentHeight]);

    function commitField(text: string, setter: (n: number) => void, textSetter: (s: string) => void, current: number) {
        const v = evaluateNumericExpression(text);
        if (v !== null) {
            setter(Math.round(v));
            textSetter(String(Math.round(v)));
        } else {
            textSetter(String(current));
        }
    }

    if (!isOpen) return null;

    const [anchorX, anchorY] = ANCHORS[anchorIdx];

    const newW = relative ? Math.max(1, currentWidth + w) : Math.max(1, w);
    const newH = relative ? Math.max(1, currentHeight + h) : Math.max(1, h);

    const inputStyle: React.CSSProperties = {
        background: 'hsl(var(--bg-input))',
        border: '1px solid hsl(var(--border-light))',
        color: 'hsl(var(--text-main))',
        padding: '6px 8px',
        borderRadius: '4px',
        width: '80px',
    };

    function toggleRelative(next: boolean) {
        if (next) {
            // Switching ON: zero out the deltas (Photoshop verbatim).
            setW(0);
            setH(0);
            setWText('0');
            setHText('0');
        } else {
            // Switching OFF: re-populate with computed absolute values.
            setW(newW);
            setH(newH);
            setWText(String(newW));
            setHText(String(newH));
        }
        setRelative(next);
    }

    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }} onClick={onClose}>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="canvas-size-title" tabIndex={-1} style={{ width: '380px', background: 'hsl(var(--bg-panel))', border: '1px solid hsl(var(--border-light))', borderRadius: '8px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid hsl(var(--border-light))', background: 'hsl(var(--bg-header))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 id="canvas-size-title" style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'hsl(var(--text-main))' }}>Canvas Size</h3>
                    <button aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer' }}><X size={16} /></button>
                </div>
                <div style={{ padding: '20px' }}>
                    {/* Current / New Size header */}
                    <div data-testid="canvas-size-header" style={{ marginBottom: '16px', fontSize: '11px', color: 'hsl(var(--text-muted))' }}>
                        <div data-testid="canvas-size-current">Current Size: <span style={{ color: 'hsl(var(--text-main))' }}>{formatSize(currentWidth, currentHeight)}</span> — {currentWidth} × {currentHeight} px</div>
                        <div data-testid="canvas-size-new">New Size: <span style={{ color: 'hsl(var(--text-main))' }}>{formatSize(newW, newH)}</span> — {newW} × {newH} px</div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                        <div>
                            <div style={{ fontSize: '12px', color: 'hsl(var(--text-muted))', marginBottom: '4px' }}>Width</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <input
                                    data-testid="canvas-size-w"
                                    type="text"
                                    value={wText}
                                    onChange={e => { setWText(e.target.value); const v = evaluateNumericExpression(e.target.value); if (v !== null) setW(Math.round(v)); }}
                                    onBlur={e => commitField(e.target.value, setW, setWText, w)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitField((e.target as HTMLInputElement).value, setW, setWText, w); } }}
                                    style={inputStyle}
                                />
                                <span style={{ fontSize: '12px', color: 'hsl(var(--text-muted))' }}>px</span>
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: 'hsl(var(--text-muted))', marginBottom: '4px' }}>Height</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <input
                                    data-testid="canvas-size-h"
                                    type="text"
                                    value={hText}
                                    onChange={e => { setHText(e.target.value); const v = evaluateNumericExpression(e.target.value); if (v !== null) setH(Math.round(v)); }}
                                    onBlur={e => commitField(e.target.value, setH, setHText, h)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitField((e.target as HTMLInputElement).value, setH, setHText, h); } }}
                                    style={inputStyle}
                                />
                                <span style={{ fontSize: '12px', color: 'hsl(var(--text-muted))' }}>px</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                        <label style={{ fontSize: '12px', color: 'hsl(var(--text-muted))', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <input
                                data-testid="canvas-size-relative"
                                type="checkbox"
                                checked={relative}
                                onChange={e => toggleRelative(e.target.checked)}
                            />
                            Relative
                        </label>
                    </div>

                    {/* Anchor grid. Each non-anchor cell shows an arrow pointing
                        AWAY from the anchor, mirroring Photoshop's Canvas Size
                        dialog hint for which sides will gain space. */}
                    <div style={{ fontSize: '12px', color: 'hsl(var(--text-muted))', marginBottom: '6px' }}>Anchor</div>
                    <div data-testid="anchor-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 28px)', gap: '3px', marginBottom: '16px' }}>
                        {ANCHORS.map((_, idx) => {
                            const isAnchor = idx === anchorIdx;
                            const col = idx % 3;
                            const row = Math.floor(idx / 3);
                            const acol = anchorIdx % 3;
                            const arow = Math.floor(anchorIdx / 3);
                            const dx = col - acol;
                            const dy = row - arow;
                            return (
                                <button
                                    key={idx}
                                    data-testid={`anchor-${idx}`}
                                    aria-label={isAnchor ? 'Anchor cell' : `Extend toward column ${col + 1}, row ${row + 1}`}
                                    onClick={() => setAnchorIdx(idx)}
                                    style={{
                                        width: '28px', height: '28px', borderRadius: '4px', cursor: 'pointer',
                                        background: isAnchor ? 'hsl(var(--accent-primary))' : 'hsl(var(--bg-input))',
                                        border: `1px solid ${isAnchor ? 'hsl(var(--accent-primary))' : 'hsl(var(--border-light))'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        padding: 0,
                                    }}
                                >
                                    {isAnchor ? (
                                        <svg width={10} height={10} viewBox="0 0 10 10" aria-hidden>
                                            <circle cx={5} cy={5} r={3} fill="#fff" />
                                        </svg>
                                    ) : (
                                        <AnchorArrow dx={dx} dy={dy} />
                                    )}
                                </button>
                            );
                        })}
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
                    <button data-testid="canvas-size-ok" onClick={() => { onConfirm(newW, newH, anchorX, anchorY, extensionColor); onClose(); }}
                        style={{ padding: '6px 12px', background: 'hsl(var(--accent-primary))', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>OK</button>
                </div>
            </div>
        </div>
    );
}
