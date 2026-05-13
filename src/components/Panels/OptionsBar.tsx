import { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import {
    Circle, Lasso, Magnet, Pentagon, Square, Layers, ZoomIn, ZoomOut,
    AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline,
    Repeat2, X,
    AlignHorizontalDistributeCenter,
    AlignHorizontalJustifyCenter,
    AlignHorizontalJustifyEnd,
    AlignHorizontalJustifyStart,
    AlignVerticalDistributeCenter,
    AlignVerticalJustifyCenter,
    AlignVerticalJustifyEnd,
    AlignVerticalJustifyStart,
} from 'lucide-react';
import { getMagicWandOptions, setMagicWandOptions, type MagicWandSampleSize } from '../../tools/magicWand';
import { getSelectionToolOperation, setSelectionToolOperation, type SelectionOp } from '../../tools/selectionModifiers';
import { getQuickSelectionOptions, setQuickSelectionOptions } from '../../tools/quickSelection';
import { getObjectSelectionOptions, setObjectSelectionOptions, type ObjectSelectionOptions as ObjectSelectionToolOptions } from '../../tools/objectSelection';
import {
    getGradientOptions, setGradientOptions, getGradientPresets,
    type GradientType, type GradientMethod, type GradientMode, type GradientStop,
} from '../../tools/gradient';
import { GradientEditorDialog, type GradientEditorResult } from '../Dialogs/GradientEditorDialog';
import { getPaintBucketOptions, setPaintBucketOptions, type FillSource } from '../../tools/paintBucket';
import { getCloneStampOptions, setCloneStampOptions, resetCloneSource, type CloneStampSampleMode } from '../../tools/cloneStamp';
import { getEraserOptions, setEraserOptions, type EraserMode } from '../../tools/eraser';
import { getMagicEraserOptions, setMagicEraserOptions } from '../../tools/magicEraser';
import {
    getBackgroundEraserOptions, setBackgroundEraserOptions,
    type BackgroundEraserSampling, type BackgroundEraserLimits,
} from '../../tools/backgroundEraser';
import {
    getSpotHealingOptions, setSpotHealingOptions, type SpotHealingType,
} from '../../tools/spotHealing';
import { getHealingBrushOptions, setHealingBrushOptions, resetHealingBrushSource } from '../../tools/healingBrush';
import { getPatchOptions, setPatchOptions, type PatchMode } from '../../tools/patch';
import { getRedEyeOptions, setRedEyeOptions } from '../../tools/redEye';
import {
    getDodgeOptions, setDodgeOptions,
    getBurnOptions, setBurnOptions,
    getSpongeOptions, setSpongeOptions,
    type ToneRange, type SpongeMode,
} from '../../tools/dodgeBurnSponge';
import { getBrushOptions, setBrushOptions } from '../../tools/brush';
import { getPencilOptions, setPencilOptions } from '../../tools/pencil';
import { getMarqueeOptions, setMarqueeOptions } from '../../tools/marquee';
import { getMagneticLassoOptions, setMagneticLassoOptions } from '../../tools/magneticLasso';
import { getMoveOptions, setMoveOptions } from '../../tools/move';
import { getShapeOptions, setShapeOptions } from '../../tools/shapes';
import { getCustomShapeLibrary, CUSTOM_SHAPE_VIEWBOX } from '../../tools/customShapes';
import { getCropOptions, setCropOptions, type CropAspectId, type CropOverlayId } from '../../tools/crop';
import {
    getEyedropperOptions, setEyedropperOptions,
    type EyedropperSample, type SampleSize,
} from '../../tools/eyedropper';
import { clearRulerMeasurement, getRulerMeasurement, straightenRulerMeasurement } from '../../tools/ruler';
import { getPenOptions, setPenOptions, type PenMode } from '../../tools/pen';
import type { BlendModeId } from '../../core/blendModes';
import type { PaintSymmetryMode } from '../../store/types';
import {
    GradientAngleIcon, GradientDiamondIcon, GradientLinearIcon, GradientRadialIcon, GradientReflectedIcon,
    SelectionAddIcon, SelectionIntersectIcon, SelectionNewIcon, SelectionSubtractIcon,
    ShapeCombineIcon, ShapeExcludeIcon, ShapeIntersectIcon, ShapeSubtractIcon,
    WarpTextIcon,
} from '../icons/PhotowebIcons';

const S = {
    sep: () => <div className="opts-sep" />,
    label: (t: string) => <span className="opts-label">{t}</span>,
};

const SELECTION_OP_BUTTONS = [
    { mode: 'new', title: 'New selection', Icon: SelectionNewIcon },
    { mode: 'add', title: 'Add to selection (Shift)', Icon: SelectionAddIcon },
    { mode: 'sub', title: 'Subtract from selection (Option/Alt)', Icon: SelectionSubtractIcon },
    { mode: 'intersect', title: 'Intersect with selection (Shift+Option/Alt)', Icon: SelectionIntersectIcon },
] as const satisfies { mode: SelectionOp; title: string; Icon: typeof SelectionNewIcon }[];

const SELECTION_OP_TEST_IDS: Record<SelectionOp, string> = {
    new: 'selection-op-new',
    add: 'selection-op-add',
    sub: 'selection-op-subtract',
    intersect: 'selection-op-intersect',
};

function SelectionOperationButtons({ compact = false }: { compact?: boolean }) {
    const [active, setActive] = useState(getSelectionToolOperation);
    const buttons = compact ? SELECTION_OP_BUTTONS.slice(1, 3) : SELECTION_OP_BUTTONS;
    return (
        <div style={{ display: 'flex', gap: 1 }}>
            {buttons.map(({ mode, title, Icon }) => (
                <button
                    key={title}
                    data-testid={SELECTION_OP_TEST_IDS[mode]}
                    className={`opts-btn${active === mode ? ' active' : ''}`}
                    title={title}
                    aria-pressed={active === mode}
                    onClick={() => {
                        setSelectionToolOperation(mode);
                        setActive(mode);
                    }}
                >
                    <Icon size={13} />
                </button>
            ))}
        </div>
    );
}

const SHAPE_OP_BUTTONS = [
    { title: 'Combine Shapes', Icon: ShapeCombineIcon, mode: 'combine' as const },
    { title: 'Subtract Front Shape', Icon: ShapeSubtractIcon, mode: 'subtract' as const },
    { title: 'Intersect Shape Areas', Icon: ShapeIntersectIcon, mode: 'intersect' as const },
    { title: 'Exclude Overlapping Shapes', Icon: ShapeExcludeIcon, mode: 'exclude' as const },
];

function ShapeOperationButtons({ shortTitles = false }: { shortTitles?: boolean }) {
    const [, force] = useState(0);
    const opts = getShapeOptions();
    return (
        <div style={{ display: 'flex', gap: 1 }}>
            {SHAPE_OP_BUTTONS.map(({ title, Icon, mode }) => (
                <button
                    key={title}
                    data-testid={`shape-op-${mode}`}
                    className={`opts-btn${opts.combineMode === mode ? ' active' : ''}`}
                    title={`${shortTitles ? title.replace(' Shapes', '').replace(' Shape Areas', '').replace(' Overlapping Shapes', '') : title} — applies to the next shape created in this session. Combining existing layers is not yet supported.`}
                    onClick={() => {
                        const current = getShapeOptions().combineMode;
                        setShapeOptions({ combineMode: current === mode ? 'new' : mode });
                        force(t => t + 1);
                    }}
                >
                    <Icon size={13} />
                </button>
            ))}
        </div>
    );
}

// ── Brush size/hardness/opacity strip ────────────────────────────────────────
function BrushControls({ showFlow = true }: { showFlow?: boolean }) {
    const { brushSettings, setBrushSize, setBrushHardness, setBrushOpacity, setBrushFlow } = useEditorStore();
    const s = brushSettings;
    return (
        <>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Size:')}
                <input data-testid="brush-size-range" type="range" min={1} max={500} value={s.size}
                    onChange={e => setBrushSize(+e.target.value)}
                    style={{ width: 80, accentColor: 'hsl(var(--accent-primary))' }} />
                <input data-testid="brush-size-input" type="number" min={1} max={500} value={s.size}
                    onChange={e => setBrushSize(+e.target.value)}
                    className="opts-input" style={{ width: 42 }} />
                <span className="opts-label">px</span>
            </div>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Hardness:')}
                <input data-testid="brush-hardness-range" type="range" min={0} max={100} value={Math.round(s.hardness * 100)}
                    onChange={e => setBrushHardness(+e.target.value / 100)}
                    style={{ width: 60, accentColor: 'hsl(var(--accent-primary))' }} />
                <span className="opts-label" style={{ minWidth: 30 }}>{Math.round(s.hardness * 100)}%</span>
            </div>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Opacity:')}
                <input data-testid="brush-opacity-range" type="range" min={0} max={100} value={Math.round(s.opacity * 100)}
                    onChange={e => setBrushOpacity(+e.target.value / 100)}
                    style={{ width: 60, accentColor: 'hsl(var(--accent-primary))' }} />
                <span className="opts-label" style={{ minWidth: 30 }}>{Math.round(s.opacity * 100)}%</span>
            </div>
            {showFlow && (
                <>
                    {S.sep()}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {S.label('Flow:')}
                        <input data-testid="brush-flow-range" type="range" min={1} max={100} value={Math.round(s.flow * 100)}
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

type BrushMode = 'source-over' | 'multiply' | 'clear';

function BrushModeDropdown({ value, onChange, clearDisabled }: { value: BrushMode; onChange: (v: BrushMode) => void; clearDisabled?: boolean }) {
    return (
        <select
            data-testid="brush-mode"
            className="opts-input"
            style={{ width: 90 }}
            title="Mode"
            value={value}
            onChange={e => onChange(e.target.value as BrushMode)}
        >
            <option value="source-over">Normal</option>
            <option value="multiply">Multiply</option>
            <option value="clear" disabled={clearDisabled}>Clear</option>
        </select>
    );
}

// ── Tool-specific content ─────────────────────────────────────────────────────
function MoveOptions() {
    const [, force] = useState(0);
    const opts = getMoveOptions();
    const { selectedLayerIds, alignSelectedLayers, distributeSelectedLayers } = useEditorStore();
    const update = (next: Parameters<typeof setMoveOptions>[0]) => { setMoveOptions(next); force(t => t + 1); };
    const canAlign = selectedLayerIds.length >= 2;
    const canDistribute = selectedLayerIds.length >= 3;
    const alignButtons = [
        { id: 'left', title: 'Align Left Edges', Icon: AlignHorizontalJustifyStart },
        { id: 'horizontal-center', title: 'Align Horizontal Centers', Icon: AlignHorizontalJustifyCenter },
        { id: 'right', title: 'Align Right Edges', Icon: AlignHorizontalJustifyEnd },
        { id: 'top', title: 'Align Top Edges', Icon: AlignVerticalJustifyStart },
        { id: 'vertical-center', title: 'Align Vertical Centers', Icon: AlignVerticalJustifyCenter },
        { id: 'bottom', title: 'Align Bottom Edges', Icon: AlignVerticalJustifyEnd },
    ] as const;
    const distributeButtons = [
        { id: 'horizontal-center', title: 'Distribute Horizontal Centers', Icon: AlignHorizontalDistributeCenter },
        { id: 'vertical-center', title: 'Distribute Vertical Centers', Icon: AlignVerticalDistributeCenter },
    ] as const;
    return (
        <>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input
                    type="checkbox"
                    checked={opts.autoSelect !== 'off'}
                    onChange={(e) => update({ autoSelect: e.target.checked ? 'layer' : 'off' })}
                    style={{ accentColor: 'hsl(var(--accent-primary))' }}
                />
                Auto-Select
            </label>
            <select
                className="opts-input"
                style={{ width: 70 }}
                value={opts.autoSelect === 'off' ? 'layer' : opts.autoSelect}
                disabled={opts.autoSelect === 'off'}
                onChange={(e) => update({ autoSelect: e.target.value as 'layer' | 'group' })}
            >
                <option value="layer">Layer</option>
                <option value="group">Group</option>
            </select>
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input
                    type="checkbox"
                    checked={opts.showTransformControls}
                    onChange={(e) => update({ showTransformControls: e.target.checked })}
                    style={{ accentColor: 'hsl(var(--accent-primary))' }}
                />
                Show Transform Controls
            </label>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {alignButtons.map(({ id, title, Icon }) => (
                    <button
                        key={id}
                        data-testid={`move-align-${id}`}
                        className="opts-btn"
                        title={title}
                        disabled={!canAlign}
                        onClick={() => alignSelectedLayers(id)}
                    >
                        <Icon size={13} />
                    </button>
                ))}
            </div>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {distributeButtons.map(({ id, title, Icon }) => (
                    <button
                        key={id}
                        data-testid={`move-distribute-${id}`}
                        className="opts-btn"
                        title={title}
                        disabled={!canDistribute}
                        onClick={() => distributeSelectedLayers(id)}
                    >
                        <Icon size={13} />
                    </button>
                ))}
            </div>
        </>
    );
}

function MarqueeOptions({ mode }: { mode: 'rect' | 'circle' }) {
    const { setSelectionMode, setSelectionFeather } = useEditorStore();
    const [, force] = useState(0);
    const opts = getMarqueeOptions();
    const update = (next: Parameters<typeof setMarqueeOptions>[0]) => { setMarqueeOptions(next); force(t => t + 1); };
    const updateDimension = (key: 'width' | 'height', value: number) => {
        update({ [key]: Math.max(1, Number.isFinite(value) ? value : 1) });
    };
    return (
        <>
            {/* Mode icons */}
            <SelectionOperationButtons />
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
                <input type="number" min={0} max={200} value={opts.feather}
                    onChange={e => {
                        const next = Math.max(0, Math.min(200, Number(e.target.value) || 0));
                        update({ feather: next });
                        setSelectionFeather(next);
                    }}
                    className="opts-input" style={{ width: 40 }} />
                <span className="opts-label">px</span>
            </div>
            {mode === 'circle' && (
                <>
                    {S.sep()}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                        <input type="checkbox" checked={opts.antiAlias}
                            onChange={e => update({ antiAlias: e.target.checked })}
                            style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                        Anti-alias
                    </label>
                </>
            )}
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Style:')}
                <select
                    data-testid="marquee-style"
                    className="opts-input"
                    style={{ width: 92 }}
                    value={opts.style}
                    onChange={e => update({ style: e.target.value as typeof opts.style })}
                >
                    <option value="normal">Normal</option>
                    <option value="fixed-ratio">Fixed Ratio</option>
                    <option value="fixed-size">Fixed Size</option>
                </select>
            </div>
            {opts.style !== 'normal' && (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {S.label('W:')}
                        <input
                            data-testid="marquee-width"
                            type="number"
                            min={1}
                            value={opts.width}
                            onChange={e => updateDimension('width', Number(e.target.value))}
                            className="opts-input"
                            style={{ width: 54 }}
                        />
                        {opts.style === 'fixed-size' && <span className="opts-label">px</span>}
                    </div>
                    <button
                        data-testid="marquee-swap"
                        className="opts-btn"
                        title="Swap Width and Height"
                        onClick={() => update({ width: opts.height, height: opts.width })}
                    >
                        <Repeat2 size={13} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {S.label('H:')}
                        <input
                            data-testid="marquee-height"
                            type="number"
                            min={1}
                            value={opts.height}
                            onChange={e => updateDimension('height', Number(e.target.value))}
                            className="opts-input"
                            style={{ width: 54 }}
                        />
                        {opts.style === 'fixed-size' && <span className="opts-label">px</span>}
                    </div>
                </>
            )}
        </>
    );
}

function LassoOptions({ mode }: { mode: 'free' | 'poly' | 'magnetic' }) {
    const { setSelectionMode, setTool } = useEditorStore();
    const [, force] = useState(0);
    const mag = getMagneticLassoOptions();
    const updateMag = (next: Parameters<typeof setMagneticLassoOptions>[0]) => {
        setMagneticLassoOptions(next);
        force(t => t + 1);
    };
    return (
        <>
            <SelectionOperationButtons />
            {S.sep()}
            <button className={`opts-btn${mode === 'free' ? ' active' : ''}`} onClick={() => { setTool('lasso'); setSelectionMode('lasso'); }} title="Lasso Tool"><Lasso size={13} /></button>
            <button className={`opts-btn${mode === 'poly' ? ' active' : ''}`} onClick={() => { setTool('lasso-poly'); setSelectionMode('lasso-poly'); }} title="Polygonal Lasso Tool"><Pentagon size={13} /></button>
            <button className={`opts-btn${mode === 'magnetic' ? ' active' : ''}`} onClick={() => setTool('magnetic-lasso')} title="Magnetic Lasso Tool"><Magnet size={13} /></button>
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
            {mode === 'magnetic' && (
                <>
                    {S.sep()}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {S.label('Width:')}
                        <input data-testid="magnetic-lasso-width" type="number" min={1} max={256} value={mag.width}
                            onChange={e => updateMag({ width: Number(e.target.value) || 1 })}
                            className="opts-input" style={{ width: 48 }} />
                        <span className="opts-label">px</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {S.label('Contrast:')}
                        <input data-testid="magnetic-lasso-contrast" type="number" min={0} max={100} value={mag.contrast}
                            onChange={e => updateMag({ contrast: Number(e.target.value) || 0 })}
                            className="opts-input" style={{ width: 44 }} />
                        <span className="opts-label">%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {S.label('Frequency:')}
                        <input data-testid="magnetic-lasso-frequency" type="number" min={0} max={100} value={mag.frequency}
                            onChange={e => updateMag({ frequency: Number(e.target.value) || 0 })}
                            className="opts-input" style={{ width: 44 }} />
                    </div>
                </>
            )}
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
            <SelectionOperationButtons />
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Sample Size:')}
                <select
                    className="opts-input"
                    style={{ width: 90 }}
                    value={opts.sampleSize}
                    onChange={e => update({ sampleSize: e.target.value as MagicWandSampleSize })}
                    title="Eyedropper-style sample window"
                >
                    <option value="point">Point</option>
                    <option value="3x3">3 by 3</option>
                    <option value="5x5">5 by 5</option>
                    <option value="11x11">11 by 11</option>
                    <option value="31x31">31 by 31</option>
                    <option value="51x51">51 by 51</option>
                    <option value="101x101">101 by 101</option>
                </select>
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
            <SelectionOperationButtons compact />
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

function ObjectSelectionOptionsPanel() {
    const { setSelectionMode } = useEditorStore();
    const [opts, setOpts] = useState(getObjectSelectionOptions);
    const update = (next: Partial<ObjectSelectionToolOptions>) => {
        const merged = { ...opts, ...next };
        setOpts(merged);
        setObjectSelectionOptions(next);
        if (next.mode === 'rectangle') setSelectionMode('rect');
        if (next.mode === 'lasso') setSelectionMode('lasso');
    };

    return (
        <>
            <SelectionOperationButtons />
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Mode:')}
                <button
                    data-testid="object-selection-mode-rectangle"
                    className={`opts-btn${opts.mode === 'rectangle' ? ' active' : ''}`}
                    title="Rectangle"
                    aria-pressed={opts.mode === 'rectangle'}
                    onClick={() => update({ mode: 'rectangle' })}
                >
                    <Square size={13} />
                </button>
                <button
                    data-testid="object-selection-mode-lasso"
                    className={`opts-btn${opts.mode === 'lasso' ? ' active' : ''}`}
                    title="Lasso"
                    aria-pressed={opts.mode === 'lasso'}
                    onClick={() => update({ mode: 'lasso' })}
                >
                    <Lasso size={13} />
                </button>
            </div>
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input
                    data-testid="object-selection-sample-all-layers"
                    type="checkbox"
                    checked={opts.sampleAllLayers}
                    onChange={e => update({ sampleAllLayers: e.target.checked })}
                    style={{ accentColor: 'hsl(var(--accent-primary))' }}
                />
                Sample All Layers
            </label>
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input
                    data-testid="object-selection-auto-enhance"
                    type="checkbox"
                    checked={opts.autoEnhance}
                    onChange={e => update({ autoEnhance: e.target.checked })}
                    style={{ accentColor: 'hsl(var(--accent-primary))' }}
                />
                Auto-Enhance
            </label>
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input
                    data-testid="object-selection-object-subtract"
                    type="checkbox"
                    checked={opts.objectSubtract}
                    onChange={e => update({ objectSubtract: e.target.checked })}
                    style={{ accentColor: 'hsl(var(--accent-primary))' }}
                />
                Object Subtract
            </label>
        </>
    );
}

function CropOptions() {
    const [, force] = useState(0);
    const opts = getCropOptions();
    const update = (next: Parameters<typeof setCropOptions>[0]) => { setCropOptions(next); force(t => t + 1); };
    return (
        <>
            <select className="opts-input" style={{ width: 90 }} title="Ratio preset"
                value={opts.aspect}
                onChange={e => update({ aspect: e.target.value as CropAspectId })}>
                <option value="free">Ratio</option>
                <option value="1:1">1:1 (Square)</option>
                <option value="5:4">5:4 (8:10)</option>
                <option value="3:2">3:2 (4:6)</option>
                <option value="4:3">4:3</option>
                <option value="16:9">16:9</option>
                <option value="custom">Custom</option>
            </select>
            {S.sep()}
            <input
                type="number"
                placeholder="W"
                className="opts-input"
                style={{ width: 50 }}
                value={opts.aspect === 'custom' ? opts.customRatio.w : ''}
                onChange={e => {
                    const w = Math.max(0.0001, parseFloat(e.target.value) || 1);
                    update({ aspect: 'custom', customRatio: { ...opts.customRatio, w } });
                }}
            />
            <span className="opts-label">×</span>
            <input
                type="number"
                placeholder="H"
                className="opts-input"
                style={{ width: 50 }}
                value={opts.aspect === 'custom' ? opts.customRatio.h : ''}
                onChange={e => {
                    const h = Math.max(0.0001, parseFloat(e.target.value) || 1);
                    update({ aspect: 'custom', customRatio: { ...opts.customRatio, h } });
                }}
            />
            {S.sep()}
            <button
                className="opts-btn"
                title="Swap dimensions"
                onClick={() => update({ customRatio: { w: opts.customRatio.h, h: opts.customRatio.w } })}
            ><Repeat2 size={13} /></button>
            <button
                className="opts-btn"
                title="Clear dimensions (reset to free ratio)"
                onClick={() => update({ aspect: 'free', customRatio: { w: 1, h: 1 } })}
            ><X size={13} /></button>
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" checked={opts.classicMode}
                    onChange={e => update({ classicMode: e.target.checked })}
                    style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Classic Mode
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" checked={opts.hideCroppedArea}
                    onChange={e => update({ hideCroppedArea: e.target.checked })}
                    style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Hide
            </label>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Overlay:')}
                <select className="opts-input" style={{ width: 100 }} value={opts.overlay}
                    onChange={e => update({ overlay: e.target.value as CropOverlayId })}>
                    <option value="rule-of-thirds">Rule of Thirds</option>
                    <option value="grid">Grid</option>
                    <option value="diagonal">Diagonal</option>
                    <option value="triangle">Triangle</option>
                    <option value="golden-ratio">Golden Ratio</option>
                    <option value="none">None</option>
                </select>
            </div>
            {S.sep()}
            <button
                className={`opts-btn${opts.straighten ? ' active' : ''}`}
                onClick={() => update({ straighten: !opts.straighten })}
                title="Click to enable; then drag a line in the canvas to straighten">
                Straighten
            </button>
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" checked={opts.deleteCroppedPixels}
                    onChange={e => update({ deleteCroppedPixels: e.target.checked })}
                    style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Delete Cropped Pixels
            </label>
        </>
    );
}

function EyedropperOptions() {
    const [, force] = useState(0);
    const opts = getEyedropperOptions();
    const update = (next: Parameters<typeof setEyedropperOptions>[0]) => {
        setEyedropperOptions(next);
        force(t => t + 1);
    };
    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Sample Size:')}
                <select
                    data-testid="eyedropper-sample-size"
                    className="opts-input"
                    style={{ width: 130 }}
                    value={opts.sampleSize}
                    onChange={e => update({ sampleSize: Number(e.target.value) as SampleSize })}
                >
                    <option value={1}>Point Sample</option>
                    <option value={3}>3 by 3 Average</option>
                    <option value={5}>5 by 5 Average</option>
                    <option value={11}>11 by 11 Average</option>
                    <option value={31}>31 by 31 Average</option>
                    <option value={51}>51 by 51 Average</option>
                    <option value={101}>101 by 101 Average</option>
                </select>
            </div>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Sample:')}
                <select
                    data-testid="eyedropper-sample-source"
                    className="opts-input"
                    style={{ width: 120 }}
                    value={opts.sample}
                    onChange={e => update({ sample: e.target.value as EyedropperSample })}
                >
                    <option value="current-layer">Current Layer</option>
                    <option value="all-layers">All Layers</option>
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

function RulerOptions() {
    const [, force] = useState(0);
    const measurement = getRulerMeasurement();
    const refresh = () => force(t => t + 1);
    return (
        <>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" disabled style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Use Measurement Scale
            </label>
            {S.sep()}
            <button
                data-testid="ruler-straighten-layer"
                className="opts-btn"
                onClick={() => { straightenRulerMeasurement(); refresh(); }}
            >
                Straighten Layer
            </button>
            <button
                data-testid="ruler-clear"
                className="opts-btn"
                disabled={!measurement}
                onClick={() => { clearRulerMeasurement(); refresh(); }}
            >
                Clear
            </button>
        </>
    );
}

const symmetryOptions: { value: PaintSymmetryMode; label: string }[] = [
    { value: 'none', label: 'Symmetry Off' },
    { value: 'vertical', label: 'Vertical' },
    { value: 'horizontal', label: 'Horizontal' },
    { value: 'dual-axis', label: 'Dual Axis' },
    { value: 'diagonal', label: 'Diagonal' },
    { value: 'wavy', label: 'Wavy' },
    { value: 'circle', label: 'Circle' },
    { value: 'spiral', label: 'Spiral' },
    { value: 'parallel-lines', label: 'Parallel Lines' },
    { value: 'radial', label: 'Radial' },
    { value: 'mandala', label: 'Mandala' },
];

function PaintSymmetryControl() {
    const paintSymmetry = useEditorStore(s => s.paintSymmetry);
    const setPaintSymmetryMode = useEditorStore(s => s.setPaintSymmetryMode);
    const setPaintSymmetryVisible = useEditorStore(s => s.setPaintSymmetryVisible);
    const setPaintSymmetrySegments = useEditorStore(s => s.setPaintSymmetrySegments);
    const commitPaintSymmetryPath = useEditorStore(s => s.commitPaintSymmetryPath);
    const hasSegments = paintSymmetry.mode === 'radial' || paintSymmetry.mode === 'mandala';
    return (
        <>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Symmetry:')}
                <select
                    data-testid="paint-symmetry-menu"
                    className="opts-input"
                    title="Paint Symmetry"
                    style={{ width: 118 }}
                    value={paintSymmetry.mode}
                    onChange={e => setPaintSymmetryMode(e.target.value as PaintSymmetryMode)}
                >
                    {symmetryOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                    {paintSymmetry.lastMode && <option value={paintSymmetry.lastMode}>Last Used Symmetry</option>}
                </select>
            </div>
            {hasSegments && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {S.label('Segments:')}
                    <input
                        data-testid="paint-symmetry-segments"
                        className="opts-input"
                        type="number"
                        min={2}
                        max={paintSymmetry.mode === 'mandala' ? 10 : 12}
                        value={paintSymmetry.segments}
                        onChange={e => setPaintSymmetrySegments(Number(e.target.value))}
                        style={{ width: 46 }}
                    />
                </div>
            )}
            {paintSymmetry.mode !== 'none' && (
                <>
                    <button
                        data-testid="paint-symmetry-commit"
                        className="opts-btn"
                        disabled={!paintSymmetry.pending}
                        onClick={commitPaintSymmetryPath}
                    >
                        OK
                    </button>
                    <button
                        data-testid="paint-symmetry-visibility"
                        className="opts-btn"
                        onClick={() => setPaintSymmetryVisible(!paintSymmetry.visible)}
                    >
                        {paintSymmetry.visible ? 'Hide Symmetry' : 'Show Symmetry'}
                    </button>
                </>
            )}
        </>
    );
}

function BrushOptions() {
    const [, force] = useState(0);
    const opts = getBrushOptions();
    const { layers, activeLayerId } = useEditorStore();
    const activeLayer = layers.find(l => l.id === activeLayerId);
    const update = (next: Parameters<typeof setBrushOptions>[0]) => { setBrushOptions(next); force(t => t + 1); };
    const clearDisabled = !!activeLayer?.isBackground;
    return (
        <>
            <BrushModeDropdown
                value={(opts.mode === 'clear' || opts.mode === 'multiply') ? opts.mode : 'source-over'}
                clearDisabled={clearDisabled}
                onChange={mode => {
                    if (mode === 'clear' && clearDisabled) return;
                    update({ mode });
                }}
            />
            <BrushControls showFlow />
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Smoothing:')}
                <input type="range" min={0} max={100} value={Math.round(opts.smoothing * 100)}
                    onChange={e => update({ smoothing: +e.target.value / 100 })}
                    style={{ width: 60, accentColor: 'hsl(var(--accent-primary))' }} />
                <span className="opts-label" style={{ minWidth: 30 }}>{Math.round(opts.smoothing * 100)}%</span>
            </div>
            <PaintSymmetryControl />
        </>
    );
}

function PencilOptions() {
    const [, force] = useState(0);
    const opts = getPencilOptions();
    const update = (next: Parameters<typeof setPencilOptions>[0]) => { setPencilOptions(next); force(t => t + 1); };
    return (
        <>
            <ModeDropdown />
            <BrushControls showFlow={false} />
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Spacing:')}
                <input type="range" min={1} max={300} value={Math.round(opts.spacing * 100)}
                    onChange={e => update({ spacing: +e.target.value / 100 })}
                    style={{ width: 60, accentColor: 'hsl(var(--accent-primary))' }} />
                <span className="opts-label" style={{ minWidth: 36 }}>{Math.round(opts.spacing * 100)}%</span>
            </div>
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" checked={opts.pressureSize}
                    onChange={e => update({ pressureSize: e.target.checked })}
                    style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Pressure for Size
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" checked={opts.pressureOpacity}
                    onChange={e => update({ pressureOpacity: e.target.checked })}
                    style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Pressure for Opacity
            </label>
            <PaintSymmetryControl />
        </>
    );
}

function EraserOptions() {
    const [, force] = useState(0);
    const opts = getEraserOptions();
    const update = (next: Parameters<typeof setEraserOptions>[0]) => { setEraserOptions(next); force(t => t + 1); };
    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Mode:')}
                <select className="opts-input" style={{ width: 70 }} value={opts.mode}
                    onChange={e => update({ mode: e.target.value as EraserMode })}>
                    <option value="brush">Brush</option>
                    <option value="pencil">Pencil</option>
                    <option value="block">Block</option>
                </select>
            </div>
            <BrushControls showFlow={false} />
            <PaintSymmetryControl />
        </>
    );
}

function MagicEraserOptions() {
    const [, force] = useState(0);
    const opts = getMagicEraserOptions();
    const update = (next: Parameters<typeof setMagicEraserOptions>[0]) => { setMagicEraserOptions(next); force(t => t + 1); };
    return (
        <>
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
                Sample All Layers
            </label>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Opacity:')}
                <input type="number" min={0} max={100}
                    value={Math.round(opts.opacity * 100)}
                    onChange={e => update({ opacity: Math.max(0, Math.min(100, +e.target.value)) / 100 })}
                    className="opts-input" style={{ width: 40 }} />
                <span className="opts-label">%</span>
            </div>
        </>
    );
}

function BackgroundEraserOptions() {
    const [, force] = useState(0);
    const opts = getBackgroundEraserOptions();
    const update = (next: Parameters<typeof setBackgroundEraserOptions>[0]) => { setBackgroundEraserOptions(next); force(t => t + 1); };
    return (
        <>
            <BrushControls showFlow={false} />
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Sampling:')}
                <select className="opts-input" style={{ width: 130 }} value={opts.sampling}
                    onChange={e => update({ sampling: e.target.value as BackgroundEraserSampling })}>
                    <option value="continuous">Continuous</option>
                    <option value="once">Once</option>
                    <option value="background-swatch">Background Swatch</option>
                </select>
            </div>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Limits:')}
                <select className="opts-input" style={{ width: 130 }} value={opts.limits}
                    onChange={e => update({ limits: e.target.value as BackgroundEraserLimits })}>
                    <option value="contiguous">Contiguous</option>
                    <option value="discontiguous">Discontiguous</option>
                    <option value="find-edges">Find Edges</option>
                </select>
            </div>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Tolerance:')}
                <input type="number" min={0} max={100}
                    value={Math.round((opts.tolerance / 255) * 100)}
                    onChange={e => update({ tolerance: Math.max(0, Math.min(100, +e.target.value)) * 255 / 100 })}
                    className="opts-input" style={{ width: 42 }} />
                <span className="opts-label">%</span>
            </div>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Opacity:')}
                <input type="number" min={0} max={100}
                    value={Math.round(opts.opacity * 100)}
                    onChange={e => update({ opacity: Math.max(0, Math.min(100, +e.target.value)) / 100 })}
                    className="opts-input" style={{ width: 42 }} />
                <span className="opts-label">%</span>
            </div>
        </>
    );
}

function SpotHealingOptionsPanel() {
    const [, force] = useState(0);
    const opts = getSpotHealingOptions();
    const update = (next: Parameters<typeof setSpotHealingOptions>[0]) => { setSpotHealingOptions(next); force(t => t + 1); };
    const TYPES: { id: SpotHealingType; label: string; disabled?: boolean; title?: string }[] = [
        { id: 'content-aware', label: 'Content-Aware', disabled: true, title: 'Content-Aware healing is not available in photoweb' },
        { id: 'create-texture', label: 'Create Texture', disabled: true, title: 'Create Texture healing is not available in photoweb' },
        { id: 'proximity-match', label: 'Proximity Match' },
    ];
    return (
        <>
            <ModeDropdown value={opts.mode} onChange={v => update({ mode: v })} />
            <BrushControls showFlow={false} />
            {S.sep()}
            {S.label('Type:')}
            <div style={{ display: 'flex', gap: 1 }}>
                {TYPES.map(t => (
                    <button
                        key={t.id}
                        className={`opts-btn${opts.type === t.id ? ' active' : ''}`}
                        onClick={() => { if (!t.disabled) update({ type: t.id }); }}
                        disabled={t.disabled}
                        title={t.title ?? t.label}
                        style={t.disabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
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

function HealingBrushOptionsPanel() {
    const [, force] = useState(0);
    const opts = getHealingBrushOptions();
    const update = (next: Parameters<typeof setHealingBrushOptions>[0]) => { setHealingBrushOptions(next); force(t => t + 1); };
    return (
        <>
            <ModeDropdown value={opts.mode} onChange={v => update({ mode: v })} />
            <BrushControls showFlow={false} />
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Source:')}
                <select
                    className="opts-input"
                    style={{ width: 84 }}
                    value={opts.source}
                    onChange={e => update({ source: e.target.value as 'sampled' | 'pattern' })}
                    title="Sampled = Alt-click sets source; Pattern = use the active pattern"
                >
                    <option value="sampled">Sampled</option>
                    <option value="pattern">Pattern</option>
                </select>
            </div>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Diffusion:')}
                <input
                    type="number" min={1} max={7}
                    value={opts.diffusion}
                    onChange={e => update({ diffusion: Math.max(1, Math.min(7, Math.round(Number(e.target.value) || 5))) })}
                    className="opts-input"
                    style={{ width: 36 }}
                    title="Diffusion 1-7: lower = sharper edge, higher = softer blend"
                />
            </div>
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" checked={opts.aligned}
                    onChange={e => update({ aligned: e.target.checked })}
                    style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Aligned
            </label>
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" checked={opts.sampleAllLayers}
                    onChange={e => update({ sampleAllLayers: e.target.checked })}
                    style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Sample All Layers
            </label>
            {S.sep()}
            <button className="opts-btn" title="Clear sampled healing source"
                onClick={() => { resetHealingBrushSource(); force(t => t + 1); }}>
                Reset Source
            </button>
            {S.sep()}
            <span className="opts-label">Alt/Option-click to sample</span>
        </>
    );
}

function PatchOptionsPanel() {
    const [, force] = useState(0);
    const opts = getPatchOptions();
    const update = (next: Parameters<typeof setPatchOptions>[0]) => { setPatchOptions(next); force(t => t + 1); };
    const MODES: { id: PatchMode; label: string }[] = [
        { id: 'source', label: 'Source' },
        { id: 'destination', label: 'Destination' },
    ];
    return (
        <>
            {S.label('Patch:')}
            <div style={{ display: 'flex', gap: 1 }}>
                {MODES.map(m => (
                    <button
                        key={m.id}
                        className={`opts-btn${opts.mode === m.id ? ' active' : ''}`}
                        onClick={() => update({ mode: m.id })}
                        title={m.label}
                    >
                        {m.label}
                    </button>
                ))}
            </div>
            {S.sep()}
            <span className="opts-label">Make a selection, then drag</span>
        </>
    );
}

function RedEyeOptionsPanel() {
    const [, force] = useState(0);
    const opts = getRedEyeOptions();
    const update = (next: Parameters<typeof setRedEyeOptions>[0]) => { setRedEyeOptions(next); force(t => t + 1); };
    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Pupil Size:')}
                <input type="range" min={0} max={100} value={opts.pupilSize}
                    onChange={e => update({ pupilSize: +e.target.value })}
                    style={{ width: 80, accentColor: 'hsl(var(--accent-primary))' }} />
                <span className="opts-label" style={{ minWidth: 30 }}>{opts.pupilSize}%</span>
            </div>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Darken Amount:')}
                <input type="range" min={0} max={100} value={opts.darkenAmount}
                    onChange={e => update({ darkenAmount: +e.target.value })}
                    style={{ width: 80, accentColor: 'hsl(var(--accent-primary))' }} />
                <span className="opts-label" style={{ minWidth: 30 }}>{opts.darkenAmount}%</span>
            </div>
        </>
    );
}

function CloneStampOptions() {
    const setCloneSource = useEditorStore(s => s.setCloneSource);
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
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" checked={opts.showOverlay}
                    onChange={e => update({ showOverlay: e.target.checked })}
                    style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Show Overlay
            </label>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Overlay:')}
                <input type="range" min={0} max={100} value={Math.round(opts.overlayOpacity * 100)}
                    onChange={e => update({ overlayOpacity: +e.target.value / 100 })}
                    style={{ width: 60, accentColor: 'hsl(var(--accent-primary))' }} />
                <span className="opts-label" style={{ minWidth: 30 }}>{Math.round(opts.overlayOpacity * 100)}%</span>
            </div>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Scale:')}
                <input type="range" min={10} max={400} value={Math.round(opts.sourceScale * 100)}
                    onChange={e => update({ sourceScale: +e.target.value / 100 })}
                    style={{ width: 60, accentColor: 'hsl(var(--accent-primary))' }} />
                <span className="opts-label" style={{ minWidth: 36 }}>{Math.round(opts.sourceScale * 100)}%</span>
            </div>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Angle:')}
                <input type="range" min={-180} max={180} value={Math.round((opts.sourceRotation * 180) / Math.PI)}
                    onChange={e => update({ sourceRotation: (+e.target.value * Math.PI) / 180 })}
                    style={{ width: 60, accentColor: 'hsl(var(--accent-primary))' }} />
                <span className="opts-label" style={{ minWidth: 36 }}>{Math.round((opts.sourceRotation * 180) / Math.PI)}°</span>
            </div>
            {S.sep()}
            <button className="opts-btn" title="Clear sampled clone source"
                onClick={() => resetCloneSource({ setCloneSource })}>
                Reset Source
            </button>
            {S.sep()}
            <span className="opts-label">Alt/Option-click to sample</span>
        </>
    );
}

function interpolateOpacityAt(stops: { position: number; opacity: number }[], t: number): number {
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

function GradientOptions() {
    // Subscribe to a tick so external setGradientOptions calls propagate; we still
    // read latest options imperatively to avoid extra store wiring for tool-local state.
    const [, force] = useState(0);
    const [editorOpen, setEditorOpen] = useState(false);
    const opts = getGradientOptions();
    const presets = getGradientPresets();
    const update = (next: Partial<ReturnType<typeof getGradientOptions>>) => { setGradientOptions(next); force(t => t + 1); };
    const primaryColor = useEditorStore(s => s.primaryColor);
    const secondaryColor = useEditorStore(s => s.secondaryColor);
    const preset = presets.find(p => p.id === opts.presetId) ?? presets[0];

    const initialEditorStops = (() => {
        if (opts.stops && opts.stops.length > 0) {
            return {
                colors: opts.stops.map(s => ({ position: s.position, color: s.color, midpointToNext: s.midpointToNext })),
                opacities: opts.opacityStops && opts.opacityStops.length > 0
                    ? opts.opacityStops.map(s => ({ ...s }))
                    : opts.stops.map(s => ({ position: s.position, opacity: s.opacity, midpointToNext: s.midpointToNext })),
            };
        }
        return {
            colors: preset.stops.map((s, i, arr) => ({
                position: s.position,
                color: preset.id === 'foreground-to-background'
                    ? (i === 0 ? primaryColor : i === arr.length - 1 ? secondaryColor : s.color)
                    : preset.id === 'foreground-to-transparent'
                        ? primaryColor
                        : s.color,
            })),
            opacities: preset.stops.map(s => ({ position: s.position, opacity: s.opacity })),
        };
    })();

    const onEditorConfirm = (result: GradientEditorResult) => {
        const merged: GradientStop[] = result.colorStops.map(cs => ({
            position: cs.position,
            color: cs.color,
            opacity: result.opacityStops.length > 0
                ? interpolateOpacityAt(result.opacityStops, cs.position)
                : 1,
            midpointToNext: cs.midpointToNext,
        }));
        setGradientOptions({
            stops: merged,
            opacityStops: result.opacityStops.map(stop => ({ ...stop })),
            smoothness: result.smoothness,
        });
        force(t => t + 1);
    };
    // Build a CSS preview of the current gradient using FG/BG-substituted stops.
    const rawPreviewStops = opts.stops && opts.stops.length > 0
        ? opts.stops
        : preset.stops.map((s, i, arr) => ({
            ...s,
            color: preset.id === 'foreground-to-background'
                ? (i === 0 ? primaryColor : i === arr.length - 1 ? secondaryColor : s.color)
                : preset.id === 'foreground-to-transparent'
                    ? primaryColor
                    : s.color,
        }));
    const previewStops = rawPreviewStops.map((s) => {
        const c = s.color;
        const r = parseInt(c.slice(1, 3), 16); const g = parseInt(c.slice(3, 5), 16); const b = parseInt(c.slice(5, 7), 16);
        const pos = opts.reverse ? 1 - s.position : s.position;
        const alpha = opts.opacityStops && opts.opacityStops.length > 0
            ? interpolateOpacityAt(opts.opacityStops, s.position)
            : s.opacity;
        return { pos: pos * 100, css: `rgba(${r},${g},${b},${alpha})` };
    }).sort((a, b) => a.pos - b.pos);
    const previewCss = `linear-gradient(to right, ${previewStops.map(s => `${s.css} ${s.pos}%`).join(', ')})`;

    const TYPE_BTNS: { type: GradientType; Icon: typeof GradientLinearIcon; title: string }[] = [
        { type: 'linear',    Icon: GradientLinearIcon, title: 'Linear Gradient' },
        { type: 'radial',    Icon: GradientRadialIcon, title: 'Radial Gradient' },
        { type: 'angle',     Icon: GradientAngleIcon, title: 'Angle Gradient' },
        { type: 'reflected', Icon: GradientReflectedIcon, title: 'Reflected Gradient' },
        { type: 'diamond',   Icon: GradientDiamondIcon, title: 'Diamond Gradient' },
    ];

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Gradient Mode:')}
                <select
                    className="opts-input"
                    data-testid="gradient-mode-select"
                    style={{ width: 104 }}
                    value={opts.gradientMode}
                    onChange={e => update({ gradientMode: e.target.value as GradientMode })}
                    title="Gradient Mode"
                >
                    <option value="gradient">Gradient</option>
                    <option value="classic">Classic Gradient</option>
                </select>
            </div>
            {S.sep()}
            <select
                className="opts-input"
                data-testid="gradient-preset-select"
                style={{ width: 90 }}
                title="Gradient preset"
                value={opts.presetId}
                onChange={e => update({ presetId: e.target.value, stops: undefined, opacityStops: undefined, smoothness: undefined })}
            >
                {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div data-testid="gradient-preview" style={{ width: 120, height: 20, background: previewCss, border: '1px solid hsl(var(--border-light))', borderRadius: 2 }} title="Gradient preview" />
            <button
                className="opts-btn"
                title="Click to Edit Gradient"
                data-testid="gradient-edit-open"
                onClick={() => setEditorOpen(true)}
                style={{ fontSize: 11, padding: '2px 6px' }}
            >Edit</button>
            {S.sep()}
            {TYPE_BTNS.map(({ type, Icon, title }) => (
                <button
                    key={type}
                    className={`opts-btn${opts.type === type ? ' active' : ''}`}
                    title={title}
                    onClick={() => update({ type })}
                >
                    <Icon size={13} />
                </button>
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
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input type="checkbox" checked={opts.transparency}
                    onChange={e => update({ transparency: e.target.checked })}
                    style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                Transparency
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
            <GradientEditorDialog
                isOpen={editorOpen}
                initialColorStops={initialEditorStops.colors}
                initialOpacityStops={initialEditorStops.opacities}
                initialSmoothness={opts.smoothness ?? 100}
                onClose={() => setEditorOpen(false)}
                onConfirm={onEditorConfirm}
            />
        </>
    );
}

function PaintBucketOptions() {
    const [, force] = useState(0);
    const opts = getPaintBucketOptions();
    const patternPresets = useEditorStore(s => s.patternPresets);
    const activePatternId = useEditorStore(s => s.activePatternId);
    const setActivePatternId = useEditorStore(s => s.setActivePatternId);
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
            {opts.source === 'pattern' && (
                <>
                    {S.sep()}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {S.label('Pattern:')}
                        <select
                            className="opts-input" style={{ width: 120 }}
                            value={activePatternId ?? ''}
                            onChange={e => setActivePatternId(e.target.value || null)}
                        >
                            <option value="">None (FG/BG check)</option>
                            {patternPresets.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                </>
            )}
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
    const { brushSettings, setBrushSize, setBrushFlow } = useEditorStore();
    const [, force] = useState(0);
    if (tool === 'sponge') {
        const opts = getSpongeOptions();
        const update = (next: Parameters<typeof setSpongeOptions>[0]) => { setSpongeOptions(next); force(t => t + 1); };
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
                    {S.label('Mode:')}
                    <select className="opts-input" style={{ width: 90 }} value={opts.mode}
                        onChange={e => update({ mode: e.target.value as SpongeMode })}>
                        <option value="desaturate">Desaturate</option>
                        <option value="saturate">Saturate</option>
                    </select>
                </div>
                {S.sep()}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {S.label('Flow:')}
                    <input type="range" min={1} max={100} value={Math.round(brushSettings.flow * 100)}
                        onChange={e => setBrushFlow(+e.target.value / 100)}
                        style={{ width: 60, accentColor: 'hsl(var(--accent-primary))' }} />
                    <span className="opts-label" style={{ minWidth: 30 }}>{Math.round(brushSettings.flow * 100)}%</span>
                </div>
                {S.sep()}
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                    <input type="checkbox" checked={opts.vibrance}
                        onChange={e => update({ vibrance: e.target.checked })}
                        style={{ accentColor: 'hsl(var(--accent-primary))' }} />
                    Vibrance
                </label>
            </>
        );
    }
    const opts = tool === 'dodge' ? getDodgeOptions() : getBurnOptions();
    const apply = tool === 'dodge' ? setDodgeOptions : setBurnOptions;
    const update = (next: Parameters<typeof apply>[0]) => { apply(next); force(t => t + 1); };
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
                <select className="opts-input" style={{ width: 90 }} value={opts.range}
                    onChange={e => update({ range: e.target.value as ToneRange })}>
                    <option value="midtones">Midtones</option>
                    <option value="shadows">Shadows</option>
                    <option value="highlights">Highlights</option>
                </select>
            </div>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Exposure:')}
                <input type="range" min={0} max={100} value={Math.round(opts.exposure * 100)}
                    onChange={e => update({ exposure: +e.target.value / 100 })}
                    style={{ width: 60, accentColor: 'hsl(var(--accent-primary))' }} />
                <span className="opts-label" style={{ minWidth: 30 }}>{Math.round(opts.exposure * 100)}%</span>
            </div>
        </>
    );
}

function PenOptions() {
    const [, force] = useState(0);
    const opts = getPenOptions();
    const update = (next: Parameters<typeof setPenOptions>[0]) => { setPenOptions(next); force(t => t + 1); };
    const modes: { id: PenMode; label: string }[] = [
        { id: 'path', label: 'Path' },
        { id: 'shape', label: 'Shape' },
        { id: 'pixels', label: 'Pixels' },
    ];
    return (
        <>
            <div style={{ display: 'flex', gap: 1 }}>
                {modes.map(m => (
                    <button
                        key={m.id}
                        className={`opts-btn${opts.mode === m.id ? ' active' : ''}`}
                        onClick={() => update({ mode: m.id })}
                        title={`${m.label} mode`}
                    >
                        {m.label}
                    </button>
                ))}
            </div>
            {S.sep()}
            <ShapeOperationButtons />
            {opts.mode === 'pixels' && (
                <>
                    {S.sep()}
                    <span className="opts-label">Pixels: stroke uses brush size + primary color</span>
                </>
            )}
            {opts.mode === 'shape' && (
                <>
                    {S.sep()}
                    <span className="opts-label">Shape: fills with primary color</span>
                </>
            )}
            {S.sep()}
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input
                    type="checkbox"
                    checked={opts.autoAddDelete}
                    onChange={e => update({ autoAddDelete: e.target.checked })}
                    style={{ accentColor: 'hsl(var(--accent-primary))' }}
                />
                Auto Add/Delete
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--text-label))' }}>
                <input
                    type="checkbox"
                    checked={opts.rubberBand}
                    onChange={e => update({ rubberBand: e.target.checked })}
                    style={{ accentColor: 'hsl(var(--accent-primary))' }}
                />
                Rubber Band
            </label>
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
            <button className="opts-btn" title="Create Warp Text"><WarpTextIcon size={13} /></button>
            <button className="opts-btn" title="Toggle Character/Paragraph Panels"><Layers size={13} /></button>
        </>
    );
}

function CustomShapePresetPicker() {
    const [, force] = useState(0);
    const opts = getShapeOptions();
    const library = getCustomShapeLibrary();
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {S.label('Shape:')}
            <div
                data-testid="custom-shape-picker"
                style={{
                    display: 'flex',
                    gap: 2,
                    padding: 2,
                    background: 'hsl(var(--bg-input))',
                    border: '1px solid hsl(var(--border-light))',
                    borderRadius: 2,
                    maxWidth: 280,
                    overflowX: 'auto',
                }}
            >
                {library.map(s => (
                    <button
                        key={s.id}
                        data-testid={`custom-shape-preset-${s.id}`}
                        className={`opts-btn${opts.customShapeId === s.id ? ' active' : ''}`}
                        title={s.name}
                        onClick={() => { setShapeOptions({ customShapeId: s.id }); force(t => t + 1); }}
                        style={{ padding: 2, width: 26, height: 26 }}
                    >
                        <svg viewBox={`0 0 ${CUSTOM_SHAPE_VIEWBOX} ${CUSTOM_SHAPE_VIEWBOX}`} width={20} height={20}>
                            <path d={s.pathD} fill="currentColor" fillRule="evenodd" />
                        </svg>
                    </button>
                ))}
            </div>
        </div>
    );
}

function ShapeOptions({ showPresets = false }: { showPresets?: boolean } = {}) {
    const [, force] = useState(0);
    const opts = getShapeOptions();
    const update = (next: Parameters<typeof setShapeOptions>[0]) => { setShapeOptions(next); force(t => t + 1); };
    const fillSwatch = (
        <label style={{ display: 'inline-block', position: 'relative', cursor: 'pointer' }}>
            <span style={{
                display: 'inline-block', width: 20, height: 20,
                backgroundColor: opts.fill ?? '#fff',
                backgroundImage: opts.fill === null
                    ? 'linear-gradient(45deg, transparent 45%, red 47%, red 53%, transparent 55%)'
                    : undefined,
                border: '1px solid hsl(var(--border-light))',
            }} />
            <input
                type="color"
                value={opts.fill ?? '#000000'}
                onChange={e => update({ fill: e.target.value })}
                style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                title={opts.fill === null ? 'No fill' : `Fill: ${opts.fill}`}
            />
        </label>
    );
    const strokeSwatch = (
        <label style={{ display: 'inline-block', position: 'relative', cursor: 'pointer' }}>
            <span style={{
                display: 'inline-block', width: 20, height: 20,
                backgroundColor: opts.stroke ?? '#fff',
                backgroundImage: opts.stroke === null
                    ? 'linear-gradient(45deg, transparent 45%, red 47%, red 53%, transparent 55%)'
                    : undefined,
                border: '1px solid hsl(var(--border-light))',
            }} />
            <input
                type="color"
                value={opts.stroke ?? '#000000'}
                onChange={e => update({ stroke: e.target.value })}
                style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                title={opts.stroke === null ? 'No stroke' : `Stroke: ${opts.stroke}`}
            />
        </label>
    );
    return (
        <>
            <div style={{ display: 'flex', gap: 1 }}>
                {(['shape', 'path', 'pixels'] as const).map(m => (
                    <button
                        key={m}
                        className={`opts-btn${opts.mode === m ? ' active' : ''}`}
                        onClick={() => update({ mode: m })}
                    >{m === 'shape' ? 'Shape' : m === 'path' ? 'Path' : 'Pixels'}</button>
                ))}
            </div>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Fill:')}
                {fillSwatch}
                <button
                    className="opts-btn"
                    title={opts.fill === null ? 'Set fill (black)' : 'Clear fill (no color)'}
                    onClick={() => update({ fill: opts.fill === null ? '#000000' : null })}
                    style={{ width: 22, height: 22, padding: 0 }}
                >{opts.fill === null ? '+' : '×'}</button>
            </div>
            {S.sep()}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {S.label('Stroke:')}
                {strokeSwatch}
                <button
                    className="opts-btn"
                    title={opts.stroke === null ? 'Set stroke (black)' : 'Clear stroke (no color)'}
                    onClick={() => update({ stroke: opts.stroke === null ? '#000000' : null })}
                    style={{ width: 22, height: 22, padding: 0 }}
                >{opts.stroke === null ? '+' : '×'}</button>
            </div>
            <input
                type="number"
                min={0}
                max={100}
                value={opts.strokeWidth}
                onChange={e => update({ strokeWidth: Math.max(0, parseFloat(e.target.value) || 0) })}
                className="opts-input"
                style={{ width: 44 }}
                title="Stroke width (px)"
            />
            <span className="opts-label">px</span>
            {showPresets && (
                <>
                    {S.sep()}
                    <CustomShapePresetPicker />
                </>
            )}
        </>
    );
}

function PathSelectionOptions() {
    return (
        <>
            <ShapeOperationButtons shortTitles />
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
        'eraser': 'Eraser', 'magic-eraser': 'Magic Eraser', 'background-eraser': 'Background Eraser',
        'spot-healing': 'Spot Healing Brush', 'healing-brush': 'Healing Brush',
        'patch': 'Patch', 'red-eye': 'Red Eye', 'clone-stamp': 'Clone Stamp',
        'gradient': 'Gradient', 'fill': 'Paint Bucket',
        'dodge': 'Dodge', 'burn': 'Burn', 'sponge': 'Sponge',
        'marquee-rect': 'Rectangular Marquee', 'marquee-ellipse': 'Elliptical Marquee',
        'select': 'Marquee', 'lasso': 'Lasso', 'lasso-poly': 'Polygonal Lasso', 'magnetic-lasso': 'Magnetic Lasso',
        'magic-wand': 'Magic Wand', 'quick-selection': 'Quick Selection', 'object-selection': 'Object Selection',
        'crop': 'Crop', 'perspective-crop': 'Perspective Crop', 'eyedropper': 'Eyedropper', 'ruler': 'Ruler',
        'pen': 'Pen', 'curvature-pen': 'Curvature Pen', 'freeform-pen': 'Freeform Pen',
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
            case 'lasso': return <LassoOptions mode="free" />;
            case 'lasso-poly': return <LassoOptions mode="poly" />;
            case 'magnetic-lasso': return <LassoOptions mode="magnetic" />;
            case 'magic-wand': return <MagicWandOptions />;
            case 'quick-selection': return <QuickSelOptions />;
            case 'object-selection': return <ObjectSelectionOptionsPanel />;
            case 'crop': return <CropOptions />;
            case 'perspective-crop': return <CropOptions />;
            case 'eyedropper': return <EyedropperOptions />;
            case 'ruler': return <RulerOptions />;
            case 'brush': return <BrushOptions />;
            case 'pencil': return <PencilOptions />;
            case 'eraser': return <EraserOptions />;
            case 'magic-eraser': return <MagicEraserOptions />;
            case 'background-eraser': return <BackgroundEraserOptions />;
            case 'spot-healing': return <SpotHealingOptionsPanel />;
            case 'healing-brush': return <HealingBrushOptionsPanel />;
            case 'patch': return <PatchOptionsPanel />;
            case 'red-eye': return <RedEyeOptionsPanel />;
            case 'clone-stamp': return <CloneStampOptions />;
            case 'gradient': return <GradientOptions />;
            case 'fill': return <PaintBucketOptions />;
            case 'dodge': return <DodgeBurnOptions tool="dodge" />;
            case 'burn': return <DodgeBurnOptions tool="burn" />;
            case 'sponge': return <DodgeBurnOptions tool="sponge" />;
            case 'pen':
            case 'curvature-pen':
            case 'freeform-pen': return <PenOptions />;
            case 'type-horizontal':
            case 'type-vertical': return <TypeOptions />;
            case 'path-selection':
            case 'direct-selection': return <PathSelectionOptions />;
            case 'shape-rectangle':
            case 'shape-rounded-rectangle':
            case 'shape-ellipse':
            case 'shape-polygon':
            case 'shape-line': return <ShapeOptions />;
            case 'shape-custom': return <ShapeOptions showPresets />;
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
