import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import type { BlendModeId } from '../../core/blendModes';
import type { LastEffectSnapshot } from '../../store/types';
import { fadeImageData, BLEND_MODE_OPTIONS } from '../../utils/fadeBlend';

interface FadeDialogProps {
    isOpen: boolean;
    snapshot: LastEffectSnapshot | null;
    onConfirm: (opacity: number, blendMode: BlendModeId, result: ImageData) => void;
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

export function FadeDialog({ isOpen, snapshot, onConfirm, onClose }: FadeDialogProps) {
    const [opacity, setOpacity] = useState(100);
    const [blendMode, setBlendMode] = useState<BlendModeId>('normal');
    const [previewEnabled, setPreviewEnabled] = useState(true);
    const previewRef = useRef<HTMLCanvasElement>(null);
    const dialogRef = useDialogA11y(isOpen, onClose);

    useEffect(() => {
        if (isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setOpacity(100);
            setBlendMode('normal');
            setPreviewEnabled(true);
        }
    }, [isOpen]);

    const renderPreview = useCallback(() => {
        if (!snapshot || !previewRef.current) return;
        const canvas = previewRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const out = previewEnabled
            ? fadeImageData(snapshot.before, snapshot.after, opacity / 100, blendMode)
            : snapshot.before;
        canvas.width = out.width;
        canvas.height = out.height;
        ctx.putImageData(out, 0, 0);
    }, [snapshot, opacity, blendMode, previewEnabled]);

    useEffect(() => {
        if (isOpen) renderPreview();
    }, [isOpen, renderPreview]);

    if (!isOpen || !snapshot) return null;

    const handleConfirm = () => {
        const result = fadeImageData(snapshot.before, snapshot.after, opacity / 100, blendMode);
        onConfirm(opacity, blendMode, result);
        onClose();
    };

    return (
        <div
            data-testid="fade-dialog"
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.62)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1100,
                backdropFilter: 'blur(2px)',
            }}
            onClick={onClose}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="fade-dialog-title"
                tabIndex={-1}
                style={{
                    width: 460,
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
                    <h3 id="fade-dialog-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#e4e4e4', letterSpacing: 0.2 }}>
                        Fade {snapshot.label}
                    </h3>
                    <button
                        aria-label="Close"
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 4 }}
                    >
                        <X size={16} />
                    </button>
                </div>

                <div style={{ display: 'flex', padding: 18, gap: 16, color: '#efefef', fontSize: 14 }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <label style={{ display: 'grid', gridTemplateColumns: '96px 1fr 72px', gap: 8, alignItems: 'center' }}>
                            <span>Opacity</span>
                            <input
                                data-testid="fade-opacity-slider"
                                type="range"
                                min={0}
                                max={100}
                                step={1}
                                value={opacity}
                                onChange={e => setOpacity(Number(e.target.value))}
                                style={{ accentColor: 'hsl(var(--accent-primary))' }}
                            />
                            <input
                                data-testid="fade-opacity-input"
                                type="number"
                                min={0}
                                max={100}
                                value={opacity}
                                onChange={e => setOpacity(Number(e.target.value))}
                                style={inputStyle}
                            />
                        </label>
                        <label style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: 8, alignItems: 'center' }}>
                            <span>Mode</span>
                            <select
                                data-testid="fade-mode-select"
                                value={blendMode}
                                onChange={e => setBlendMode(e.target.value as BlendModeId)}
                                style={{ ...inputStyle, width: '100%' }}
                            >
                                {BLEND_MODE_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input
                                data-testid="fade-preview-checkbox"
                                type="checkbox"
                                checked={previewEnabled}
                                onChange={e => setPreviewEnabled(e.target.checked)}
                            />
                            <span>Preview</span>
                        </label>
                    </div>
                    <div style={{ flex: '0 0 130px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <button
                            data-testid="fade-confirm"
                            onClick={handleConfirm}
                            style={{ padding: '8px 16px', background: 'transparent', border: '2px solid #eeeeee', color: '#f7f7f7', borderRadius: 20, cursor: 'pointer', fontSize: 15, fontWeight: 700 }}
                        >
                            OK
                        </button>
                        <button
                            onClick={onClose}
                            style={{ padding: '8px 16px', background: 'transparent', border: '2px solid #777', color: '#f0f0f0', borderRadius: 20, cursor: 'pointer', fontSize: 15, fontWeight: 700 }}
                        >
                            Cancel
                        </button>
                        <div style={{ height: 70, background: '#171717', border: '1px solid #6a6a6a', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <canvas
                                ref={previewRef}
                                data-testid="fade-preview-canvas"
                                style={{ maxWidth: '100%', maxHeight: '100%', imageRendering: 'auto' }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
