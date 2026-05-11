import { useEditorStore } from '../../store/editorStore';
import type { Layer, LayerEffect, LayerEffectKind } from '../../core/Layer';
import type { FillLayerData } from '../../core/fillLayer';
import { getAdjustment } from '../../adjustments';
import { getEffect } from '../../effects';
import { rerenderTypeLayer, type TypeLayerData } from '../../tools/type';

interface LayerWithMeta extends Layer {
    adjustment?: { id: string; params: Record<string, unknown> };
    fillData?: FillLayerData;
}

const sectionStyle: React.CSSProperties = {
    padding: '8px 10px',
    borderBottom: '1px solid hsl(var(--border-light))',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
};

const labelStyle: React.CSSProperties = {
    fontSize: 10,
    color: 'hsl(var(--text-muted))',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
};

const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: 'hsl(var(--text-main))',
};

const inputStyle: React.CSSProperties = {
    background: 'hsl(var(--bg-input))',
    border: '1px solid hsl(var(--border-light))',
    color: 'hsl(var(--text-main))',
    padding: '2px 6px',
    borderRadius: 2,
    fontSize: 11,
};

function LayerSection({ layer }: { layer: Layer }) {
    const { setLayerName, setLayerOpacity, setLayerFill } = useEditorStore();
    return (
        <div style={sectionStyle}>
            <div style={labelStyle}>Layer</div>
            <div style={rowStyle}>
                <span style={{ width: 60 }}>Name</span>
                <input type="text" value={layer.name}
                    onChange={e => setLayerName(layer.id, e.target.value)}
                    style={{ ...inputStyle, flex: 1 }} />
            </div>
            <div style={rowStyle}>
                <span style={{ width: 60 }}>Kind</span>
                <span style={{ flex: 1 }}>{layer.kind}</span>
            </div>
            <div style={rowStyle}>
                <span style={{ width: 60 }}>Size</span>
                <span>{layer.canvas.width} × {layer.canvas.height} px</span>
            </div>
            <div style={rowStyle}>
                <span style={{ width: 60 }}>Opacity</span>
                <input type="range" min={0} max={100} value={Math.round(layer.opacity * 100)}
                    onChange={e => setLayerOpacity(layer.id, +e.target.value / 100)}
                    style={{ flex: 1 }} />
                <span style={{ width: 36, textAlign: 'right' }}>{Math.round(layer.opacity * 100)}%</span>
            </div>
            <div style={rowStyle}>
                <span style={{ width: 60 }}>Fill</span>
                <input type="range" min={0} max={100} value={Math.round(layer.fill * 100)}
                    onChange={e => setLayerFill(layer.id, +e.target.value / 100)}
                    style={{ flex: 1 }} />
                <span style={{ width: 36, textAlign: 'right' }}>{Math.round(layer.fill * 100)}%</span>
            </div>
        </div>
    );
}

function MaskSection({ layer }: { layer: Layer }) {
    const { setLayerMaskEnabled, setLayerMaskLinked, setLayerMaskDensity, setLayerMaskFeather } = useEditorStore();
    if (!layer.mask) return null;
    const density = layer.mask.density ?? 1;
    const feather = layer.mask.feather ?? 0;
    return (
        <div style={sectionStyle}>
            <div style={labelStyle}>Mask</div>
            <div style={rowStyle}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="checkbox" checked={layer.mask.enabled}
                        onChange={e => setLayerMaskEnabled(layer.id, e.target.checked)} />
                    Enabled
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="checkbox" checked={layer.mask.linked}
                        onChange={e => setLayerMaskLinked(layer.id, e.target.checked)} />
                    Linked
                </label>
            </div>
            <div style={rowStyle}>
                <span style={{ width: 60 }}>Density</span>
                <input type="range" min={0} max={100} value={Math.round(density * 100)}
                    onChange={e => setLayerMaskDensity(layer.id, +e.target.value / 100)}
                    style={{ flex: 1 }} />
                <span style={{ width: 36, textAlign: 'right' }}>{Math.round(density * 100)}%</span>
            </div>
            <div style={rowStyle}>
                <span style={{ width: 60 }}>Feather</span>
                <input type="range" min={0} max={250} value={feather}
                    onChange={e => setLayerMaskFeather(layer.id, +e.target.value)}
                    style={{ flex: 1 }} />
                <span style={{ width: 36, textAlign: 'right' }}>{feather}px</span>
            </div>
        </div>
    );
}

function AdjustmentSection({ layer }: { layer: LayerWithMeta }) {
    const { setLayerAdjustmentParams } = useEditorStore();
    if (!layer.adjustment) return null;
    const adj = getAdjustment(layer.adjustment.id);
    if (!adj) return null;
    const params = layer.adjustment.params;

    function setParam(name: string, value: number | boolean | string) {
        setLayerAdjustmentParams(layer.id, { [name]: value });
    }

    // Render param controls based on the adjustment's parameter shape (peeked
    // from defaultParams keys). Each adjustment exposes a flat record; we render
    // sliders for numeric values and checkboxes for booleans.
    return (
        <div style={sectionStyle}>
            <div style={labelStyle}>Adjustment: {adj.label}</div>
            {Object.entries(adj.defaultParams).map(([key, defaultValue]) => {
                const current = params[key] ?? defaultValue;
                if (typeof current === 'number' && typeof defaultValue === 'number') {
                    const min = key.endsWith('Shift') || key === 'shadow' || key === 'highlight' ? -100 : 0;
                    const max = key === 'gamma' ? 9.99 : key === 'levels' || key === 'posterize' ? 255 : 100;
                    const step = key === 'gamma' ? 0.01 : 1;
                    return (
                        <div key={key} style={rowStyle}>
                            <span style={{ width: 80 }}>{key}</span>
                            <input type="range" min={min} max={max} step={step} value={current as number}
                                onChange={e => setParam(key, +e.target.value)}
                                style={{ flex: 1 }} />
                            <span style={{ width: 40, textAlign: 'right' }}>{(current as number).toFixed(step < 1 ? 2 : 0)}</span>
                        </div>
                    );
                }
                if (typeof current === 'boolean') {
                    return (
                        <div key={key} style={rowStyle}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <input type="checkbox" checked={current}
                                    onChange={e => setParam(key, e.target.checked)} />
                                {key}
                            </label>
                        </div>
                    );
                }
                if (typeof current === 'string') {
                    return (
                        <div key={key} style={rowStyle}>
                            <span style={{ width: 80 }}>{key}</span>
                            <input type="text" value={current as string}
                                onChange={e => setParam(key, e.target.value)}
                                style={{ ...inputStyle, flex: 1 }} />
                        </div>
                    );
                }
                return null;
            })}
        </div>
    );
}

function FillSection({ layer }: { layer: LayerWithMeta }) {
    const { setLayerFillData } = useEditorStore();
    if (!layer.fillData) return null;
    const data = layer.fillData;
    if (data.kind === 'solid-color') {
        return (
            <div style={sectionStyle}>
                <div style={labelStyle}>Fill (Solid)</div>
                <div style={rowStyle}>
                    <span style={{ width: 60 }}>Color</span>
                    <input type="color" value={data.color}
                        onChange={e => setLayerFillData(layer.id, { ...data, color: e.target.value })}
                        style={{ width: 32, height: 22, border: '1px solid hsl(var(--border-light))', background: 'transparent' }} />
                    <span style={{ flex: 1, fontFamily: 'monospace' }}>{data.color}</span>
                </div>
            </div>
        );
    }
    return (
        <div style={sectionStyle}>
            <div style={labelStyle}>Fill (Gradient)</div>
            <div style={rowStyle}>
                <span style={{ width: 60 }}>Type</span>
                <select value={data.type}
                    onChange={e => setLayerFillData(layer.id, { ...data, type: e.target.value as 'linear' | 'radial' | 'angle' | 'reflected' | 'diamond' })}
                    style={{ ...inputStyle, flex: 1 }}>
                    <option value="linear">Linear</option>
                    <option value="radial">Radial</option>
                    <option value="angle">Angle</option>
                    <option value="reflected">Reflected</option>
                    <option value="diamond">Diamond</option>
                </select>
            </div>
            <div style={rowStyle}>
                <span style={{ width: 60 }}>Angle</span>
                <input type="range" min={0} max={360} value={data.angle}
                    onChange={e => setLayerFillData(layer.id, { ...data, angle: +e.target.value })}
                    style={{ flex: 1 }} />
                <span style={{ width: 40, textAlign: 'right' }}>{data.angle}°</span>
            </div>
        </div>
    );
}

function cloneTypeData(data: TypeLayerData): TypeLayerData {
    if (typeof structuredClone === 'function') return structuredClone(data) as TypeLayerData;
    return JSON.parse(JSON.stringify(data)) as TypeLayerData;
}

function TypeSection({ layer }: { layer: Layer }) {
    const data = layer.typeData as TypeLayerData | null;
    if (!data) return null;
    const typeData = data;

    function update(next: TypeLayerData) {
        layer.typeData = next;
        rerenderTypeLayer(layer);
        useEditorStore.setState(state => ({ layers: [...state.layers] }));
    }

    function patchData(patch: Partial<TypeLayerData>) {
        update({ ...cloneTypeData(typeData), ...patch });
    }

    function patchStyle(patch: Partial<TypeLayerData['style']>) {
        const next = cloneTypeData(typeData);
        next.style = { ...next.style, ...patch };
        update(next);
    }

    return (
        <div style={sectionStyle}>
            <div style={labelStyle}>Type</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, color: 'hsl(var(--text-muted))' }}>Text</span>
                <textarea
                    data-testid="properties-type-text"
                    value={data.text}
                    onChange={e => patchData({ text: e.target.value })}
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical' }}
                />
            </div>
            <div style={rowStyle}>
                <span style={{ width: 70 }}>Font</span>
                <input
                    data-testid="properties-type-font"
                    type="text"
                    value={data.style.fontFamily}
                    onChange={e => patchStyle({ fontFamily: e.target.value })}
                    style={{ ...inputStyle, flex: 1 }}
                />
            </div>
            <div style={rowStyle}>
                <span style={{ width: 70 }}>Size</span>
                <input
                    data-testid="properties-type-size"
                    type="number"
                    min={1}
                    max={500}
                    value={data.style.fontSize}
                    onChange={e => patchStyle({ fontSize: Math.max(1, Number(e.target.value) || 1) })}
                    style={{ ...inputStyle, width: 72 }}
                />
                <span>pt</span>
            </div>
            <div style={rowStyle}>
                <span style={{ width: 70 }}>Color</span>
                <input
                    data-testid="properties-type-color"
                    type="color"
                    value={data.style.color}
                    onChange={e => patchStyle({ color: e.target.value })}
                    style={{ width: 32, height: 22, border: '1px solid hsl(var(--border-light))', background: 'transparent' }}
                />
                <span style={{ flex: 1, fontFamily: 'monospace' }}>{data.style.color}</span>
            </div>
            <div style={rowStyle}>
                <span style={{ width: 70 }}>Align</span>
                <select
                    data-testid="properties-type-align"
                    value={data.style.textAlign}
                    onChange={e => patchStyle({ textAlign: e.target.value as TypeLayerData['style']['textAlign'] })}
                    style={{ ...inputStyle, flex: 1 }}
                >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                    <option value="justify">Justify</option>
                </select>
            </div>
            <div style={rowStyle}>
                <span style={{ width: 70 }}>Orientation</span>
                <select
                    data-testid="properties-type-orientation"
                    value={data.orientation}
                    onChange={e => patchData({ orientation: e.target.value as TypeLayerData['orientation'] })}
                    style={{ ...inputStyle, flex: 1 }}
                >
                    <option value="horizontal">Horizontal</option>
                    <option value="vertical">Vertical</option>
                </select>
            </div>
        </div>
    );
}

function EffectsSection({ layer }: { layer: Layer }) {
    const { addLayerEffect, removeLayerEffect, setLayerEffectEnabled, setLayerEffectParams } = useEditorStore();
    const effects = layer.effects ?? [];
    const KINDS: { id: LayerEffectKind; label: string }[] = [
        { id: 'drop-shadow', label: 'Drop Shadow' },
        { id: 'stroke', label: 'Stroke' },
        { id: 'color-overlay', label: 'Color Overlay' },
    ];

    return (
        <div style={sectionStyle}>
            <div style={{ ...labelStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Effects</span>
                <select
                    value=""
                    onChange={e => {
                        if (!e.target.value) return;
                        addLayerEffect(layer.id, e.target.value as LayerEffectKind);
                        e.target.value = '';
                    }}
                    style={{ ...inputStyle, fontSize: 10, padding: '1px 4px' }}
                >
                    <option value="">+ Add…</option>
                    {KINDS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
                </select>
            </div>
            {effects.length === 0 && (
                <div style={{ fontSize: 11, opacity: 0.6 }}>No effects yet.</div>
            )}
            {effects.map((effect: LayerEffect, idx: number) => {
                const renderer = getEffect(effect.kind);
                const defaults = (renderer?.defaultParams ?? {}) as Record<string, unknown>;
                const params = effect.params ?? {};
                return (
                    <div key={`${effect.kind}-${idx}`} style={{ borderTop: '1px solid hsl(var(--border-mid))', paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={rowStyle}>
                            <input type="checkbox" checked={effect.enabled}
                                onChange={e => setLayerEffectEnabled(layer.id, idx, e.target.checked)} />
                            <span style={{ flex: 1 }}>{renderer?.label ?? effect.kind}</span>
                            <button onClick={() => removeLayerEffect(layer.id, idx)} style={{ ...inputStyle, padding: '0 6px', cursor: 'pointer' }}>×</button>
                        </div>
                        {Object.entries(defaults).map(([key, defaultValue]) => {
                            const current = (params[key] !== undefined) ? params[key] : defaultValue;
                            if (typeof current === 'number' && typeof defaultValue === 'number') {
                                const min = key === 'angle' ? 0 : (key === 'distance' || key === 'size' ? 0 : 0);
                                const max = key === 'angle' ? 360 : key === 'opacity' ? 100 : key === 'spread' ? 100 : 250;
                                const display = key === 'opacity' || key === 'spread' ? Math.round((current as number) * 100) : current as number;
                                const step = (key === 'opacity' || key === 'spread') ? 1 : 1;
                                return (
                                    <div key={key} style={rowStyle}>
                                        <span style={{ width: 60 }}>{key}</span>
                                        <input type="range" min={min} max={max} step={step} value={display}
                                            onChange={e => {
                                                const v = +e.target.value;
                                                const stored = (key === 'opacity' || key === 'spread') ? v / 100 : v;
                                                setLayerEffectParams(layer.id, idx, { [key]: stored });
                                            }}
                                            style={{ flex: 1 }} />
                                        <span style={{ width: 40, textAlign: 'right' }}>{display}{key === 'opacity' || key === 'spread' ? '%' : 'px'}</span>
                                    </div>
                                );
                            }
                            if (typeof current === 'string' && (key === 'color' || key.toLowerCase().includes('color'))) {
                                return (
                                    <div key={key} style={rowStyle}>
                                        <span style={{ width: 60 }}>{key}</span>
                                        <input type="color" value={current as string}
                                            onChange={e => setLayerEffectParams(layer.id, idx, { [key]: e.target.value })}
                                            style={{ width: 32, height: 22, border: '1px solid hsl(var(--border-light))', background: 'transparent' }} />
                                        <span style={{ flex: 1, fontFamily: 'monospace' }}>{current as string}</span>
                                    </div>
                                );
                            }
                            if (typeof current === 'string' && key === 'blendMode') {
                                const blendOptions: GlobalCompositeOperation[] = ['source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'];
                                return (
                                    <div key={key} style={rowStyle}>
                                        <span style={{ width: 60 }}>{key}</span>
                                        <select value={current as string}
                                            onChange={e => setLayerEffectParams(layer.id, idx, { [key]: e.target.value })}
                                            style={{ ...inputStyle, flex: 1 }}>
                                            {blendOptions.map(b => <option key={b} value={b}>{b}</option>)}
                                        </select>
                                    </div>
                                );
                            }
                            if (typeof current === 'string' && key === 'position') {
                                return (
                                    <div key={key} style={rowStyle}>
                                        <span style={{ width: 60 }}>{key}</span>
                                        <select value={current as string}
                                            onChange={e => setLayerEffectParams(layer.id, idx, { [key]: e.target.value })}
                                            style={{ ...inputStyle, flex: 1 }}>
                                            <option value="outside">outside</option>
                                            <option value="center">center</option>
                                            <option value="inside">inside</option>
                                        </select>
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>
                );
            })}
        </div>
    );
}

export function PropertiesPanel() {
    const { layers, activeLayerId } = useEditorStore();
    const layer = layers.find(l => l.id === activeLayerId) as LayerWithMeta | undefined;

    if (!layer) {
        return (
            <div style={{ padding: 20, fontSize: 11, color: 'hsl(var(--text-muted))', textAlign: 'center' }}>
                No layer selected.
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <LayerSection layer={layer} />
            {layer.kind === 'type' && <TypeSection layer={layer} />}
            {layer.kind === 'adjustment' && layer.adjustment && <AdjustmentSection layer={layer} />}
            {layer.kind === 'fill' && layer.fillData && <FillSection layer={layer} />}
            {layer.mask && <MaskSection layer={layer} />}
            {layer.kind !== 'adjustment' && <EffectsSection layer={layer} />}
        </div>
    );
}
