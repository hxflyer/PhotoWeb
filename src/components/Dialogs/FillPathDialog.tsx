import { useState } from 'react';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import { useEditorStore } from '../../store/editorStore';
import { fillActivePath } from '../../tools/pathPaint';
import type { BlendModeId } from '../../core/blendModes';

interface Props {
    open: boolean;
    onClose: () => void;
}

type FillSource = 'foreground' | 'background' | 'color';

const BLEND_MODES: { id: BlendModeId; label: string }[] = [
    { id: 'normal', label: 'Normal' }, { id: 'dissolve', label: 'Dissolve' },
    { id: 'darken', label: 'Darken' }, { id: 'multiply', label: 'Multiply' },
    { id: 'color-burn', label: 'Color Burn' }, { id: 'linear-burn', label: 'Linear Burn' },
    { id: 'lighten', label: 'Lighten' }, { id: 'screen', label: 'Screen' },
    { id: 'color-dodge', label: 'Color Dodge' }, { id: 'linear-dodge', label: 'Linear Dodge' },
    { id: 'overlay', label: 'Overlay' }, { id: 'soft-light', label: 'Soft Light' },
    { id: 'hard-light', label: 'Hard Light' },
    { id: 'difference', label: 'Difference' }, { id: 'exclusion', label: 'Exclusion' },
    { id: 'hue', label: 'Hue' }, { id: 'saturation', label: 'Saturation' },
    { id: 'luminosity', label: 'Luminosity' },
];

export function FillPathDialog({ open, onClose }: Props) {
    if (!open) return null;
    return <FillPathDialogBody onClose={onClose} />;
}

function FillPathDialogBody({ onClose }: { onClose: () => void }) {
    const dialogRef = useDialogA11y(true, onClose);
    const [source, setSource] = useState<FillSource>('foreground');
    const [customColor, setCustomColor] = useState(useEditorStore.getState().primaryColor);
    const [opacity, setOpacity] = useState(100);
    const [mode, setMode] = useState<BlendModeId>('normal');
    const [preserveTransparency, setPreserveTransparency] = useState(false);

    const resolveColor = (): string => {
        const s = useEditorStore.getState();
        if (source === 'foreground') return s.primaryColor;
        if (source === 'background') return s.secondaryColor;
        return customColor;
    };

    const handleOk = () => {
        fillActivePath({
            color: resolveColor(),
            opacity: Math.max(0, Math.min(1, opacity / 100)),
            mode,
            preserveTransparency,
        });
        onClose();
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="fill-path-title"
                tabIndex={-1}
                data-testid="fill-path-dialog"
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: 6,
                    padding: 16,
                    minWidth: 320,
                    color: 'white',
                    fontSize: 12,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
            >
                <div id="fill-path-title" style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>Fill Path</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ width: 100, fontSize: 11 }}>Use</span>
                    <select
                        value={source}
                        onChange={e => setSource(e.target.value as FillSource)}
                        data-testid="fill-path-source-select"
                        style={{ flex: 1, background: '#333', border: '1px solid #555', borderRadius: 3, color: 'white', padding: '4px 8px', fontSize: 12 }}
                    >
                        <option value="foreground">Foreground Color</option>
                        <option value="background">Background Color</option>
                        <option value="color">Color…</option>
                    </select>
                </label>
                {source === 'color' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <span style={{ width: 100, fontSize: 11 }}>Color</span>
                        <input
                            type="color"
                            value={customColor}
                            onChange={e => setCustomColor(e.target.value)}
                            data-testid="fill-path-color-input"
                            style={{ width: 40, height: 24, padding: 0, border: '1px solid #555', borderRadius: 3, background: '#333' }}
                        />
                    </label>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ width: 100, fontSize: 11 }}>Mode</span>
                    <select
                        value={mode}
                        onChange={e => setMode(e.target.value as BlendModeId)}
                        data-testid="fill-path-mode-select"
                        style={{ flex: 1, background: '#333', border: '1px solid #555', borderRadius: 3, color: 'white', padding: '4px 8px', fontSize: 12 }}
                    >
                        {BLEND_MODES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ width: 100, fontSize: 11 }}>Opacity (%)</span>
                    <input
                        type="number"
                        min={0}
                        max={100}
                        value={opacity}
                        onChange={e => setOpacity(Math.max(0, Math.min(100, Number(e.target.value))))}
                        data-testid="fill-path-opacity-input"
                        style={{ flex: 1, background: '#333', border: '1px solid #555', borderRadius: 3, color: 'white', padding: '4px 8px', fontSize: 12 }}
                    />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span style={{ width: 100, fontSize: 11 }}>Preserve Transparency</span>
                    <input
                        type="checkbox"
                        checked={preserveTransparency}
                        onChange={e => setPreserveTransparency(e.target.checked)}
                        data-testid="fill-path-preserve-transparency"
                    />
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={onClose} style={{ padding: '4px 12px', background: 'transparent', border: '1px solid #555', borderRadius: 3, color: 'white', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                    <button
                        onClick={handleOk}
                        data-testid="fill-path-ok"
                        style={{ padding: '4px 12px', background: '#0090ff', border: 'none', borderRadius: 3, color: 'white', cursor: 'pointer', fontSize: 12 }}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}
