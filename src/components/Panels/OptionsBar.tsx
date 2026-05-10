import { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import {
    Circle, Lasso, Pentagon, Square, Layers, ZoomIn, ZoomOut,
    AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline,
} from 'lucide-react';
import { getMagicWandOptions, setMagicWandOptions } from '../../tools/magicWand';
import { getQuickSelectionOptions, setQuickSelectionOptions } from '../../tools/quickSelection';
import {
    getGradientOptions, setGradientOptions, getGradientPresets,
    type GradientType, type GradientMethod,
} from '../../tools/gradient';
import { getPaintBucketOptions, setPaintBucketOptions, type FillSource } from '../../tools/paintBucket';
import { getCloneStampOptions, setCloneStampOptions, type CloneStampSampleMode } from '../../tools/cloneStamp';
import type { BlendModeId } from '../../core/blendModes';

const S = {
    sep: () => <div className="opts-sep" />,
    label: (t: string) => <span className="opts-label">{t}</span>,
};

// ── Brush size/hardness/opacity strip ────────────────────────────────────────
function BrushControls({ showFlow = true }: { showFlow?: boolean }) {
    const { brushSettings, setBrushSize, setBrushHardness, setBrushOpacity, setBrushFlow } = useEditorStore();
    const s = brushSettings;
    return (
        <>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Size:')}
                <input type="range" min={1} max={500} value={s.size}
                    onChange={e => setBrushSize(+e.target.value)}
                    style={{ width: 80, accentColor: 'hsl(var(--accent-primary))' }} />
                <input type="number" min={1} max={500} value={s.size}
                    onChange={e => setBrushSize(+e.target.value)}
                    className="opts-input" style={{ width: 42 }} />
                <span className="opts-label">px</span>
            </div>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Hardness:')}
                <input type="range" min={0} max={100} value={Math.round(s.hardness * 100)}
                    onChange={e => setBrushHardness(+e.target.value / 100)}
                    style={{ width: 60, accentColor: 'hsl(var(--accent-primary))' }} />
                <span className="opts-label" style={{ minWidth: 30 }}>{Math.round(s.hardness * 100)}%</span>
            </div>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Opacity:')}
                <input type="range" min={0} max={100} value={Math.round(s.opacity * 100)}
                    onChange={e => setBrushOpacity(+e.target.value / 100)}
                    style={{ width: 60, accentColor: 'hsl(var(--accent-primary))' }} />
                <span className="opts-label" style={{ minWidth: 30 }}>{Math.round(s.opacity * 100)}%</span>
            </div>
            {showFlow && (
                <>
                    {S.sep()}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {S.label('Flow:')}
                        <input type="range" min={1} max={100} value={Math.round(s.flow * 100)}
                            onChange={e => setBrushFlow(+e.target.value / 100)}
                            style={{ width: 50, accentColor: 'hsl(var(--accent-primary))' }} />
                        <span className="opts-label">{Math.round(s.flow * 100)}%</span>
                    </div>
                </>
            )}
        </>
    );
}

// ── Mode dropdown (blend modes) ───────────────────────────────────────────────
const BLEND_MODE_LABELS: { id: BlendModeId; label: string }[] = [
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

function ModeDropdown(props?: { value?: BlendModeId; onChange?: (v: BlendModeId) => void }) {
    return (
        <select
            className="opts-input"
            style={{ width: 90 }}
            title="Mode"
            value={props?.value ?? 'normal'}
            onChange={e => props?.onChange?.(e.target.value as BlendModeId)}
        >
            {BLEND_MODE_LABELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
    );
}

// ── Tool-specific content ─────────────────────────────────────────────────────
function MoveOptions() {
    return (
        <>
            {S.label('Auto-Select:')}
            <select className="opts-input" style={{ width: 70 }}>
                <option>Layer</option>
                <option>Group</option>
            </select>
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Show Transform Controls
            </label>
        </>
    );
}

function MarqueeOptions({ mode }: { mode: 'rect' | 'circle' }) {
    const { setSelectionMode } = useEditorStore();
    return (
        <>
            {/* Mode icons */}
            <div style={{ display: 'flex', gap: 1 }}>
                <button className="opts-btn" title="New selection"><span style={{ fontSize: 12 }}>▭</span></button>
                <button className="opts-btn" title="Add to selection (⇧)"><span style={{ fontSize: 12 }}>▭⁺</span></button>
                <button className="opts-btn" title="Subtract (⌥)"><span style={{ fontSize: 12 }}>▭⁻</span></button>
                <button className="opts-btn" title="Intersect (⇧⌥)"><span style={{ fontSize: 12 }}>⌂</span></button>
            </div>
            {S.sep()}
            {/* Shape toggle */}
            <button
                className={`opts-btn${mode === 'rect' ? ' active' : ''}`}
                onClick={() => setSelectionMode('rect')} title="Rectangular Marquee">
                <Square size={13} />
            </button>
            <button
                className={`opts-btn${mode === 'circle' ? ' active' : ''}`}
                onClick={() => setSelectionMode('circle')} title="Elliptical Marquee">
                <Circle size={13} />
            </button>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Feather:')}
                <input type="number" min={0} max={200} defaultValue={0}
                    className="opts-input" style={{ width: 40 }} />
                <span className="opts-label">px</span>
            </div>
            {mode === 'circle' && (
                <>
                    {S.sep()}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                        <input type="checkbox" defaultChecked style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                        Anti-alias
                    </label>
                </>
            )}
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Style:')}
                <select className="opts-input" style={{ width: 80 }}>
                    <option>Normal</option>
                    <option>Fixed Ratio</option>
                    <option>Fixed Size</option>
                </select>
            </div>
        </>
    );
}

function LassoOptions({ poly }: { poly: boolean }) {
    const { setSelectionMode } = useEditorStore();
    return (
        <>
            <div style={{ display: 'flex', gap: 1 }}>
                <button className="opts-btn"><span style={{ fontSize: 12 }}>▭</span></button>
                <button className="opts-btn"><span style={{ fontSize: 12 }}>▭⁺</span></button>
                <button className="opts-btn"><span style={{ fontSize: 12 }}>▭⁻</span></button>
                <button className="opts-btn"><span style={{ fontSize: 12 }}>⌂</span></button>
            </div>
            {S.sep()}
            <button className={`opts-btn${!poly ? ' active' : ''}`} onClick={() => setSelectionMode('lasso')} title="Freehand Lasso"><Lasso size={13} /></button>
            <button className={`opts-btn${poly ? ' active' : ''}`} onClick={() => setSelectionMode('lasso-poly')} title="Polygonal Lasso"><Pentagon size={13} /></button>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Feather:')}
                <input type="number" min={0} max={200} defaultValue={0} className="opts-input" style={{ width: 40 }} />
                <span className="opts-label">px</span>
            </div>
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Anti-alias
            </label>
        </>
    );
}

function MagicWandOptions() {
    const [opts, setOpts] = useState(getMagicWandOptions);
    const update = (next: Parameters<typeof setMagicWandOptions>[0]) => {
        const merged = { ...opts, ...next };
        setOpts(merged);
        setMagicWandOptions(next);
    };

    return (
        <>
            <div style={{ display: 'flex', gap: 1 }}>
                <button className="opts-btn"><span style={{ fontSize: 12 }}>▭</span></button>
                <button className="opts-btn"><span style={{ fontSize: 12 }}>▭⁺</span></button>
                <button className="opts-btn"><span style={{ fontSize: 12 }}>▭⁻</span></button>
                <button className="opts-btn"><span style={{ fontSize: 12 }}>⌂</span></button>
            </div>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Tolerance:')}
                <input type="number" min={0} max={255} value={opts.tolerance}
                    onChange={e => update({ tolerance: Math.max(0, Math.min(255, Number(e.target.value) || 0)) })}
                    className="opts-input" style={{ width: 40 }} />
            </div>
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" checked={opts.antiAlias}
                    onChange={e => update({ antiAlias: e.target.checked })}
                    style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Anti-alias
            </label>
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" checked={opts.contiguous}
                    onChange={e => update({ contiguous: e.target.checked })}
                    style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Contiguous
            </label>
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" checked={opts.sampleAllLayers}
                    onChange={e => update({ sampleAllLayers: e.target.checked })}
                    style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Sample All Layers
            </label>
        </>
    );
}

function QuickSelOptions() {
    const [opts, setOpts] = useState(getQuickSelectionOptions);
    const update = (next: Parameters<typeof setQuickSelectionOptions>[0]) => {
        const merged = { ...opts, ...next };
        setOpts(merged);
        setQuickSelectionOptions(next);
    };

    return (
        <>
            <div style={{ display: 'flex', gap: 1 }}>
                <button className="opts-btn"><span style={{ fontSize: 12 }}>▭⁺</span></button>
                <button className="opts-btn"><span style={{ fontSize: 12 }}>▭⁻</span></button>
            </div>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Size:')}
                <input type="range" min={1} max={300} value={opts.size}
                    onChange={e => update({ size: +e.target.value })}
                    style={{ width: 70, accentColor: 'hsl(var(--accent-primary))' }} />
                <span className="opts-label" style={{ minWidth: 28 }}>{opts.size}px</span>
            </div>
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" checked={opts.sampleAllLayers}
                    onChange={e => update({ sampleAllLayers: e.target.checked })}
                    style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Sample All Layers
            </label>
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" checked={opts.autoEnhance}
                    onChange={e => update({ autoEnhance: e.target.checked })}
                    style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Auto-Enhance
            </label>
        </>
    );
}

function CropOptions() {
    return (
        <>
            <select className="opts-input" style={{ width: 80 }} title="Ratio preset">
                <option>Ratio</option>
                <option>W×H×Resolution</option>
                <option>Original Ratio</option>
                <option>1:1 (Square)</option>
                <option>4:5 (8:10)</option>
                <option>5:7</option>
                <option>2:3 (4:6)</option>
                <option>3:4 (6:8)</option>
                <option>4:3</option>
                <option>16:9</option>
            </select>
            {S.sep()}
            <input type="text" placeholder="W" className="opts-input" style={{ width: 50 }} />
            <span className="opts-label">×</span>
            <input type="text" placeholder="H" className="opts-input" style={{ width: 50 }} />
            {S.sep()}
            <button className="opts-btn" title="Swap dimensions">⇄</button>
            <button className="opts-btn" title="Clear dimensions">✕</button>
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Delete Cropped Pixels
            </label>
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Classic Mode
            </label>
        </>
    );
}

function EyedropperOptions() {
    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Sample Size:')}
                <select className="opts-input" style={{ width: 90 }}>
                    <option>Point Sample</option>
                    <option>3 by 3 Average</option>
                    <option>5 by 5 Average</option>
                    <option>11 by 11 Average</option>
                    <option>31 by 31 Average</option>
                    <option>51 by 51 Average</option>
                    <option>101 by 101 Average</option>
                </select>
            </div>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Sample:')}
                <select className="opts-input" style={{ width: 100 }}>
                    <option>All Layers</option>
                    <option>Current Layer</option>
                    <option>Current & Below</option>
                </select>
            </div>
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Show Sampling Ring
            </label>
        </>
    );
}

function BrushOptions() {
    return (
        <>
            <ModeDropdown />
            <BrushControls showFlow />
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Smoothing
            </label>
        </>
    );
}

function EraserOptions() {
    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Mode:')}
                <select className="opts-input" style={{ width: 70 }}>
                    <option>Brush</option>
                    <option>Pencil</option>
                    <option>Block</option>
                </select>
            </div>
            <BrushControls showFlow={false} />
        </>
    );
}

function CloneStampOptions() {
    const [opts, setOpts] = useState(getCloneStampOptions);
    const update = (next: Parameters<typeof setCloneStampOptions>[0]) => {
        const merged = { ...opts, ...next };
        setOpts(merged);
        setCloneStampOptions(next);
    };

    return (
        <>
            <ModeDropdown value={opts.mode as BlendModeId} onChange={mode => update({ mode: mode as GlobalCompositeOperation })} />
            <BrushControls />
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" checked={opts.aligned}
                    onChange={e => update({ aligned: e.target.checked })}
                    style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Aligned
            </label>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Sample:')}
                <select className="opts-input" style={{ width: 115 }} value={opts.sample}
                    onChange={e => update({ sample: e.target.value as CloneStampSampleMode })}>
                    <option value="current">Current Layer</option>
                    <option value="current-below">Current & Below</option>
                    <option value="all">All Layers</option>
                </select>
            </div>
            {S.sep()}
            <span className="opts-label">Alt/Option-click to sample</span>
        </>
    );
}

function GradientOptions() {
    // Subscribe to a tick so external setGradientOptions calls propagate; we still
    // read latest options imperatively to avoid extra store wiring for tool-local state.
    const [, force] = useState(0);
    const opts = getGradientOptions();
    const presets = getGradientPresets();
    const update = (next: Partial<ReturnType<typeof getGradientOptions>>) => { setGradientOptions(next); force(t => t + 1); };
    const primaryColor = useEditorStore(s => s.primaryColor);
    const secondaryColor = useEditorStore(s => s.secondaryColor);
    const preset = presets.find(p => p.id === opts.presetId) ?? presets[0];
    // Build a CSS preview of the current gradient using FG/BG-substituted stops.
    const previewStops = preset.stops.map((s, i, arr) => {
        const c = i === 0 ? primaryColor : i === arr.length - 1 ? secondaryColor : s.color;
        const r = parseInt(c.slice(1, 3), 16); const g = parseInt(c.slice(3, 5), 16); const b = parseInt(c.slice(5, 7), 16);
        const pos = opts.reverse ? 1 - s.position : s.position;
        return { pos: pos * 100, css: `rgba(${r},${g},${b},${s.opacity})` };
    }).sort((a, b) => a.pos - b.pos);
    const previewCss = `linear-gradient(to right, ${previewStops.map(s => `${s.css} ${s.pos}%`).join(', ')})`;

    const TYPE_BTNS: { type: GradientType; icon: string; title: string }[] = [
        { type: 'linear',    icon: '⟶', title: 'Linear Gradient' },
        { type: 'radial',    icon: '◎', title: 'Radial Gradient' },
        { type: 'angle',     icon: '∠', title: 'Angle Gradient' },
        { type: 'reflected', icon: '⌇', title: 'Reflected Gradient' },
        { type: 'diamond',   icon: '◇', title: 'Diamond Gradient' },
    ];

    return (
        <>
            <select
                className="opts-input"
                style={{ width: 90 }}
                title="Gradient preset"
                value={opts.presetId}
                onChange={e => update({ presetId: e.target.value })}
            >
                {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div style={{ width: 120, height: 20, background: previewCss, border: '1px solid hsl(var(--border-light))', borderRadius: 2 }} title="Gradient preview" />
            {S.sep()}
            {TYPE_BTNS.map(b => (
                <button
                    key={b.type}
                    className={`opts-btn${opts.type === b.type ? ' active' : ''}`}
                    title={b.title}
                    onClick={() => update({ type: b.type })}
                >{b.icon}</button>
            ))}
            {S.sep()}
            <ModeDropdown value={opts.mode} onChange={v => update({ mode: v })} />
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Opacity:')}
                <input
                    type="number" min={0} max={100}
                    value={Math.round(opts.opacity * 100)}
                    onChange={e => update({ opacity: Math.max(0, Math.min(100, +e.target.value)) / 100 })}
                    className="opts-input" style={{ width: 40 }} />
                <span className="opts-label">%</span>
            </div>
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" checked={opts.reverse}
                    onChange={e => update({ reverse: e.target.checked })}
                    style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Reverse
            </label>
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" checked={opts.dither}
                    onChange={e => update({ dither: e.target.checked })}
                    style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Dither
            </label>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Method:')}
                <select
                    className="opts-input" style={{ width: 70 }}
                    value={opts.method}
                    onChange={e => update({ method: e.target.value as GradientMethod })}
                >
                    <option value="smooth">Smooth</option>
                    <option value="classic">Classic</option>
                </select>
            </div>
        </>
    );
}

function PaintBucketOptions() {
    const [, force] = useState(0);
    const opts = getPaintBucketOptions();
    const update = (next: Partial<ReturnType<typeof getPaintBucketOptions>>) => { setPaintBucketOptions(next); force(t => t + 1); };
    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Fill:')}
                <select
                    className="opts-input" style={{ width: 90 }}
                    value={opts.source}
                    onChange={e => update({ source: e.target.value as FillSource })}
                >
                    <option value="foreground">Foreground</option>
                    <option value="pattern">Pattern</option>
                </select>
            </div>
            {S.sep()}
            <ModeDropdown value={opts.mode} onChange={v => update({ mode: v })} />
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Opacity:')}
                <input type="number" min={0} max={100}
                    value={Math.round(opts.opacity * 100)}
                    onChange={e => update({ opacity: Math.max(0, Math.min(100, +e.target.value)) / 100 })}
                    className="opts-input" style={{ width: 40 }} />
                <span className="opts-label">%</span>
            </div>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Tolerance:')}
                <input type="number" min={0} max={255}
                    value={opts.tolerance}
                    onChange={e => update({ tolerance: Math.max(0, Math.min(255, +e.target.value)) })}
                    className="opts-input" style={{ width: 40 }} />
            </div>
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" checked={opts.antiAlias}
                    onChange={e => update({ antiAlias: e.target.checked })}
                    style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Anti-alias
            </label>
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" checked={opts.contiguous}
                    onChange={e => update({ contiguous: e.target.checked })}
                    style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Contiguous
            </label>
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" checked={opts.sampleAllLayers}
                    onChange={e => update({ sampleAllLayers: e.target.checked })}
                    style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                All Layers
            </label>
        </>
    );
}

function DodgeBurnOptions({ tool }: { tool: 'dodge' | 'burn' | 'sponge' }) {
    const { brushSettings, setBrushSize } = useEditorStore();
    if (tool === 'sponge') return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Size:')}
                <input type="range" min={1} max={500} value={brushSettings.size}
                    onChange={e => setBrushSize(+e.target.value)}
                    style={{ width: 70, accentColor: 'hsl(var(--accent-primary))' }} />
                <span className="opts-label">{brushSettings.size}px</span>
            </div>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Mode:')}
                <select className="opts-input" style={{ width: 90 }}>
                    <option>Desaturate</option>
                    <option>Saturate</option>
                </select>
            </div>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Flow:')}
                <input type="range" min={1} max={100} defaultValue={50} style={{ width: 60, accentColor: 'hsl(var(--accent-primary))' }} />
                <span className="opts-label">50%</span>
            </div>
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Vibrance
            </label>
        </>
    );
    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Size:')}
                <input type="range" min={1} max={500} value={brushSettings.size}
                    onChange={e => setBrushSize(+e.target.value)}
                    style={{ width: 70, accentColor: 'hsl(var(--accent-primary))' }} />
                <span className="opts-label">{brushSettings.size}px</span>
            </div>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Range:')}
                <select className="opts-input" style={{ width: 90 }}>
                    <option>Midtones</option>
                    <option>Shadows</option>
                    <option>Highlights</option>
                </select>
            </div>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Exposure:')}
                <input type="range" min={1} max={100} defaultValue={50} style={{ width: 60, accentColor: 'hsl(var(--accent-primary))' }} />
                <span className="opts-label">50%</span>
            </div>
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Protect Tones
            </label>
        </>
    );
}

function PenOptions() {
    return (
        <>
            <div style={{ display: 'flex', gap: 1 }}>
                {(['Path', 'Shape', 'Pixels'] as const).map(m => (
                    <button key={m} className={`opts-btn${m === 'Path' ? ' active' : ''}`}>{m}</button>
                ))}
            </div>
            {S.sep()}
            <div style={{ display: 'flex', gap: 1 }}>
                {['⊕', '⊖', '⊗', '⊘'].map((icon, i) => (
                    <button key={i} className="opts-btn" title={['Combine Paths', 'Subtract Front Shape', 'Intersect Shape Areas', 'Exclude Overlapping Shapes'][i]}>{icon}</button>
                ))}
            </div>
        </>
    );
}

function TypeOptions() {
    const { primaryColor, openColorPicker } = useEditorStore();
    return (
        <>
            {/* Font family */}
            <input type="text" defaultValue="Helvetica" className="opts-input" style={{ width: 130 }} placeholder="Font" />
            {S.sep()}
            {/* Style */}
            <select className="opts-input" style={{ width: 70 }}>
                <option>Regular</option>
                <option>Bold</option>
                <option>Italic</option>
                <option>Bold Italic</option>
            </select>
            {S.sep()}
            {/* Size */}
            <input type="number" min={1} max={1000} defaultValue={12} className="opts-input" style={{ width: 42 }} />
            <span className="opts-label">pt</span>
            {S.sep()}
            {/* Bold / Italic / Underline */}
            <button className="opts-btn" title="Bold (⌘B)"><Bold size={13} /></button>
            <button className="opts-btn" title="Italic (⌘I)"><Italic size={13} /></button>
            <button className="opts-btn" title="Underline (⌘U)"><Underline size={13} /></button>
            {S.sep()}
            {/* Alignment */}
            <button className="opts-btn" title="Align Left"><AlignLeft size={13} /></button>
            <button className="opts-btn" title="Align Center"><AlignCenter size={13} /></button>
            <button className="opts-btn" title="Align Right"><AlignRight size={13} /></button>
            {S.sep()}
            {/* Color swatch */}
            <div
                title="Text Color"
                onClick={() => openColorPicker('primary')}
                style={{ width: 20, height: 20, backgroundColor: primaryColor, border: '1px solid hsl(var(--border-light))', cursor: 'pointer', flexShrink: 0 }}
            />
            {S.sep()}
            <button className="opts-btn" title="Create Warp Text">T̴</button>
            <button className="opts-btn" title="Toggle Character/Paragraph Panels"><Layers size={13} /></button>
        </>
    );
}

function ShapeOptions() {
    const { primaryColor, openColorPicker } = useEditorStore();
    return (
        <>
            <div style={{ display: 'flex', gap: 1 }}>
                {(['Shape', 'Path', 'Pixels'] as const).map(m => (
                    <button key={m} className={`opts-btn${m === 'Shape' ? ' active' : ''}`}>{m}</button>
                ))}
            </div>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Fill:')}
                <div onClick={() => openColorPicker('primary')}
                    style={{ width: 20, height: 20, backgroundColor: primaryColor, border: '1px solid hsl(var(--border-light))', cursor: 'pointer' }} />
            </div>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Stroke:')}
                <div style={{ width: 20, height: 20, background: 'transparent', border: '2px solid hsl(var(--text-main))', cursor: 'pointer' }} />
            </div>
            <input type="number" min={0} max={100} defaultValue={0} className="opts-input" style={{ width: 36 }} />
            <span className="opts-label">px</span>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('W:')}
                <input type="text" defaultValue="" className="opts-input" style={{ width: 50 }} placeholder="—" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('H:')}
                <input type="text" defaultValue="" className="opts-input" style={{ width: 50 }} placeholder="—" />
            </div>
        </>
    );
}

function PathSelectionOptions() {
    return (
        <>
            <div style={{ display: 'flex', gap: 1 }}>
                {['⊕', '⊖', '⊗', '⊘'].map((icon, i) => (
                    <button key={i} className="opts-btn" title={['Combine', 'Subtract', 'Intersect', 'Exclude'][i]}>{icon}</button>
                ))}
            </div>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Show:')}
                <select className="opts-input" style={{ width: 90 }}>
                    <option>All Layers</option>
                    <option>Active Layers</option>
                </select>
            </div>
            {S.sep()}
            <button className="opts-btn">Align Edges</button>
        </>
    );
}

function ZoomOptions() {
    const { zoom, setZoom, setPan } = useEditorStore();
    return (
        <>
            <button className="opts-btn" onClick={() => setZoom(Math.min(zoom * 1.25, 32))} title="Zoom In"><ZoomIn size={14} /></button>
            <button className="opts-btn" onClick={() => setZoom(Math.max(zoom / 1.25, 0.02))} title="Zoom Out"><ZoomOut size={14} /></button>
            {S.sep()}
            <button className="opts-btn" onClick={() => { setZoom(1); setPan(0, 0); }} title="Fit on Screen">Fit Screen</button>
            <button className="opts-btn" onClick={() => setZoom(1)} title="Actual Pixels">100%</button>
            <button className="opts-btn" onClick={() => setZoom(2)} title="200%">200%</button>
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Scrubby Zoom
            </label>
        </>
    );
}

function HandOptions() {
    const { setZoom, setPan } = useEditorStore();
    return (
        <>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Scroll All Windows
            </label>
            {S.sep()}
            <button className="opts-btn" onClick={() => { setZoom(1); setPan(0, 0); }}>100%</button>
            <button className="opts-btn" onClick={() => { setZoom(1); setPan(0, 0); }}>Fit Screen</button>
            <button className="opts-btn" onClick={() => setZoom(2)}>Fill Screen</button>
        </>
    );
}

// ── Main OptionsBar component ─────────────────────────────────────────────────
export function OptionsBar() {
    const activeTool = useEditorStore(s => s.activeTool);

    // Tool name badge
    const toolLabel: Record<string, string> = {
        'move': 'Move', 'brush': 'Brush', 'pencil': 'Pencil',
        'eraser': 'Eraser', 'clone-stamp': 'Clone Stamp',
        'gradient': 'Gradient', 'fill': 'Paint Bucket',
        'dodge': 'Dodge', 'burn': 'Burn', 'sponge': 'Sponge',
        'marquee-rect': 'Rectangular Marquee', 'marquee-ellipse': 'Elliptical Marquee',
        'select': 'Marquee', 'lasso': 'Lasso', 'lasso-poly': 'Polygonal Lasso',
        'magic-wand': 'Magic Wand', 'quick-selection': 'Quick Selection',
        'crop': 'Crop', 'eyedropper': 'Eyedropper',
        'pen': 'Pen', 'freeform-pen': 'Freeform Pen',
        'path-selection': 'Path Selection', 'direct-selection': 'Direct Selection',
        'type-horizontal': 'Type', 'type-vertical': 'Vertical Type',
        'shape-rectangle': 'Rectangle', 'shape-rounded-rectangle': 'Rounded Rectangle',
        'shape-ellipse': 'Ellipse', 'shape-polygon': 'Polygon',
        'shape-line': 'Line', 'shape-custom': 'Custom Shape',
        'hand': 'Hand', 'zoom': 'Zoom',
    };

    const renderOptions = () => {
        switch (activeTool) {
            case 'move': return <MoveOptions />;
            case 'marquee-rect': return <MarqueeOptions mode="rect" />;
            case 'marquee-ellipse': return <MarqueeOptions mode="circle" />;
            case 'select': return <MarqueeOptions mode="rect" />;
            case 'lasso': return <LassoOptions poly={false} />;
            case 'lasso-poly': return <LassoOptions poly={true} />;
            case 'magic-wand': return <MagicWandOptions />;
            case 'quick-selection': return <QuickSelOptions />;
            case 'crop': return <CropOptions />;
            case 'eyedropper': return <EyedropperOptions />;
            case 'brush':
            case 'pencil': return <BrushOptions />;
            case 'eraser': return <EraserOptions />;
            case 'clone-stamp': return <CloneStampOptions />;
            case 'gradient': return <GradientOptions />;
            case 'fill': return <PaintBucketOptions />;
            case 'dodge': return <DodgeBurnOptions tool="dodge" />;
            case 'burn': return <DodgeBurnOptions tool="burn" />;
            case 'sponge': return <DodgeBurnOptions tool="sponge" />;
            case 'pen':
            case 'freeform-pen': return <PenOptions />;
            case 'type-horizontal':
            case 'type-vertical': return <TypeOptions />;
            case 'path-selection':
            case 'direct-selection': return <PathSelectionOptions />;
            case 'shape-rectangle':
            case 'shape-rounded-rectangle':
            case 'shape-ellipse':
            case 'shape-polygon':
            case 'shape-line':
            case 'shape-custom': return <ShapeOptions />;
            case 'hand': return <HandOptions />;
            case 'zoom': return <ZoomOptions />;
            default: return null;
        }
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            height: '100%',
            padding: '0 6px',
            overflow: 'hidden',
            fontSize: 11,
        }}>
            {/* Tool name */}
            <span style={{
                fontSize: 11, fontWeight: 600,
                color: 'hsl(var(--text-muted))',
                minWidth: 0,
                paddingRight: 4,
                borderRight: '1px solid hsl(var(--border-mid))',
                marginRight: 2,
                whiteSpace: 'nowrap',
            }}>
                {toolLabel[activeTool] ?? activeTool}
            </span>

            {renderOptions()}
        </div>
    );
}
