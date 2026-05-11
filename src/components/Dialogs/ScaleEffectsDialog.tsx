import { useState } from 'react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (scalePercent: number) => void;
}

export function ScaleEffectsDialog({ isOpen, onClose, onConfirm }: Props) {
    const [scale, setScale] = useState(100);

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div
                data-testid="scale-effects-dialog"
                style={{
                    background: '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: '6px',
                    padding: '16px',
                    minWidth: '320px',
                    color: 'white',
                    fontSize: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
            >
                <div style={{ fontWeight: 600, marginBottom: '12px', fontSize: '13px' }}>Scale Layer Effects</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ width: '80px', fontSize: '11px' }}>Scale</span>
                    <input
                        type="range"
                        min={10}
                        max={1000}
                        value={scale}
                        onChange={e => setScale(Number(e.target.value))}
                        style={{ flex: 1 }}
                        data-testid="scale-effects-slider"
                    />
                    <input
                        type="number"
                        min={10}
                        max={1000}
                        value={scale}
                        onChange={e => setScale(Math.max(10, Math.min(1000, Number(e.target.value) || 100)))}
                        style={{ width: '64px', background: '#1c1c1c', border: '1px solid #444', color: 'white', padding: '2px 4px', fontSize: '11px' }}
                        data-testid="scale-effects-input"
                    />
                    <span>%</span>
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={onClose} style={{ padding: '4px 12px', background: 'transparent', border: '1px solid #555', borderRadius: '3px', color: 'white', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                    <button
                        onClick={() => { onConfirm(scale); onClose(); }}
                        style={{ padding: '4px 12px', background: '#0090ff', border: 'none', borderRadius: '3px', color: 'white', cursor: 'pointer', fontSize: '12px' }}
                        data-testid="scale-effects-ok"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}
