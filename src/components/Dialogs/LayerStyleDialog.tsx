import { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import type { Layer, LayerEffect, LayerEffectKind, BlendIfChannelRange, KnockoutMode } from '../../core/Layer';
import { EffectEntry } from '../Panels/PropertiesPanel';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import { PHOTOSHOP_BLEND_MODE_OPTIONS, type BlendModeId } from '../../core/blendModes';

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
    const {
        setLayerOpacity, setLayerFill, setLayerBlendMode,
        setLayerKnockout, setLayerBlendingFlag,
        setLayerBlendIfChannel, setLayerBlendIfRanges,
    } = useEditorStore();
    const channel = layer.blendIf.channel;
    const channelRanges = layer.blendIf[channel];
    return (
        <div>
            <div style={labelStyle}>General Blending</div>
            <div style={rowStyle}>
                <span style={{ width: 100 }}>Blend Mode</span>
                <select
                    data-testid="layer-style-blend-mode"
                    value={layer.blendMode}
                    onChange={e => setLayerBlendMode(layer.id, e.target.value as BlendModeId)}
                    style={{ ...inputStyle, flex: 1 }}
                >
                    {PHOTOSHOP_BLEND_MODE_OPTIONS.map(mode => (
                        <option key={mode.id} value={mode.id}>{mode.label}</option>
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
            <div style={rowStyle}>
                <span style={{ width: 100 }}>Knockout</span>
                <select
                    data-testid="layer-style-knockout"
                    value={layer.knockout}
                    onChange={e => setLayerKnockout(layer.id, e.target.value as KnockoutMode)}
                    style={{ ...inputStyle, flex: 1 }}
                >
                    <option value="none">None</option>
                    <option value="shallow">Shallow</option>
                    <option value="deep">Deep</option>
                </select>
            </div>
            <div style={rowStyle}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                        type="checkbox"
                        data-testid="layer-style-blend-interior-as-group"
                        checked={layer.blendInteriorEffectsAsGroup}
                        onChange={e => setLayerBlendingFlag(layer.id, 'blendInteriorEffectsAsGroup', e.target.checked)}
                    />
                    Blend Interior Effects as Group
                </label>
            </div>
            <div style={rowStyle}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                        type="checkbox"
                        data-testid="layer-style-blend-clipped-as-group"
                        checked={layer.blendClippedLayersAsGroup}
                        onChange={e => setLayerBlendingFlag(layer.id, 'blendClippedLayersAsGroup', e.target.checked)}
                    />
                    Blend Clipped Layers as Group
                </label>
            </div>
            <div style={rowStyle}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                        type="checkbox"
                        data-testid="layer-style-transparency-shapes"
                        checked={layer.transparencyShapesLayer}
                        onChange={e => setLayerBlendingFlag(layer.id, 'transparencyShapesLayer', e.target.checked)}
                    />
                    Transparency Shapes Layer
                </label>
            </div>
            <div style={rowStyle}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                        type="checkbox"
                        data-testid="layer-style-layer-mask-hides"
                        checked={layer.layerMaskHidesEffects}
                        onChange={e => setLayerBlendingFlag(layer.id, 'layerMaskHidesEffects', e.target.checked)}
                    />
                    Layer Mask Hides Effects
                </label>
            </div>
            <div style={rowStyle}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                        type="checkbox"
                        data-testid="layer-style-vector-mask-hides"
                        checked={layer.vectorMaskHidesEffects}
                        onChange={e => setLayerBlendingFlag(layer.id, 'vectorMaskHidesEffects', e.target.checked)}
                    />
                    Vector Mask Hides Effects
                </label>
            </div>

            <div style={labelStyle}>Blend If</div>
            <div style={rowStyle}>
                <span style={{ width: 100 }}>Channel</span>
                <select
                    data-testid="layer-style-blend-if-channel"
                    value={channel}
                    onChange={e => setLayerBlendIfChannel(layer.id, e.target.value as 'gray' | 'r' | 'g' | 'b')}
                    style={{ ...inputStyle, flex: 1 }}
                >
                    <option value="gray">Gray</option>
                    <option value="r">Red</option>
                    <option value="g">Green</option>
                    <option value="b">Blue</option>
                </select>
            </div>
            <BlendIfSliders
                label="This Layer"
                range={channelRanges.thisLayer}
                onChange={(r) => setLayerBlendIfRanges(layer.id, channel, 'thisLayer', r)}
                testidPrefix="layer-style-blend-if-this"
            />
            <BlendIfSliders
                label="Underlying Layer"
                range={channelRanges.underlyingLayer}
                onChange={(r) => setLayerBlendIfRanges(layer.id, channel, 'underlyingLayer', r)}
                testidPrefix="layer-style-blend-if-under"
            />
        </div>
    );
}

function BlendIfSliders({ label, range, onChange, testidPrefix }: {
    label: string;
    range: BlendIfChannelRange;
    onChange: (r: BlendIfChannelRange) => void;
    testidPrefix: string;
}) {
    const update = (patch: Partial<BlendIfChannelRange>) => {
        const next = { ...range, ...patch };
        // Keep ordering valid: low <= lowMax <= highMin <= high.
        next.low = Math.max(0, Math.min(255, next.low));
        next.lowMax = Math.max(next.low, Math.min(255, next.lowMax));
        next.high = Math.max(0, Math.min(255, next.high));
        next.highMin = Math.max(next.lowMax, Math.min(next.high, next.highMin));
        onChange(next);
    };
    return (
        <div style={{ marginBottom: 8 }}>
            <div style={{ ...rowStyle, color: 'hsl(var(--text-muted))', fontSize: 10 }}>{label}</div>
            <div style={rowStyle}>
                <span style={{ width: 100 }}>low</span>
                <input
                    type="range" min={0} max={255}
                    data-testid={`${testidPrefix}-low`}
                    value={range.low}
                    onChange={e => update({ low: +e.target.value })}
                    style={{ flex: 1 }}
                />
                <span style={{ width: 40, textAlign: 'right' }}>{range.low}</span>
            </div>
            <div style={rowStyle}>
                <span style={{ width: 100 }}>low max</span>
                <input
                    type="range" min={0} max={255}
                    data-testid={`${testidPrefix}-low-max`}
                    value={range.lowMax}
                    onChange={e => update({ lowMax: +e.target.value })}
                    style={{ flex: 1 }}
                />
                <span style={{ width: 40, textAlign: 'right' }}>{range.lowMax}</span>
            </div>
            <div style={rowStyle}>
                <span style={{ width: 100 }}>high min</span>
                <input
                    type="range" min={0} max={255}
                    data-testid={`${testidPrefix}-high-min`}
                    value={range.highMin}
                    onChange={e => update({ highMin: +e.target.value })}
                    style={{ flex: 1 }}
                />
                <span style={{ width: 40, textAlign: 'right' }}>{range.highMin}</span>
            </div>
            <div style={rowStyle}>
                <span style={{ width: 100 }}>high</span>
                <input
                    type="range" min={0} max={255}
                    data-testid={`${testidPrefix}-high`}
                    value={range.high}
                    onChange={e => update({ high: +e.target.value })}
                    style={{ flex: 1 }}
                />
                <span style={{ width: 40, textAlign: 'right' }}>{range.high}</span>
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

function NewStyleDialog({
    layer,
    onClose,
}: {
    layer: Layer;
    onClose: () => void;
}) {
    const saveLayerStylePresetFromLayer = useEditorStore(s => s.saveLayerStylePresetFromLayer);
    const [name, setName] = useState(`${layer.name} Style`);
    const [includeEffects, setIncludeEffects] = useState(true);
    const [includeBlending, setIncludeBlending] = useState(false);
    const commit = () => {
        saveLayerStylePresetFromLayer(layer.id, name, includeEffects, includeBlending);
        onClose();
    };
    return (
        <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
            onClick={onClose}
        >
            <div
                data-testid="new-style-dialog"
                role="dialog"
                aria-modal="true"
                style={{ width: 320, background: 'hsl(var(--bg-panel))', border: '1px solid hsl(var(--border-light))', boxShadow: 'var(--shadow-menu)', padding: 14 }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ fontWeight: 600, marginBottom: 10 }}>New Style</div>
                <label style={{ ...rowStyle, alignItems: 'center' }}>
                    <span style={{ width: 72 }}>Name:</span>
                    <input
                        autoFocus
                        data-testid="new-style-name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commit(); }}
                        style={{ ...inputStyle, flex: 1 }}
                    />
                </label>
                <label style={rowStyle}>
                    <input
                        type="checkbox"
                        data-testid="new-style-include-effects"
                        checked={includeEffects}
                        onChange={e => setIncludeEffects(e.target.checked)}
                    />
                    Include Layer Effects
                </label>
                <label style={rowStyle}>
                    <input
                        type="checkbox"
                        data-testid="new-style-include-blending"
                        checked={includeBlending}
                        onChange={e => setIncludeBlending(e.target.checked)}
                    />
                    Include Layer Blending Options
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                    <button type="button" style={buttonStyle} onClick={onClose}>Cancel</button>
                    <button type="button" data-testid="new-style-ok" style={primaryButtonStyle} onClick={commit}>OK</button>
                </div>
            </div>
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
    const [newStyleOpen, setNewStyleOpen] = useState(false);
    const dialogRef = useDialogA11y(true, onClose);

    if (!layer) return null;

    return (
        <div style={overlay} role="dialog" aria-modal="true" data-testid="layer-style-dialog">
            <div ref={dialogRef} style={{ ...card, position: 'relative' }}>
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
                    <button type="button" style={{ ...buttonStyle, marginRight: 'auto' }} data-testid="layer-style-new-style" onClick={() => setNewStyleOpen(true)}>New Style...</button>
                    <button type="button" style={buttonStyle} data-testid="layer-style-close" onClick={onClose}>Close</button>
                </div>
                {newStyleOpen && <NewStyleDialog layer={layer} onClose={() => setNewStyleOpen(false)} />}
            </div>
        </div>
    );
}
