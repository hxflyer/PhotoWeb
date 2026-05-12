// Auto Color Correction Options sub-dialog, opened from the Auto button on
// Levels / Curves / Brightness-Contrast. Lets the user pick one of four
// enhancement modes plus Snap Neutral Midtones, shadow / highlight target
// colors, and shadow / highlight clip percentages. The chosen options
// are persisted to localStorage so the same settings re-apply across
// sessions; the parent dialog reads them on Auto-click and routes to the
// matching auto adjustment.

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import {
    loadAutoOptions,
    saveAutoOptions,
    type AutoEnhancementMode,
    type AutoOptions,
} from '../../utils/autoOptions';

export type { AutoEnhancementMode, AutoOptions };

interface AutoOptionsDialogProps {
    isOpen: boolean;
    initial?: AutoOptions;
    onConfirm: (options: AutoOptions) => void;
    onClose: () => void;
}

const inputStyle: React.CSSProperties = {
    width: 72,
    background: 'hsl(var(--bg-input))',
    border: '1px solid hsl(var(--border-light))',
    borderRadius: 2,
    color: 'hsl(var(--text-main))',
    padding: '3px 5px',
    fontSize: 11,
};

export function AutoOptionsDialog({ isOpen, initial, onConfirm, onClose }: AutoOptionsDialogProps) {
    const [options, setOptions] = useState<AutoOptions>(initial ?? loadAutoOptions());
    const dialogRef = useDialogA11y(isOpen, onClose);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (isOpen) setOptions(initial ?? loadAutoOptions());
    }, [isOpen, initial]);

    if (!isOpen) return null;

    const setMode = (mode: AutoEnhancementMode) => setOptions(o => ({ ...o, mode }));
    const setField = <K extends keyof AutoOptions>(key: K, value: AutoOptions[K]) =>
        setOptions(o => ({ ...o, [key]: value }));

    const handleConfirm = () => {
        saveAutoOptions(options);
        onConfirm(options);
        onClose();
    };

    return (
        <div
            data-testid="auto-options-dialog"
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.62)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1110,
                backdropFilter: 'blur(2px)',
            }}
            onClick={onClose}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="auto-options-title"
                tabIndex={-1}
                style={{
                    width: 540,
                    background: 'linear-gradient(#565656,#4b4b4b)',
                    border: '1px solid #202020',
                    borderRadius: 14,
                    boxShadow: '0 18px 46px rgba(0,0,0,0.52), inset 0 1px rgba(255,255,255,0.18)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{
                    padding: '10px 16px',
                    borderBottom: '1px solid #242424',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'linear-gradient(#454545,#3b3b3b)',
                }}>
                    <div style={{ width: 24 }} />
                    <h3 id="auto-options-title" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#e4e4e4', letterSpacing: 0.2 }}>
                        Auto Color Correction Options
                    </h3>
                    <button
                        aria-label="Close"
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 4 }}
                    >
                        <X size={16} />
                    </button>
                </div>

                <div style={{ padding: 16, color: '#efefef', fontSize: 13 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>Algorithms</div>
                    {(
                        [
                            { value: 'monochromatic-contrast', label: 'Enhance Monochromatic Contrast' },
                            { value: 'per-channel-contrast', label: 'Enhance Per Channel Contrast' },
                            { value: 'find-dark-light', label: 'Find Dark & Light Colors' },
                            { value: 'brightness-contrast', label: 'Enhance Brightness and Contrast' },
                        ] as { value: AutoEnhancementMode; label: string }[]
                    ).map(opt => (
                        <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <input
                                data-testid={`auto-mode-${opt.value}`}
                                type="radio"
                                name="auto-mode"
                                checked={options.mode === opt.value}
                                onChange={() => setMode(opt.value)}
                            />
                            <span>{opt.label}</span>
                        </label>
                    ))}

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                        <input
                            data-testid="auto-snap-neutral"
                            type="checkbox"
                            checked={options.snapNeutralMidtones}
                            onChange={e => setField('snapNeutralMidtones', e.target.checked)}
                        />
                        <span>Snap Neutral Midtones</span>
                    </label>

                    <div style={{ fontWeight: 600, marginTop: 14, marginBottom: 6 }}>Target Colors &amp; Clipping</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto', gap: 8, alignItems: 'center' }}>
                        <span>Shadows</span>
                        <input type="color" data-testid="auto-shadow-color" value={options.shadowsColor} onChange={e => setField('shadowsColor', e.target.value)} style={{ width: 28, height: 22, padding: 0 }} />
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 11 }}>Clip:</span>
                            <input data-testid="auto-shadow-clip" type="number" step={0.01} min={0} max={50} value={options.shadowsClipPercent} onChange={e => setField('shadowsClipPercent', Number(e.target.value))} style={inputStyle} />
                            <span style={{ fontSize: 11 }}>%</span>
                        </label>
                        <span>Midtones</span>
                        <input type="color" data-testid="auto-midtones-color" value={options.midtonesColor} onChange={e => setField('midtonesColor', e.target.value)} style={{ width: 28, height: 22, padding: 0 }} />
                        <span />
                        <span>Highlights</span>
                        <input type="color" data-testid="auto-highlight-color" value={options.highlightsColor} onChange={e => setField('highlightsColor', e.target.value)} style={{ width: 28, height: 22, padding: 0 }} />
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 11 }}>Clip:</span>
                            <input data-testid="auto-highlight-clip" type="number" step={0.01} min={0} max={50} value={options.highlightsClipPercent} onChange={e => setField('highlightsClipPercent', Number(e.target.value))} style={inputStyle} />
                            <span style={{ fontSize: 11 }}>%</span>
                        </label>
                    </div>
                </div>

                <div style={{
                    padding: '10px 16px',
                    borderTop: '1px solid #3d3d3d',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 8,
                }}>
                    <button
                        onClick={onClose}
                        style={{ padding: '6px 14px', background: 'transparent', border: '2px solid #777', color: '#f0f0f0', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
                    >
                        Cancel
                    </button>
                    <button
                        data-testid="auto-options-confirm"
                        onClick={handleConfirm}
                        style={{ padding: '6px 14px', background: 'transparent', border: '2px solid #eeeeee', color: '#f7f7f7', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}

