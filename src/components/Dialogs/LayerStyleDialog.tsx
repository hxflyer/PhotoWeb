import { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import type { Layer, LayerEffect, LayerEffectKind } from '../../core/Layer';
import { EffectEntry } from '../Panels/PropertiesPanel';
import { useDialogA11y } from '../../hooks/useDialogA11y';

const TABS: { id: string; kind: LayerEffectKind | 'blending'; label: string }[] = [
    { id: 'blending', kind: 'blending', label: 'Blending Options' },
    { id: 'bevel-emboss', kind: 'bevel-emboss', label: 'Bevel & Emboss' },
    { id: 'stroke', kind: 'stroke', label: 'Stroke' },
    { id: 'inner-shadow', kind: 'inner-shadow', label: 'Inner Shadow' },
    { id: 'inner-glow', kind: 'inner-glow', label: 'Inner Glow' },
    { id: 'satin', kind: 'satin', label: 'Satin' },
    { id: 'color-overlay', kind: 'color-overlay', label: 'Color Overlay' },
    { id: 'gradient-overlay', kind: 'gradient-overlay', label: 'Gradient Overlay' },
    { id: 'pattern-overlay', kind: 'pattern-overlay', label: 'Pattern Overlay' },
    { id: 'outer-glow', kind: 'outer-glow', label: 'Outer Glow' },
    { id: 'drop-shadow', kind: 'drop-shadow', label: 'Drop Shadow' },
];

const overlay: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1200,
};

const card: React.CSSProperties = {
    background: 'hsl(var(--bg-panel))',
    border: '1px solid hsl(var(--border-light))',
    borderRadius: 4,
    color: 'hsl(var(--text-main))',
    fontSize: 12,
    boxShadow: 'var(--shadow-menu)',
    width: 720,
    maxWidth: '92vw',
    height: 520,
    maxHeight: '92vh',
    display: 'flex',
    flexDirection: 'column',
};

const tabBarStyle: React.CSSProperties = {
    width: 200,
    borderRight: '1px solid hsl(var(--border-light))',
    overflowY: 'auto',
    flexShrink: 0,
    background: 'hsl(var(--bg-header))',
};

const tabStyle = (active: boolean, present: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    textAlign: 'left',
    padding: '5px 10px',
    background: active ? 'hsl(var(--accent-primary))' : 'transparent',
    color: active ? '#fff' : present ? 'hsl(var(--text-main))' : 'hsl(var(--text-muted))',
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
});

const bodyStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 14px',
};

const labelStyle: React.CSSProperties = {
    fontSize: 10,
    color: 'hsl(var(--text-muted))',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 6,
};

const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
    background: 'hsl(var(--bg-input))',
    border: '1px solid hsl(var(--border-light))',
    color: 'hsl(var(--text-main))',
    padding: '2px 6px',
    borderRadius: 2,
    fontSize: 12,
};

const footerStyle: React.CSSProperties = {
    padding: '8px 14px',
    borderTop: '1px solid hsl(var(--border-light))',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
};

const buttonStyle: React.CSSProperties = {
    ...inputStyle,
    padding: '4px 14px',
    cursor: 'pointer',
};

const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: 'hsl(var(--accent-primary))',
    color: '#fff',
    border: '1px solid hsl(var(--accent-primary))',
};

interface Props {
    isOpen: boolean;
    layerId: string | null;
    initialTab?: string;
    onClose: () => void;
}

function findEffectByKind(layer: Layer | undefined, kind: LayerEffectKind): { effect: LayerEffect; idx: number } | null {
    if (!layer?.effects) return null;
    const idx = layer.effects.findIndex(e => e.kind === kind);
    if (idx === -1) return null;
    return { effect: layer.effects[idx], idx };
}

function BlendingOptionsTab({ layer }: { layer: Layer }) {
    const { setLayerOpacity, setLayerFill, setLayerBlendMode } = useEditorStore();
    return (
        <div>
            <div style={labelStyle}>General Blending</div>
            <div style={rowStyle}>
                <span style={{ width: 100 }}>Blend Mode</span>
                <select
                    data-testid="layer-style-blend-mode"
                    value={layer.blendMode}
                    onChange={e => setLayerBlendMode(layer.id, e.target.value as GlobalCompositeOperation)}
                    style={{ ...inputStyle, flex: 1 }}
                >
                    {['source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'].map(mode => (
                        <option key={mode} value={mode}>{mode}</option>
                    ))}
                </select>
            </div>
            <div style={rowStyle}>
                <span style={{ width: 100 }}>Opacity</span>
                <input
                    type="range" min={0} max={100}
                    value={Math.round(layer.opacity * 100)}
                    onChange={e => setLayerOpacity(layer.id, +e.target.value / 100)}
                    style={{ flex: 1 }}
                />
                <span style={{ width: 40, textAlign: 'right' }}>{Math.round(layer.opacity * 100)}%</span>
            </div>
            <div style={labelStyle}>Advanced Blending</div>
            <div style={rowStyle}>
                <span style={{ width: 100 }}>Fill Opacity</span>
                <input
                    type="range" min={0} max={100}
                    data-testid="layer-style-fill-opacity"
                    value={Math.round(layer.fill * 100)}
                    onChange={e => setLayerFill(layer.id, +e.target.value / 100)}
                    style={{ flex: 1 }}
                />
                <span style={{ width: 40, textAlign: 'right' }}>{Math.round(layer.fill * 100)}%</span>
            </div>
            <div style={{ ...rowStyle, color: 'hsl(var(--text-muted))', fontStyle: 'italic', marginTop: 10 }}>
                <span>Knockout, Blend If, and channel filter sliders are pending under BATCH-F-05.</span>
            </div>
        </div>
    );
}

function EffectTab({ layer, kind, label }: { layer: Layer; kind: LayerEffectKind; label: string }) {
    const { addLayerEffect } = useEditorStore();
    const present = findEffectByKind(layer, kind);
    if (!present) {
        return (
            <div>
                <div style={labelStyle}>{label}</div>
                <div style={{ ...rowStyle, color: 'hsl(var(--text-muted))', marginBottom: 12 }}>
                    This effect is not yet added to this layer.
                </div>
                <button
                    data-testid={`layer-style-add-${kind}`}
                    style={primaryButtonStyle}
                    onClick={() => addLayerEffect(layer.id, kind)}
                >Add {label}</button>
            </div>
        );
    }
    return (
        <div>
            <div style={labelStyle}>{label}</div>
            <EffectEntry layer={layer} effect={present.effect} idx={present.idx} />
        </div>
    );
}

export function LayerStyleDialog({ isOpen, layerId, initialTab, onClose }: Props) {
    if (!isOpen) return null;
    return (
        <LayerStyleDialogContent
            // key remounts the inner content (and resets `activeTab`) on each open.
            key={`${layerId}:${initialTab ?? 'blending'}`}
            layerId={layerId}
            initialTab={initialTab}
            onClose={onClose}
        />
    );
}

function LayerStyleDialogContent({ layerId, initialTab, onClose }: Omit<Props, 'isOpen'>) {
    const layer = useEditorStore(s => s.layers.find(l => l.id === layerId) ?? null);
    const [activeTab, setActiveTab] = useState<string>(initialTab ?? 'blending');
    const dialogRef = useDialogA11y(true, onClose);

    if (!layer) return null;

    return (
        <div style={overlay} role="dialog" aria-modal="true" data-testid="layer-style-dialog">
            <div ref={dialogRef} style={card}>
                <div style={{ padding: '8px 14px', borderBottom: '1px solid hsl(var(--border-light))', fontWeight: 600 }}>
                    Layer Style — {layer.name}
                </div>
                <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                    <div style={tabBarStyle}>
                        {TABS.map(tab => {
                            const present = tab.kind === 'blending'
                                ? true
                                : !!findEffectByKind(layer, tab.kind);
                            return (
                                <button
                                    type="button"
                                    key={tab.id}
                                    data-testid={`layer-style-tab-${tab.id}`}
                                    data-active={activeTab === tab.id ? 'true' : 'false'}
                                    onClick={() => setActiveTab(tab.id)}
                                    style={tabStyle(activeTab === tab.id, present)}
                                >
                                    <span style={{
                                        display: 'inline-block',
                                        width: 8, height: 8,
                                        borderRadius: '50%',
                                        background: present ? 'hsl(var(--accent-primary))' : 'transparent',
                                        border: '1px solid hsl(var(--border-light))',
                                    }} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                    <div style={bodyStyle} data-testid="layer-style-body">
                        {activeTab === 'blending'
                            ? <BlendingOptionsTab layer={layer} />
                            : (() => {
                                const tab = TABS.find(t => t.id === activeTab);
                                if (!tab || tab.kind === 'blending') return null;
                                return <EffectTab layer={layer} kind={tab.kind as LayerEffectKind} label={tab.label} />;
                            })()
                        }
                    </div>
                </div>
                <div style={footerStyle}>
                    <button type="button" style={buttonStyle} data-testid="layer-style-close" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}
