import { useState } from 'react';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import type { JpegBaseline } from '../../utils/exportImage';

interface Props {
    isOpen: boolean;
    onCancel: () => void;
    onConfirm: (quality: number, baseline: JpegBaseline) => void;
}

// Photoshop's JPEG Options: Quality (1-12 slider + number readout) + Format
// Options radios (Baseline ("Standard") / Baseline Optimized / Progressive).
// We omit the Preview checkbox and file-size readout (see divergence-log).
export function JPEGOptionsDialog({ isOpen, onCancel, onConfirm }: Props) {
    const [quality, setQuality] = useState(12);
    const [baseline, setBaseline] = useState<JpegBaseline>('optimized');
    const dialogRef = useDialogA11y(isOpen, onCancel);

    if (!isOpen) return null;

    function handleKey(e: React.KeyboardEvent<HTMLDivElement>) {
        if (e.key === 'Enter') {
            e.preventDefault();
            onConfirm(quality, baseline);
        }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="jpeg-options-title"
                tabIndex={-1}
                data-testid="jpeg-options-dialog"
                onKeyDown={handleKey}
                style={{
                    background: '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: '6px',
                    padding: '16px',
                    color: 'white',
                    fontSize: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    minWidth: '320px',
                }}
            >
                <div id="jpeg-options-title" style={{ fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>JPEG Options</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                    <div>
                        <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#bbb', marginBottom: '6px' }}>Image Options</div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '60px' }}>Quality</span>
                            <input
                                data-testid="jpeg-quality-readout"
                                type="number"
                                min={1}
                                max={12}
                                value={quality}
                                onChange={e => {
                                    const v = Math.max(1, Math.min(12, Math.round(Number(e.target.value) || 0)));
                                    setQuality(v);
                                }}
                                style={{ width: '44px', background: '#333', border: '1px solid #555', borderRadius: '3px', color: 'white', padding: '3px 6px', fontSize: '12px' }}
                            />
                            <input
                                data-testid="jpeg-quality-slider"
                                type="range"
                                min={1}
                                max={12}
                                value={quality}
                                onChange={e => setQuality(Number(e.target.value))}
                                style={{ flex: 1 }}
                            />
                        </label>
                    </div>

                    <div>
                        <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#bbb', marginBottom: '6px' }}>Format Options</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    data-testid="jpeg-baseline-standard"
                                    type="radio"
                                    name="jpeg-baseline"
                                    checked={baseline === 'standard'}
                                    onChange={() => setBaseline('standard')}
                                />
                                Baseline (&quot;Standard&quot;)
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    data-testid="jpeg-baseline-optimized"
                                    type="radio"
                                    name="jpeg-baseline"
                                    checked={baseline === 'optimized'}
                                    onChange={() => setBaseline('optimized')}
                                />
                                Baseline Optimized
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    data-testid="jpeg-baseline-progressive"
                                    type="radio"
                                    name="jpeg-baseline"
                                    checked={baseline === 'progressive'}
                                    onChange={() => setBaseline('progressive')}
                                />
                                Progressive
                            </label>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                        data-testid="jpeg-options-cancel"
                        onClick={onCancel}
                        style={{ padding: '5px 14px', background: 'transparent', border: '1px solid #555', borderRadius: '3px', color: 'white', cursor: 'pointer', fontSize: '12px' }}
                    >
                        Cancel
                    </button>
                    <button
                        data-testid="jpeg-options-ok"
                        onClick={() => onConfirm(quality, baseline)}
                        autoFocus
                        style={{ padding: '5px 14px', background: '#0090ff', border: 'none', borderRadius: '3px', color: 'white', cursor: 'pointer', fontSize: '12px' }}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}
