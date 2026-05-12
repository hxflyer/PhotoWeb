import { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import type { Layer, LayerEffect, LayerEffectKind } from '../../core/Layer';
import type { FillLayerData } from '../../core/fillLayer';
import { getAdjustment } from '../../adjustments';
import { getEffect } from '../../effects';
import { type TypeLayerData } from '../../tools/type';
import { GradientEditorDialog, type GradientEditorResult } from '../Dialogs/GradientEditorDialog';
import { FontPicker } from './FontPicker';
import {
    applyTypeEdit,
    applyTypeStyleEdit,
    beginCoalescedTypeEdit,
    applyCoalescedStylePatch,
    applyCoalescedDataPatch,
    commitCoalescedTypeEdit,
} from '../../tools/typeCommands';
import {
    applyShapeEdit,
    beginCoalescedShapeEdit,
    applyCoalescedShapePatch,
    commitCoalescedShapeEdit,
} from '../../tools/shapeCommands';
import type {
    ShapeData,
    ShapeRectData,
    ShapeRoundedRectData,
    ShapeEllipseData,
    ShapePolygonData,
    ShapeLineData,
    ShapeFill,
    ShapeStroke,
    ShapeStrokeAlignment,
    ShapeStrokeLineCap,
    ShapeStrokeLineJoin,
    GradientColorStop,
    GradientOpacityStop,
} from '../../store/types';

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

const maskButtonStyle: React.CSSProperties = {
    flex: 1,
    fontSize: 11,
    padding: '3px 6px',
    background: 'hsl(var(--bg-input))',
    color: 'hsl(var(--text-main))',
    border: '1px solid hsl(var(--border-light))',
    borderRadius: 2,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
};

function MaskSection({ layer }: { layer: Layer }) {
    const {
        setLayerMaskEnabled, setLayerMaskLinked, setLayerMaskDensity, setLayerMaskFeather,
        invertLayerMask, applyLayerMask, removeLayerMask,
        setActiveLayer, setActiveLayerEditTarget,
        openRefineEdgeDialog, openColorRangeDialog,
    } = useEditorStore();
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
            <div style={{ ...rowStyle, gap: 4 }}>
                <button
                    data-testid="mask-section-edge"
                    style={maskButtonStyle}
                    onClick={() => {
                        setActiveLayer(layer.id);
                        setActiveLayerEditTarget('mask');
                        openRefineEdgeDialog();
                    }}
                >Mask Edge…</button>
                <button
                    data-testid="mask-section-color-range"
                    style={maskButtonStyle}
                    onClick={() => {
                        setActiveLayer(layer.id);
                        setActiveLayerEditTarget('mask');
                        openColorRangeDialog();
                    }}
                >Color Range…</button>
                <button
                    data-testid="mask-section-invert"
                    style={maskButtonStyle}
                    onClick={() => invertLayerMask(layer.id)}
                >Invert</button>
            </div>
            <div style={{ ...rowStyle, gap: 4 }}>
                <button
                    data-testid="mask-section-apply"
                    style={maskButtonStyle}
                    onClick={() => applyLayerMask(layer.id)}
                >Apply</button>
                <button
                    data-testid="mask-section-disable"
                    style={maskButtonStyle}
                    onClick={() => setLayerMaskEnabled(layer.id, !layer.mask?.enabled)}
                >{layer.mask.enabled ? 'Disable' : 'Enable'}</button>
                <button
                    data-testid="mask-section-delete"
                    style={maskButtonStyle}
                    onClick={() => removeLayerMask(layer.id)}
                >Delete</button>
            </div>
        </div>
    );
}

interface AdjustmentParamMeta {
    label: string;
    kind: 'slider' | 'checkbox' | 'select' | 'color' | 'text';
    min?: number;
    max?: number;
    step?: number;
    options?: { value: string; label: string }[];
}

const ADJUSTMENT_PARAM_META: Record<string, Record<string, AdjustmentParamMeta>> = {
    'brightness-contrast': {
        brightness: { label: 'Brightness', kind: 'slider', min: -150, max: 150 },
        contrast: { label: 'Contrast', kind: 'slider', min: -50, max: 100 },
        useLegacy: { label: 'Use Legacy', kind: 'checkbox' },
    },
    'channel-mixer': {
        output: {
            label: 'Output Channel',
            kind: 'select',
            options: [
                { value: 'red', label: 'Red' },
                { value: 'green', label: 'Green' },
                { value: 'blue', label: 'Blue' },
            ],
        },
        red: { label: 'Red', kind: 'slider', min: -200, max: 200 },
        green: { label: 'Green', kind: 'slider', min: -200, max: 200 },
        blue: { label: 'Blue', kind: 'slider', min: -200, max: 200 },
        constant: { label: 'Constant', kind: 'slider', min: -255, max: 255 },
        monochrome: { label: 'Monochrome', kind: 'checkbox' },
    },
    'black-and-white': {
        reds: { label: 'Reds', kind: 'slider', min: -200, max: 300 },
        yellows: { label: 'Yellows', kind: 'slider', min: -200, max: 300 },
        greens: { label: 'Greens', kind: 'slider', min: -200, max: 300 },
        cyans: { label: 'Cyans', kind: 'slider', min: -200, max: 300 },
        blues: { label: 'Blues', kind: 'slider', min: -200, max: 300 },
        magentas: { label: 'Magentas', kind: 'slider', min: -200, max: 300 },
        tint: { label: 'Tint', kind: 'checkbox' },
        tintColor: { label: 'Tint Color', kind: 'color' },
    },
    'selective-color': {
        range: {
            label: 'Colors',
            kind: 'select',
            options: [
                { value: 'reds', label: 'Reds' },
                { value: 'yellows', label: 'Yellows' },
                { value: 'greens', label: 'Greens' },
                { value: 'cyans', label: 'Cyans' },
                { value: 'blues', label: 'Blues' },
                { value: 'magentas', label: 'Magentas' },
                { value: 'whites', label: 'Whites' },
                { value: 'neutrals', label: 'Neutrals' },
                { value: 'blacks', label: 'Blacks' },
            ],
        },
        cyan: { label: 'Cyan', kind: 'slider', min: -100, max: 100 },
        magenta: { label: 'Magenta', kind: 'slider', min: -100, max: 100 },
        yellow: { label: 'Yellow', kind: 'slider', min: -100, max: 100 },
        black: { label: 'Black', kind: 'slider', min: -100, max: 100 },
        method: {
            label: 'Method',
            kind: 'select',
            options: [
                { value: 'relative', label: 'Relative' },
                { value: 'absolute', label: 'Absolute' },
            ],
        },
    },
    'color-balance': {
        range: {
            label: 'Tone',
            kind: 'select',
            options: [
                { value: 'shadows', label: 'Shadows' },
                { value: 'midtones', label: 'Midtones' },
                { value: 'highlights', label: 'Highlights' },
            ],
        },
        cyanRed: { label: 'Cyan/Red', kind: 'slider', min: -100, max: 100 },
        magentaGreen: { label: 'Magenta/Green', kind: 'slider', min: -100, max: 100 },
        yellowBlue: { label: 'Yellow/Blue', kind: 'slider', min: -100, max: 100 },
        preserveLuminosity: { label: 'Preserve Luminosity', kind: 'checkbox' },
    },
};

function AdjustmentSection({ layer }: { layer: LayerWithMeta }) {
    const { setLayerAdjustmentParams } = useEditorStore();
    if (!layer.adjustment) return null;
    const adj = getAdjustment(layer.adjustment.id);
    if (!adj) return null;
    const params = layer.adjustment.params;
    const adjId = layer.adjustment.id;

    function setParam(name: string, value: number | boolean | string) {
        setLayerAdjustmentParams(layer.id, { [name]: value });
    }

    const meta = ADJUSTMENT_PARAM_META[adjId];

    function renderTypedRow(key: string, defaultValue: unknown, m: AdjustmentParamMeta) {
        const current = params[key] ?? defaultValue;
        const testId = `adjustment-${adjId}-${key}`;
        if (m.kind === 'slider' && typeof current === 'number') {
            const min = m.min ?? 0;
            const max = m.max ?? 100;
            const step = m.step ?? 1;
            return (
                <div key={key} style={rowStyle}>
                    <span style={{ width: 100 }}>{m.label}</span>
                    <input type="range" min={min} max={max} step={step} value={current as number}
                        data-testid={testId}
                        onChange={e => setParam(key, +e.target.value)}
                        style={{ flex: 1 }} />
                    <span style={{ width: 40, textAlign: 'right' }}>{(current as number).toFixed(step < 1 ? 2 : 0)}</span>
                </div>
            );
        }
        if (m.kind === 'checkbox' && typeof current === 'boolean') {
            return (
                <div key={key} style={rowStyle}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input type="checkbox" checked={current}
                            data-testid={testId}
                            onChange={e => setParam(key, e.target.checked)} />
                        {m.label}
                    </label>
                </div>
            );
        }
        if (m.kind === 'select' && typeof current === 'string') {
            return (
                <div key={key} style={rowStyle}>
                    <span style={{ width: 100 }}>{m.label}</span>
                    <select value={current as string}
                        data-testid={testId}
                        onChange={e => setParam(key, e.target.value)}
                        style={{ ...inputStyle, flex: 1 }}>
                        {m.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            );
        }
        if (m.kind === 'color' && typeof current === 'string') {
            return (
                <div key={key} style={rowStyle}>
                    <span style={{ width: 100 }}>{m.label}</span>
                    <input type="color" value={current as string}
                        data-testid={testId}
                        onChange={e => setParam(key, e.target.value)}
                        style={{ width: 32, height: 22, border: '1px solid hsl(var(--border-light))', background: 'transparent' }} />
                    <span style={{ flex: 1, fontFamily: 'monospace' }}>{current as string}</span>
                </div>
            );
        }
        return null;
    }

    if (meta) {
        return (
            <div style={sectionStyle}>
                <div style={labelStyle}>Adjustment: {adj.label}</div>
                {Object.entries(meta).map(([key, m]) => {
                    const defaultValue = (adj.defaultParams as Record<string, unknown>)[key];
                    return renderTypedRow(key, defaultValue, m);
                })}
            </div>
        );
    }

    // Generic fallback for adjustments without explicit metadata. Renders
    // sliders for numeric values, checkboxes for booleans, text inputs for strings.
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

function interpolateAlpha(stops: { position: number; opacity: number }[], t: number): number {
    if (stops.length === 0) return 1;
    const sorted = [...stops].sort((a, b) => a.position - b.position);
    if (t <= sorted[0].position) return sorted[0].opacity;
    if (t >= sorted[sorted.length - 1].position) return sorted[sorted.length - 1].opacity;
    let lo = sorted[0]; let hi = sorted[sorted.length - 1];
    for (let i = 0; i < sorted.length - 1; i++) {
        if (t >= sorted[i].position && t <= sorted[i + 1].position) {
            lo = sorted[i]; hi = sorted[i + 1]; break;
        }
    }
    const span = hi.position - lo.position || 1;
    const k = (t - lo.position) / span;
    return lo.opacity + (hi.opacity - lo.opacity) * k;
}

function FillSection({ layer }: { layer: LayerWithMeta }) {
    const { setLayerFillData } = useEditorStore();
    const [editorOpen, setEditorOpen] = useState(false);
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
    const colorStops = data.stops.map(s => ({ position: s.position, color: s.color }));
    const opacityStops = data.stops.map(s => ({ position: s.position, opacity: s.opacity }));
    const onConfirm = (result: GradientEditorResult) => {
        const merged = result.colorStops.map(cs => {
            const op = interpolateAlpha(result.opacityStops, cs.position);
            return { position: cs.position, color: cs.color, opacity: op };
        });
        setLayerFillData(layer.id, { ...data, stops: merged });
    };
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
            <div style={rowStyle}>
                <button
                    data-testid="properties-edit-gradient"
                    onClick={() => setEditorOpen(true)}
                    style={{ ...inputStyle, cursor: 'pointer', flex: 1 }}
                >Edit Gradient…</button>
            </div>
            <GradientEditorDialog
                isOpen={editorOpen}
                initialColorStops={colorStops}
                initialOpacityStops={opacityStops}
                initialSmoothness={100}
                onClose={() => setEditorOpen(false)}
                onConfirm={onConfirm}
            />
        </div>
    );
}

function TypeSection({ layer }: { layer: Layer }) {
    const data = layer.typeData as TypeLayerData | null;
    if (!data) return null;
    return (
        <div style={sectionStyle}>
            <div style={labelStyle}>Type</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 10, color: 'hsl(var(--text-muted))' }}>Text</span>
                <textarea
                    data-testid="properties-type-text"
                    value={data.text}
                    onChange={e => {
                        beginCoalescedTypeEdit(layer.id, 'Edit Type');
                        applyCoalescedDataPatch(layer.id, 'Edit Type', { text: e.target.value });
                    }}
                    onBlur={() => commitCoalescedTypeEdit()}
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical' }}
                />
            </div>
            <div style={rowStyle}>
                <span style={{ width: 70 }}>Font</span>
                <div style={{ flex: 1 }} data-testid="properties-type-font">
                    <FontPicker
                        testIdPrefix="properties-font-picker"
                        layerId={layer.id}
                        value={data.style.fontFamily}
                        onChange={next => {
                            beginCoalescedTypeEdit(layer.id, 'Edit Font Family');
                            applyCoalescedStylePatch(layer.id, 'Edit Font Family', { fontFamily: next });
                        }}
                        onCommit={() => commitCoalescedTypeEdit()}
                    />
                </div>
            </div>
            <div style={rowStyle}>
                <span style={{ width: 70 }}>Size</span>
                <input
                    data-testid="properties-type-size"
                    type="number"
                    min={1}
                    max={500}
                    value={data.style.fontSize}
                    onChange={e => {
                        beginCoalescedTypeEdit(layer.id, 'Edit Font Size');
                        applyCoalescedStylePatch(layer.id, 'Edit Font Size', { fontSize: Math.max(1, Number(e.target.value) || 1) });
                    }}
                    onMouseUp={() => commitCoalescedTypeEdit()}
                    onBlur={() => commitCoalescedTypeEdit()}
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
                    onChange={e => {
                        beginCoalescedTypeEdit(layer.id, 'Edit Text Color');
                        applyCoalescedStylePatch(layer.id, 'Edit Text Color', { color: e.target.value });
                    }}
                    onBlur={() => commitCoalescedTypeEdit()}
                    style={{ width: 32, height: 22, border: '1px solid hsl(var(--border-light))', background: 'transparent' }}
                />
                <span style={{ flex: 1, fontFamily: 'monospace' }}>{data.style.color}</span>
            </div>
            <div style={rowStyle}>
                <span style={{ width: 70 }}>Align</span>
                <select
                    data-testid="properties-type-align"
                    value={data.style.textAlign}
                    onChange={e => applyTypeStyleEdit(layer.id, 'Edit Text Alignment', {
                        textAlign: e.target.value as TypeLayerData['style']['textAlign'],
                    })}
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
                    onChange={e => applyTypeEdit(layer.id, 'Edit Type Orientation', {
                        orientation: e.target.value as TypeLayerData['orientation'],
                    })}
                    style={{ ...inputStyle, flex: 1 }}
                >
                    <option value="horizontal">Horizontal</option>
                    <option value="vertical">Vertical</option>
                </select>
            </div>
            <div style={rowStyle}>
                <span style={{ width: 70 }}>Text Mode</span>
                <div style={{ display: 'flex', gap: 2, flex: 1 }}>
                    <button
                        data-testid="properties-type-mode-point"
                        onClick={() => applyTypeEdit(layer.id, 'Set Point Text', { textMode: 'point' })}
                        style={{
                            ...inputStyle,
                            cursor: 'pointer',
                            flex: 1,
                            background: (data.textMode ?? 'point') === 'point'
                                ? 'hsl(var(--accent-primary))'
                                : 'hsl(var(--bg-input))',
                            color: (data.textMode ?? 'point') === 'point' ? '#fff' : 'hsl(var(--text-main))',
                        }}
                    >Point</button>
                    <button
                        data-testid="properties-type-mode-box"
                        onClick={() => applyTypeEdit(layer.id, 'Set Paragraph Text', { textMode: 'box' })}
                        style={{
                            ...inputStyle,
                            cursor: 'pointer',
                            flex: 1,
                            background: data.textMode === 'box'
                                ? 'hsl(var(--accent-primary))'
                                : 'hsl(var(--bg-input))',
                            color: data.textMode === 'box' ? '#fff' : 'hsl(var(--text-main))',
                        }}
                    >Paragraph</button>
                </div>
            </div>
        </div>
    );
}

export function EffectEntry({ layer, effect, idx }: { layer: Layer; effect: LayerEffect; idx: number }) {
    const { removeLayerEffect, setLayerEffectEnabled, setLayerEffectParams } = useEditorStore();
    const patternPresets = useEditorStore(s => s.patternPresets);
    const [gradientEditorOpen, setGradientEditorOpen] = useState(false);

    const renderer = getEffect(effect.kind);
    const defaults = (renderer?.defaultParams ?? {}) as Record<string, unknown>;
    const params = effect.params ?? {};

    const isGradientOverlay = effect.kind === 'gradient-overlay';
    const isPatternOverlay = effect.kind === 'pattern-overlay';

    // Skip generic auto-rendering for compound keys handled by specialized editors.
    const skipKeys = new Set<string>();
    if (isGradientOverlay) {
        skipKeys.add('colorStops');
        skipKeys.add('opacityStops');
        skipKeys.add('gradientType');
        skipKeys.add('reverse');
        skipKeys.add('alignment');
    }
    if (isPatternOverlay) {
        skipKeys.add('patternId');
    }

    const currentColorStops = (params.colorStops as GradientColorStop[] | undefined)
        ?? (defaults.colorStops as GradientColorStop[]);
    const currentOpacityStops = (params.opacityStops as GradientOpacityStop[] | undefined)
        ?? (defaults.opacityStops as GradientOpacityStop[]);
    const currentGradientType = (params.gradientType as string | undefined)
        ?? (defaults.gradientType as string);
    const currentReverse = (params.reverse as boolean | undefined)
        ?? (defaults.reverse as boolean);
    const currentPatternId = (params.patternId as string | undefined)
        ?? (defaults.patternId as string);
    const currentAlignment = (params.alignment as string | undefined)
        ?? (defaults.alignment as string | undefined)
        ?? 'layer';

    return (
        <div style={{ borderTop: '1px solid hsl(var(--border-mid))', paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={rowStyle}>
                <input type="checkbox" checked={effect.enabled}
                    onChange={e => setLayerEffectEnabled(layer.id, idx, e.target.checked)} />
                <span style={{ flex: 1 }}>{renderer?.label ?? effect.kind}</span>
                <button onClick={() => removeLayerEffect(layer.id, idx)} style={{ ...inputStyle, padding: '0 6px', cursor: 'pointer' }}>×</button>
            </div>

            {isGradientOverlay && (
                <>
                    <div style={rowStyle}>
                        <span style={{ width: 60 }}>Type</span>
                        <select
                            data-testid={`effect-${idx}-gradient-type`}
                            value={currentGradientType}
                            onChange={e => setLayerEffectParams(layer.id, idx, { gradientType: e.target.value })}
                            style={{ ...inputStyle, flex: 1 }}
                        >
                            <option value="linear">Linear</option>
                            <option value="radial">Radial</option>
                            <option value="angle">Angle</option>
                            <option value="reflected">Reflected</option>
                            <option value="diamond">Diamond</option>
                        </select>
                    </div>
                    <div style={rowStyle}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                                data-testid={`effect-${idx}-gradient-reverse`}
                                type="checkbox"
                                checked={Boolean(currentReverse)}
                                onChange={e => setLayerEffectParams(layer.id, idx, { reverse: e.target.checked })}
                            />
                            Reverse
                        </label>
                    </div>
                    <div style={rowStyle}>
                        <span style={{ width: 60 }}>Align</span>
                        <select
                            data-testid={`effect-${idx}-gradient-alignment`}
                            value={currentAlignment}
                            onChange={e => setLayerEffectParams(layer.id, idx, { alignment: e.target.value })}
                            style={{ ...inputStyle, flex: 1 }}
                        >
                            <option value="layer">Align with Layer</option>
                            <option value="selection">Align with Selection</option>
                        </select>
                    </div>
                    <div style={rowStyle}>
                        <button
                            data-testid={`effect-${idx}-edit-gradient`}
                            onClick={() => setGradientEditorOpen(true)}
                            style={{ ...inputStyle, cursor: 'pointer', flex: 1 }}
                        >Edit Gradient…</button>
                    </div>
                    <GradientEditorDialog
                        isOpen={gradientEditorOpen}
                        initialColorStops={currentColorStops.map(s => ({ ...s }))}
                        initialOpacityStops={currentOpacityStops.map(s => ({ ...s }))}
                        initialSmoothness={100}
                        onClose={() => setGradientEditorOpen(false)}
                        onConfirm={(result: GradientEditorResult) => {
                            setLayerEffectParams(layer.id, idx, {
                                colorStops: result.colorStops,
                                opacityStops: result.opacityStops,
                            });
                        }}
                    />
                </>
            )}

            {isPatternOverlay && (
                <div style={rowStyle}>
                    <span style={{ width: 60 }}>Pattern</span>
                    <select
                        data-testid={`effect-${idx}-pattern-id`}
                        value={currentPatternId ?? ''}
                        onChange={e => setLayerEffectParams(layer.id, idx, { patternId: e.target.value })}
                        style={{ ...inputStyle, flex: 1 }}
                    >
                        <option value="">(none)</option>
                        {patternPresets.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {Object.entries(defaults).map(([key, defaultValue]) => {
                if (skipKeys.has(key)) return null;
                const current = (params[key] !== undefined) ? params[key] : defaultValue;
                if (typeof current === 'number' && typeof defaultValue === 'number') {
                    const isPercent = key === 'opacity' || key === 'spread' || key === 'choke'
                        || key === 'highlightOpacity' || key === 'shadowOpacity';
                    const isScale = key === 'scale';
                    const isDepth = key === 'depth';
                    const isAltitude = key === 'altitude';
                    const min = 0;
                    const max = key === 'angle' ? 360
                        : isAltitude ? 90
                            : isDepth ? 1000
                                : isScale ? 200
                                    : isPercent ? 100
                                        : 250;
                    const display = isPercent ? Math.round((current as number) * 100) : current as number;
                    const step = 1;
                    const unit = key === 'angle' || isAltitude ? '°' : isScale || isPercent || isDepth ? '%' : 'px';
                    return (
                        <div key={key} style={rowStyle}>
                            <span style={{ width: 60 }}>{key}</span>
                            <input type="range" min={min} max={max} step={step} value={display}
                                onChange={e => {
                                    const v = +e.target.value;
                                    const stored = isPercent ? v / 100 : v;
                                    setLayerEffectParams(layer.id, idx, { [key]: stored });
                                }}
                                style={{ flex: 1 }} />
                            <span style={{ width: 40, textAlign: 'right' }}>{display}{unit}</span>
                        </div>
                    );
                }
                if (typeof current === 'boolean') {
                    return (
                        <div key={key} style={rowStyle}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <input type="checkbox" checked={current}
                                    onChange={e => setLayerEffectParams(layer.id, idx, { [key]: e.target.checked })} />
                                {key}
                            </label>
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
                if (typeof current === 'string' && (key === 'blendMode' || key === 'highlightBlendMode' || key === 'shadowBlendMode')) {
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
                if (typeof current === 'string' && key === 'style' && effect.kind === 'bevel-emboss') {
                    return (
                        <div key={key} style={rowStyle}>
                            <span style={{ width: 60 }}>{key}</span>
                            <select
                                data-testid={`effect-${idx}-bevel-style`}
                                value={current as string}
                                onChange={e => setLayerEffectParams(layer.id, idx, { [key]: e.target.value })}
                                style={{ ...inputStyle, flex: 1 }}
                            >
                                <option value="inner-bevel">Inner Bevel</option>
                                <option value="outer-bevel">Outer Bevel</option>
                                <option value="emboss">Emboss</option>
                                <option value="pillow-emboss">Pillow Emboss</option>
                            </select>
                        </div>
                    );
                }
                if (typeof current === 'string' && key === 'direction') {
                    return (
                        <div key={key} style={rowStyle}>
                            <span style={{ width: 60 }}>{key}</span>
                            <select value={current as string}
                                onChange={e => setLayerEffectParams(layer.id, idx, { [key]: e.target.value })}
                                style={{ ...inputStyle, flex: 1 }}>
                                <option value="up">Up</option>
                                <option value="down">Down</option>
                            </select>
                        </div>
                    );
                }
                if (typeof current === 'string' && key === 'contour') {
                    return (
                        <div key={key} style={rowStyle}>
                            <span style={{ width: 60 }}>{key}</span>
                            <select
                                data-testid={`effect-${idx}-contour`}
                                value={current as string}
                                onChange={e => setLayerEffectParams(layer.id, idx, { [key]: e.target.value })}
                                style={{ ...inputStyle, flex: 1 }}
                            >
                                <option value="linear">Linear</option>
                                <option value="cone">Cone</option>
                                <option value="gaussian">Gaussian</option>
                            </select>
                        </div>
                    );
                }
                return null;
            })}
        </div>
    );
}

function EffectsSection({ layer }: { layer: Layer }) {
    const { addLayerEffect, copyLayerStyle, pasteLayerStyle, clearLayerStyle, openScaleEffectsDialog } = useEditorStore();
    const copiedLayerStyle = useEditorStore(s => s.copiedLayerStyle);
    const effects = layer.effects ?? [];
    const KINDS: { id: LayerEffectKind; label: string }[] = [
        { id: 'drop-shadow', label: 'Drop Shadow' },
        { id: 'inner-shadow', label: 'Inner Shadow' },
        { id: 'outer-glow', label: 'Outer Glow' },
        { id: 'inner-glow', label: 'Inner Glow' },
        { id: 'stroke', label: 'Stroke' },
        { id: 'color-overlay', label: 'Color Overlay' },
        { id: 'gradient-overlay', label: 'Gradient Overlay' },
        { id: 'pattern-overlay', label: 'Pattern Overlay' },
        { id: 'bevel-emboss', label: 'Bevel & Emboss' },
        { id: 'satin', label: 'Satin' },
    ];

    const buttonStyle: React.CSSProperties = {
        ...inputStyle,
        cursor: 'pointer',
        padding: '2px 6px',
        fontSize: 10,
    };

    return (
        <div style={sectionStyle}>
            <div style={{ ...labelStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Effects</span>
                <select
                    value=""
                    data-testid="effects-add-picker"
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
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <button
                    data-testid="layer-style-copy"
                    onClick={() => copyLayerStyle(layer.id)}
                    style={buttonStyle}
                >Copy Layer Style</button>
                <button
                    data-testid="layer-style-paste"
                    disabled={!copiedLayerStyle}
                    onClick={() => pasteLayerStyle(layer.id)}
                    style={{ ...buttonStyle, opacity: copiedLayerStyle ? 1 : 0.5 }}
                >Paste Layer Style</button>
                <button
                    data-testid="layer-style-clear"
                    onClick={() => clearLayerStyle(layer.id)}
                    style={buttonStyle}
                >Clear Layer Style</button>
                <button
                    data-testid="layer-style-scale"
                    onClick={() => openScaleEffectsDialog()}
                    style={buttonStyle}
                >Scale Effects…</button>
            </div>
            {effects.length === 0 && (
                <div style={{ fontSize: 11, opacity: 0.6 }}>No effects yet.</div>
            )}
            {effects.map((effect: LayerEffect, idx: number) => (
                <EffectEntry key={`${effect.kind}-${idx}`} layer={layer} effect={effect} idx={idx} />
            ))}
        </div>
    );
}

function defaultStrokeFor(data: ShapeData): ShapeStroke {
    if (data.kind === 'line') return { ...data.stroke };
    return data.stroke ?? {
        color: '#000000',
        width: 1,
        opacity: 1,
        alignment: 'center',
        enabled: true,
    };
}

function defaultFillFor(data: ShapeData): ShapeFill {
    if (data.kind === 'line') return { type: 'solid', color: '#000000' };
    return data.fill ?? { type: 'solid', color: '#000000' };
}

interface StrokeControlsProps {
    stroke: ShapeStroke | null;
    required: boolean;
    data: ShapeData;
    patch: (label: string, partial: Partial<ShapeData>) => void;
    setStrokeField: <K extends keyof ShapeStroke>(label: string, key: K, value: ShapeStroke[K]) => void;
    setStrokeFieldCoalesced: <K extends keyof ShapeStroke>(label: string, key: K, value: ShapeStroke[K]) => void;
    coalescedCommit: () => void;
}

function StrokeControls({
    stroke,
    required,
    data,
    patch,
    setStrokeField,
    setStrokeFieldCoalesced,
    coalescedCommit,
}: StrokeControlsProps) {
    const s = stroke ?? defaultStrokeFor(data);
    return (
        <>
            <div style={rowStyle}>
                <span style={{ width: 70 }}>Stroke</span>
                <input
                    data-testid="properties-shape-stroke-color"
                    type="color"
                    value={s.color}
                    onChange={e => setStrokeField('Change Stroke Color', 'color', e.target.value)}
                    style={{ width: 32, height: 22, border: '1px solid hsl(var(--border-light))', background: 'transparent' }}
                />
                <span style={{ flex: 1, fontFamily: 'monospace' }}>{s.color}</span>
                {!required && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                            data-testid="properties-shape-stroke-enabled"
                            type="checkbox"
                            checked={stroke !== null && s.enabled}
                            onChange={e => {
                                if (e.target.checked) {
                                    patch('Enable Stroke', { stroke: { ...s, enabled: true } } as Partial<ShapeData>);
                                } else {
                                    patch('Disable Stroke', { stroke: null } as Partial<ShapeData>);
                                }
                            }}
                        />
                        On
                    </label>
                )}
            </div>
            <div style={rowStyle}>
                <span style={{ width: 70 }}>Weight</span>
                <input
                    data-testid="properties-shape-stroke-width"
                    type="range"
                    min={0}
                    max={50}
                    step={1}
                    value={s.width}
                    onChange={e => setStrokeFieldCoalesced('Change Stroke Width', 'width', Math.max(0, +e.target.value))}
                    onMouseUp={coalescedCommit}
                    onBlur={coalescedCommit}
                    style={{ flex: 1 }}
                />
                <span style={{ width: 36, textAlign: 'right' }}>{Math.round(s.width)}px</span>
            </div>
            <div style={rowStyle}>
                <span style={{ width: 70 }}>Opacity</span>
                <input
                    data-testid="properties-shape-stroke-opacity"
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round((s.opacity ?? 1) * 100)}
                    onChange={e => setStrokeFieldCoalesced('Change Stroke Opacity', 'opacity', +e.target.value / 100)}
                    onMouseUp={coalescedCommit}
                    onBlur={coalescedCommit}
                    style={{ flex: 1 }}
                />
                <span style={{ width: 36, textAlign: 'right' }}>{Math.round((s.opacity ?? 1) * 100)}%</span>
            </div>
            <div style={rowStyle}>
                <span style={{ width: 70 }}>Alignment</span>
                <select
                    data-testid="properties-shape-stroke-alignment"
                    value={s.alignment}
                    onChange={e => setStrokeField('Change Stroke Alignment', 'alignment', e.target.value as ShapeStrokeAlignment)}
                    style={{ ...inputStyle, flex: 1 }}
                >
                    <option value="outside">Outside</option>
                    <option value="center">Center</option>
                    <option value="inside">Inside</option>
                </select>
            </div>
            <div style={rowStyle}>
                <span style={{ width: 70 }}>Dashed Line</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                        data-testid="properties-shape-stroke-dashed"
                        type="checkbox"
                        checked={Array.isArray(s.dash) && s.dash.length > 0}
                        onChange={e => {
                            const nextDash = e.target.checked ? [10, 6] : undefined;
                            setStrokeField('Toggle Dashed Stroke', 'dash', nextDash);
                        }}
                    />
                    On
                </label>
            </div>
            <div style={rowStyle}>
                <span style={{ width: 70 }}>Cap</span>
                <select
                    data-testid="properties-shape-stroke-cap"
                    value={s.lineCap ?? 'butt'}
                    onChange={e => setStrokeField('Change Stroke Cap', 'lineCap', e.target.value as ShapeStrokeLineCap)}
                    style={{ ...inputStyle, flex: 1 }}
                >
                    <option value="butt">Butt</option>
                    <option value="round">Round</option>
                    <option value="square">Projecting</option>
                </select>
            </div>
            <div style={rowStyle}>
                <span style={{ width: 70 }}>Corners</span>
                <select
                    data-testid="properties-shape-stroke-join"
                    value={s.lineJoin ?? 'miter'}
                    onChange={e => setStrokeField('Change Stroke Corners', 'lineJoin', e.target.value as ShapeStrokeLineJoin)}
                    style={{ ...inputStyle, flex: 1 }}
                >
                    <option value="miter">Miter</option>
                    <option value="round">Round</option>
                    <option value="bevel">Bevel</option>
                </select>
            </div>
        </>
    );
}

function ShapeSection({ layer }: { layer: Layer }) {
    const maybeData = layer.shapeData as ShapeData | null;
    if (!maybeData) return null;
    const data: ShapeData = maybeData;

    function patch(label: string, partial: Partial<ShapeData>): void {
        applyShapeEdit(layer.id, label, partial);
    }

    function coalescedBegin(label: string): void {
        beginCoalescedShapeEdit(layer.id, label);
    }

    function coalescedPatch(label: string, partial: Partial<ShapeData>): void {
        applyCoalescedShapePatch(layer.id, label, partial);
    }

    function coalescedCommit(): void {
        commitCoalescedShapeEdit();
    }

    function setFillColor(label: string, color: string): void {
        if (data.kind === 'line') return;
        const next: ShapeFill = { type: 'solid', color };
        patch(label, { fill: next } as Partial<ShapeData>);
    }

    function setStrokeField<K extends keyof ShapeStroke>(label: string, key: K, value: ShapeStroke[K]): void {
        const base = defaultStrokeFor(data);
        const next: ShapeStroke = { ...base, [key]: value };
        patch(label, { stroke: next } as Partial<ShapeData>);
    }

    function setStrokeFieldCoalesced<K extends keyof ShapeStroke>(label: string, key: K, value: ShapeStroke[K]): void {
        const base = defaultStrokeFor(data);
        const next: ShapeStroke = { ...base, [key]: value };
        coalescedBegin(label);
        coalescedPatch(label, { stroke: next } as Partial<ShapeData>);
    }

    const fillSection = data.kind !== 'line' ? (
        <div style={rowStyle}>
            <span style={{ width: 70 }}>Fill</span>
            <input
                data-testid="properties-shape-fill-color"
                type="color"
                value={data.fill?.type === 'solid' ? data.fill.color : '#000000'}
                onChange={e => setFillColor('Change Shape Fill', e.target.value)}
                style={{ width: 32, height: 22, border: '1px solid hsl(var(--border-light))', background: 'transparent' }}
            />
            <span style={{ flex: 1, fontFamily: 'monospace' }}>{data.fill?.type === 'solid' ? data.fill.color : 'None'}</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                    data-testid="properties-shape-fill-enabled"
                    type="checkbox"
                    checked={data.fill !== null}
                    onChange={e => {
                        if (e.target.checked) {
                            patch('Enable Shape Fill', { fill: defaultFillFor(data) } as Partial<ShapeData>);
                        } else {
                            patch('Disable Shape Fill', { fill: null } as Partial<ShapeData>);
                        }
                    }}
                />
                On
            </label>
        </div>
    ) : null;

    if (data.kind === 'rect' || data.kind === 'rounded-rect' || data.kind === 'ellipse') {
        const b = data.bounds;
        const labelText = data.kind === 'rect' ? 'Rectangle' : data.kind === 'rounded-rect' ? 'Rounded Rectangle' : 'Ellipse';
        const rrData = data as ShapeRoundedRectData;
        const stroke = (data as ShapeRectData | ShapeRoundedRectData | ShapeEllipseData).stroke;
        return (
            <div style={sectionStyle}>
                <div style={labelStyle}>Live Shape: {labelText}</div>
                <div style={rowStyle}>
                    <span style={{ width: 70 }}>Width</span>
                    <input
                        data-testid="properties-shape-width"
                        type="number"
                        min={1}
                        value={b.w}
                        onChange={e => {
                            const v = Math.max(1, Number(e.target.value) || 1);
                            coalescedBegin('Change Shape Width');
                            coalescedPatch('Change Shape Width', { bounds: { ...b, w: v } } as Partial<ShapeData>);
                        }}
                        onMouseUp={coalescedCommit}
                        onBlur={coalescedCommit}
                        style={{ ...inputStyle, width: 80 }}
                    />
                    <span>px</span>
                </div>
                <div style={rowStyle}>
                    <span style={{ width: 70 }}>Height</span>
                    <input
                        data-testid="properties-shape-height"
                        type="number"
                        min={1}
                        value={b.h}
                        onChange={e => {
                            const v = Math.max(1, Number(e.target.value) || 1);
                            coalescedBegin('Change Shape Height');
                            coalescedPatch('Change Shape Height', { bounds: { ...b, h: v } } as Partial<ShapeData>);
                        }}
                        onMouseUp={coalescedCommit}
                        onBlur={coalescedCommit}
                        style={{ ...inputStyle, width: 80 }}
                    />
                    <span>px</span>
                </div>
                {data.kind === 'rounded-rect' && (
                    <div style={rowStyle}>
                        <span style={{ width: 70 }}>Corner Radius</span>
                        <input
                            data-testid="properties-shape-corner-radius"
                            type="range"
                            min={0}
                            max={Math.max(1, Math.min(b.w, b.h) / 2)}
                            value={rrData.cornerRadius}
                            onChange={e => {
                                const v = Math.max(0, +e.target.value);
                                coalescedBegin('Change Corner Radius');
                                coalescedPatch('Change Corner Radius', { cornerRadius: v } as Partial<ShapeData>);
                            }}
                            onMouseUp={coalescedCommit}
                            onBlur={coalescedCommit}
                            style={{ flex: 1 }}
                        />
                        <span style={{ width: 40, textAlign: 'right' }}>{Math.round(rrData.cornerRadius)}px</span>
                    </div>
                )}
                {fillSection}
                <StrokeControls
                    stroke={stroke}
                    required={false}
                    data={data}
                    patch={patch}
                    setStrokeField={setStrokeField}
                    setStrokeFieldCoalesced={setStrokeFieldCoalesced}
                    coalescedCommit={coalescedCommit}
                />
            </div>
        );
    }

    if (data.kind === 'polygon') {
        const poly = data as ShapePolygonData;
        return (
            <div style={sectionStyle}>
                <div style={labelStyle}>Live Shape: {poly.star ? 'Star' : 'Polygon'}</div>
                <div style={rowStyle}>
                    <span style={{ width: 70 }}>Center X</span>
                    <input
                        data-testid="properties-shape-center-x"
                        type="number"
                        value={poly.center.x}
                        onChange={e => {
                            const v = Number(e.target.value) || 0;
                            coalescedBegin('Change Center X');
                            coalescedPatch('Change Center X', { center: { ...poly.center, x: v } } as Partial<ShapeData>);
                        }}
                        onMouseUp={coalescedCommit}
                        onBlur={coalescedCommit}
                        style={{ ...inputStyle, width: 80 }}
                    />
                    <span style={{ width: 20 }}>Y</span>
                    <input
                        data-testid="properties-shape-center-y"
                        type="number"
                        value={poly.center.y}
                        onChange={e => {
                            const v = Number(e.target.value) || 0;
                            coalescedBegin('Change Center Y');
                            coalescedPatch('Change Center Y', { center: { ...poly.center, y: v } } as Partial<ShapeData>);
                        }}
                        onMouseUp={coalescedCommit}
                        onBlur={coalescedCommit}
                        style={{ ...inputStyle, width: 80 }}
                    />
                </div>
                <div style={rowStyle}>
                    <span style={{ width: 70 }}>Radius</span>
                    <input
                        data-testid="properties-shape-radius"
                        type="range"
                        min={1}
                        max={500}
                        value={poly.radius}
                        onChange={e => {
                            const v = Math.max(1, +e.target.value);
                            coalescedBegin('Change Polygon Radius');
                            coalescedPatch('Change Polygon Radius', { radius: v } as Partial<ShapeData>);
                        }}
                        onMouseUp={coalescedCommit}
                        onBlur={coalescedCommit}
                        style={{ flex: 1 }}
                    />
                    <span style={{ width: 40, textAlign: 'right' }}>{Math.round(poly.radius)}px</span>
                </div>
                <div style={rowStyle}>
                    <span style={{ width: 70 }}>Sides</span>
                    <input
                        data-testid="properties-shape-sides"
                        type="number"
                        min={3}
                        max={20}
                        step={1}
                        value={poly.sides}
                        onChange={e => {
                            const v = Math.max(3, Math.min(20, Math.round(Number(e.target.value) || 3)));
                            patch('Change Polygon Sides', { sides: v } as Partial<ShapeData>);
                        }}
                        style={{ ...inputStyle, width: 80 }}
                    />
                </div>
                <div style={rowStyle}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                            data-testid="properties-shape-star"
                            type="checkbox"
                            checked={poly.star}
                            onChange={e => patch(e.target.checked ? 'Enable Star' : 'Disable Star', { star: e.target.checked } as Partial<ShapeData>)}
                        />
                        Star
                    </label>
                </div>
                {poly.star && (
                    <div style={rowStyle}>
                        <span style={{ width: 70 }}>Indent Sides By</span>
                        <input
                            data-testid="properties-shape-star-ratio"
                            type="range"
                            min={5}
                            max={95}
                            value={Math.round(poly.starRatio * 100)}
                            onChange={e => {
                                const v = Math.max(0.05, Math.min(0.95, +e.target.value / 100));
                                coalescedBegin('Change Star Indent');
                                coalescedPatch('Change Star Indent', { starRatio: v } as Partial<ShapeData>);
                            }}
                            onMouseUp={coalescedCommit}
                            onBlur={coalescedCommit}
                            style={{ flex: 1 }}
                        />
                        <span style={{ width: 40, textAlign: 'right' }}>{Math.round(poly.starRatio * 100)}%</span>
                    </div>
                )}
                <div style={rowStyle}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                            data-testid="properties-shape-smooth-corners"
                            type="checkbox"
                            checked={!!poly.smoothCorners}
                            onChange={e => patch(e.target.checked ? 'Smooth Corners On' : 'Smooth Corners Off', { smoothCorners: e.target.checked } as Partial<ShapeData>)}
                        />
                        Smooth Corners
                    </label>
                </div>
                {poly.star && (
                    <div style={rowStyle}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                                data-testid="properties-shape-smooth-indents"
                                type="checkbox"
                                checked={!!poly.smoothIndents}
                                onChange={e => patch(e.target.checked ? 'Smooth Indents On' : 'Smooth Indents Off', { smoothIndents: e.target.checked } as Partial<ShapeData>)}
                            />
                            Smooth Indents
                        </label>
                    </div>
                )}
                <div style={rowStyle}>
                    <span style={{ width: 70 }}>Rotation</span>
                    <input
                        data-testid="properties-shape-rotation"
                        type="range"
                        min={-180}
                        max={180}
                        value={Math.round((poly.rotation * 180) / Math.PI)}
                        onChange={e => {
                            const v = ((+e.target.value) * Math.PI) / 180;
                            coalescedBegin('Change Rotation');
                            coalescedPatch('Change Rotation', { rotation: v } as Partial<ShapeData>);
                        }}
                        onMouseUp={coalescedCommit}
                        onBlur={coalescedCommit}
                        style={{ flex: 1 }}
                    />
                    <span style={{ width: 40, textAlign: 'right' }}>{Math.round((poly.rotation * 180) / Math.PI)}°</span>
                </div>
                {fillSection}
                <StrokeControls
                    stroke={poly.stroke}
                    required={false}
                    data={data}
                    patch={patch}
                    setStrokeField={setStrokeField}
                    setStrokeFieldCoalesced={setStrokeFieldCoalesced}
                    coalescedCommit={coalescedCommit}
                />
            </div>
        );
    }

    if (data.kind === 'line') {
        const line = data as ShapeLineData;
        return (
            <div style={sectionStyle}>
                <div style={labelStyle}>Live Shape: Line</div>
                <div style={rowStyle}>
                    <span style={{ width: 70 }}>Start</span>
                    <input
                        data-testid="properties-shape-p0-x"
                        type="number"
                        value={line.p0.x}
                        onChange={e => {
                            const v = Number(e.target.value) || 0;
                            coalescedBegin('Change Line Start X');
                            coalescedPatch('Change Line Start X', { p0: { ...line.p0, x: v } } as Partial<ShapeData>);
                        }}
                        onMouseUp={coalescedCommit}
                        onBlur={coalescedCommit}
                        style={{ ...inputStyle, width: 70 }}
                    />
                    <input
                        data-testid="properties-shape-p0-y"
                        type="number"
                        value={line.p0.y}
                        onChange={e => {
                            const v = Number(e.target.value) || 0;
                            coalescedBegin('Change Line Start Y');
                            coalescedPatch('Change Line Start Y', { p0: { ...line.p0, y: v } } as Partial<ShapeData>);
                        }}
                        onMouseUp={coalescedCommit}
                        onBlur={coalescedCommit}
                        style={{ ...inputStyle, width: 70 }}
                    />
                </div>
                <div style={rowStyle}>
                    <span style={{ width: 70 }}>End</span>
                    <input
                        data-testid="properties-shape-p1-x"
                        type="number"
                        value={line.p1.x}
                        onChange={e => {
                            const v = Number(e.target.value) || 0;
                            coalescedBegin('Change Line End X');
                            coalescedPatch('Change Line End X', { p1: { ...line.p1, x: v } } as Partial<ShapeData>);
                        }}
                        onMouseUp={coalescedCommit}
                        onBlur={coalescedCommit}
                        style={{ ...inputStyle, width: 70 }}
                    />
                    <input
                        data-testid="properties-shape-p1-y"
                        type="number"
                        value={line.p1.y}
                        onChange={e => {
                            const v = Number(e.target.value) || 0;
                            coalescedBegin('Change Line End Y');
                            coalescedPatch('Change Line End Y', { p1: { ...line.p1, y: v } } as Partial<ShapeData>);
                        }}
                        onMouseUp={coalescedCommit}
                        onBlur={coalescedCommit}
                        style={{ ...inputStyle, width: 70 }}
                    />
                </div>
                <div style={rowStyle}>
                    <span style={{ width: 70 }}>Weight</span>
                    <input
                        data-testid="properties-shape-line-weight"
                        type="range"
                        min={1}
                        max={50}
                        step={1}
                        value={line.weight}
                        onChange={e => {
                            const v = Math.max(1, +e.target.value);
                            coalescedBegin('Change Line Weight');
                            coalescedPatch('Change Line Weight', { weight: v } as Partial<ShapeData>);
                        }}
                        onMouseUp={coalescedCommit}
                        onBlur={coalescedCommit}
                        style={{ flex: 1 }}
                    />
                    <span style={{ width: 36, textAlign: 'right' }}>{Math.round(line.weight)}px</span>
                </div>
                <div style={rowStyle}>
                    <span style={{ width: 70 }}>Arrowhead</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                            data-testid="properties-shape-arrow-start"
                            type="checkbox"
                            checked={line.arrowStart}
                            onChange={e => patch(e.target.checked ? 'Enable Start Arrow' : 'Disable Start Arrow', { arrowStart: e.target.checked } as Partial<ShapeData>)}
                        />
                        Start
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                            data-testid="properties-shape-arrow-end"
                            type="checkbox"
                            checked={line.arrowEnd}
                            onChange={e => patch(e.target.checked ? 'Enable End Arrow' : 'Disable End Arrow', { arrowEnd: e.target.checked } as Partial<ShapeData>)}
                        />
                        End
                    </label>
                </div>
                {(line.arrowStart || line.arrowEnd) && (
                    <div style={rowStyle}>
                        <span style={{ width: 70 }}>Arrow Size</span>
                        <input
                            data-testid="properties-shape-arrow-size"
                            type="range"
                            min={1}
                            max={20}
                            value={line.arrowSize}
                            onChange={e => {
                                const v = Math.max(1, +e.target.value);
                                coalescedBegin('Change Arrow Size');
                                coalescedPatch('Change Arrow Size', { arrowSize: v } as Partial<ShapeData>);
                            }}
                            onMouseUp={coalescedCommit}
                            onBlur={coalescedCommit}
                            style={{ flex: 1 }}
                        />
                        <span style={{ width: 36, textAlign: 'right' }}>{Math.round(line.arrowSize)}</span>
                    </div>
                )}
                <StrokeControls
                    stroke={line.stroke}
                    required={true}
                    data={data}
                    patch={patch}
                    setStrokeField={setStrokeField}
                    setStrokeFieldCoalesced={setStrokeFieldCoalesced}
                    coalescedCommit={coalescedCommit}
                />
            </div>
        );
    }

    return null;
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
            {layer.kind === 'shape' && <ShapeSection layer={layer} />}
            {layer.kind === 'adjustment' && layer.adjustment && <AdjustmentSection layer={layer} />}
            {layer.kind === 'fill' && layer.fillData && <FillSection layer={layer} />}
            {layer.mask && <MaskSection layer={layer} />}
            {layer.kind !== 'adjustment' && <EffectsSection layer={layer} />}
        </div>
    );
}
