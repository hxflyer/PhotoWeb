import { useState } from 'react';
import { X } from 'lucide-react';
import { useDialogA11y } from '../../hooks/useDialogA11y';

interface NewLayerDialogProps {
    isOpen: boolean;
    onConfirm: (options: {
        name: string;
        opacity: number;
        fill: number;
        blendMode: GlobalCompositeOperation;
    }) => void;
    onClose: () => void;
}

const BLEND_MODES: { value: GlobalCompositeOperation; label: string }[] = [
    { value: 'source-over', label: 'Normal' },
    { value: 'multiply', label: 'Multiply' },
    { value: 'screen', label: 'Screen' },
    { value: 'overlay', label: 'Overlay' },
    { value: 'darken', label: 'Darken' },
    { value: 'lighten', label: 'Lighten' },
    { value: 'color-dodge', label: 'Color Dodge' },
    { value: 'color-burn', label: 'Color Burn' },
    { value: 'hard-light', label: 'Hard Light' },
    { value: 'soft-light', label: 'Soft Light' },
    { value: 'difference', label: 'Difference' },
    { value: 'exclusion', label: 'Exclusion' },
    { value: 'hue', label: 'Hue' },
    { value: 'saturation', label: 'Saturation' },
    { value: 'color', label: 'Color' },
    { value: 'luminosity', label: 'Luminosity' },
];

function clampPercent(text: string): number {
    const value = Number.parseFloat(text);
    if (!Number.isFinite(value)) return 100;
    return Math.max(0, Math.min(100, value));
}

function NewLayerDialogBody({ onConfirm, onClose }: Omit<NewLayerDialogProps, 'isOpen'>) {
    const [name, setName] = useState('Layer');
    const [blendMode, setBlendMode] = useState<GlobalCompositeOperation>('source-over');
    const [opacityText, setOpacityText] = useState('100');
    const [fillText, setFillText] = useState('100');
    const dialogRef = useDialogA11y(true, onClose);

    const submit = () => {
        onConfirm({
            name: name.trim() || 'Layer',
            blendMode,
            opacity: clampPercent(opacityText) / 100,
            fill: clampPercent(fillText) / 100,
        });
        onClose();
    };

    return (
        <div
            data-testid="new-layer-dialog"
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}
            onClick={onClose}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="new-layer-title"
                tabIndex={-1}
                style={{ width: 360, background: 'hsl(var(--bg-panel))', border: '1px solid hsl(var(--border-light))', borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ padding: '12px 16px', borderBottom: '1px solid hsl(var(--border-light))', background: 'hsl(var(--bg-header))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 id="new-layer-title" style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'hsl(var(--text-main))' }}>New Layer</h3>
                    <button aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer' }}><X size={16} /></button>
                </div>
                <div style={{ padding: 16, display: 'grid', gap: 12, color: 'hsl(var(--text-main))', fontSize: 12 }}>
                    <label style={{ display: 'grid', gridTemplateColumns: '72px 1fr', alignItems: 'center', gap: 8 }}>
                        <span>Name:</span>
                        <input
                            autoFocus
                            data-testid="new-layer-name"
                            className="opts-input"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
                        />
                    </label>
                    <label style={{ display: 'grid', gridTemplateColumns: '72px 1fr', alignItems: 'center', gap: 8 }}>
                        <span>Mode:</span>
                        <select
                            data-testid="new-layer-mode"
                            value={blendMode}
                            onChange={e => setBlendMode(e.target.value as GlobalCompositeOperation)}
                            style={{ background: 'hsl(var(--bg-input))', color: 'hsl(var(--text-main))', border: '1px solid hsl(var(--border-light))', borderRadius: 2, padding: '4px 6px', fontSize: 12 }}
                        >
                            {BLEND_MODES.map(mode => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
                        </select>
                    </label>
                    <label style={{ display: 'grid', gridTemplateColumns: '72px 72px auto', alignItems: 'center', gap: 8 }}>
                        <span>Opacity:</span>
                        <input
                            data-testid="new-layer-opacity"
                            className="opts-input"
                            type="number"
                            min={0}
                            max={100}
                            value={opacityText}
                            onChange={e => setOpacityText(e.target.value)}
                            onBlur={() => setOpacityText(String(clampPercent(opacityText)))}
                            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
                        />
                        <span>%</span>
                    </label>
                    <label style={{ display: 'grid', gridTemplateColumns: '72px 72px auto', alignItems: 'center', gap: 8 }}>
                        <span>Fill:</span>
                        <input
                            data-testid="new-layer-fill"
                            className="opts-input"
                            type="number"
                            min={0}
                            max={100}
                            value={fillText}
                            onChange={e => setFillText(e.target.value)}
                            onBlur={() => setFillText(String(clampPercent(fillText)))}
                            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
                        />
                        <span>%</span>
                    </label>
                </div>
                <div style={{ padding: '12px 16px', borderTop: '1px solid hsl(var(--border-light))', background: 'hsl(var(--bg-header))', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={onClose} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid hsl(var(--border-light))', color: 'hsl(var(--text-main))', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                    <button data-testid="new-layer-ok" onClick={submit} style={{ padding: '6px 12px', background: 'hsl(var(--accent-primary))', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>OK</button>
                </div>
            </div>
        </div>
    );
}

export function NewLayerDialog({ isOpen, onConfirm, onClose }: NewLayerDialogProps) {
    if (!isOpen) return null;
    return <NewLayerDialogBody onConfirm={onConfirm} onClose={onClose} />;
}
