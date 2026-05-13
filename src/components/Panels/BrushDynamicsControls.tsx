import { useState } from 'react';
import type { ReactNode } from 'react';
import {
    getBrushDynamicsOptions,
    setBrushDynamicsOptions,
    type BrushDynamicsControl,
    type BrushDynamicsOptions,
    type BrushDynamicsOptionsPatch,
} from '../../utils/brushDynamics';

type DynamicsSection = keyof BrushDynamicsOptions;

const SECTION_LABELS: Record<DynamicsSection, string> = {
    shape: 'Shape Dynamics',
    scattering: 'Scattering',
    texture: 'Texture',
    dualBrush: 'Dual Brush',
    colorDynamics: 'Color Dynamics',
    otherDynamics: 'Other Dynamics',
};

const CONTROL_OPTIONS: { value: BrushDynamicsControl; label: string }[] = [
    { value: 'off', label: 'Off' },
    { value: 'fade', label: 'Fade' },
    { value: 'pen-pressure', label: 'Pen Pressure' },
    { value: 'pen-tilt', label: 'Pen Tilt' },
    { value: 'stylus-wheel', label: 'Stylus Wheel' },
    { value: 'direction', label: 'Direction' },
    { value: 'initial-direction', label: 'Initial Direction' },
];

const baseInputStyle = {
    accentColor: 'hsl(var(--accent-primary))',
};

function percent(value: number): string {
    return `${Math.round(value * 100)}%`;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label style={{ display: 'grid', gridTemplateColumns: '92px 1fr 42px', gap: 6, alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: 'hsl(var(--text-muted))' }}>{label}</span>
            {children}
        </label>
    );
}

function Slider({
    value,
    min = 0,
    max = 1,
    step = 0.01,
    testId,
    onChange,
    display = percent,
}: {
    value: number;
    min?: number;
    max?: number;
    step?: number;
    testId: string;
    onChange: (value: number) => void;
    display?: (value: number) => string;
}) {
    return (
        <>
            <input
                data-testid={testId}
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={e => onChange(Number(e.target.value))}
                style={baseInputStyle}
            />
            <span style={{ textAlign: 'right', color: 'hsl(var(--text-main))', fontVariantNumeric: 'tabular-nums' }}>{display(value)}</span>
        </>
    );
}

function Select<T extends string>({
    value,
    testId,
    options,
    onChange,
}: {
    value: T;
    testId: string;
    options: { value: T; label: string }[];
    onChange: (value: T) => void;
}) {
    return (
        <>
            <select
                data-testid={testId}
                value={value}
                onChange={e => onChange(e.target.value as T)}
                style={{
                    gridColumn: '2 / span 2',
                    background: 'hsl(var(--bg-input))',
                    border: '1px solid hsl(var(--border-light))',
                    color: 'hsl(var(--text-main))',
                    fontSize: 11,
                    padding: '2px 4px',
                }}
            >
                {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
        </>
    );
}

export function BrushDynamicsControls() {
    const [options, setOptions] = useState(getBrushDynamicsOptions);
    const [selected, setSelected] = useState<DynamicsSection>('shape');

    const patch = <K extends DynamicsSection>(section: K, value: Partial<BrushDynamicsOptions[K]>) => {
        setOptions(setBrushDynamicsOptions({ [section]: value } as BrushDynamicsOptionsPatch));
    };

    const section = options[selected] as { enabled: boolean };

    return (
        <div data-testid="brush-dynamics-controls" style={{ display: 'grid', gridTemplateColumns: '132px 1fr', minHeight: 0, height: '100%' }}>
            <div style={{ borderRight: '1px solid hsl(var(--border-light))', padding: 4 }}>
                {(Object.keys(SECTION_LABELS) as DynamicsSection[]).map(key => {
                    const enabled = (options[key] as { enabled: boolean }).enabled;
                    return (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                            <input
                                data-testid={`brush-dynamics-${key}-enabled`}
                                type="checkbox"
                                checked={enabled}
                                onChange={e => patch(key, { enabled: e.target.checked } as Partial<BrushDynamicsOptions[typeof key]>)}
                                style={baseInputStyle}
                            />
                            <button
                                data-testid={`brush-dynamics-${key}-tab`}
                                onClick={() => setSelected(key)}
                                style={{
                                    flex: 1,
                                    textAlign: 'left',
                                    background: selected === key ? 'hsl(var(--bg-input))' : 'transparent',
                                    border: 'none',
                                    color: enabled ? 'hsl(var(--text-main))' : 'hsl(var(--text-muted))',
                                    cursor: 'pointer',
                                    fontSize: 11,
                                    padding: '3px 4px',
                                }}
                            >
                                {SECTION_LABELS[key]}
                            </button>
                        </div>
                    );
                })}
            </div>
            <div style={{ padding: 8, overflowY: 'auto', color: 'hsl(var(--text-main))' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <strong>{SECTION_LABELS[selected]}</strong>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'hsl(var(--text-muted))' }}>
                        <input
                            data-testid="brush-dynamics-current-enabled"
                            type="checkbox"
                            checked={section.enabled}
                            onChange={e => patch(selected, { enabled: e.target.checked } as Partial<BrushDynamicsOptions[typeof selected]>)}
                            style={baseInputStyle}
                        />
                        Enable
                    </label>
                </div>

                {selected === 'shape' && (
                    <>
                        <Row label="Size Jitter"><Slider testId="brush-shape-size-jitter" value={options.shape.sizeJitter} onChange={value => patch('shape', { sizeJitter: value })} /></Row>
                        <Row label="Min Diameter"><Slider testId="brush-shape-min-diameter" value={options.shape.minDiameter} onChange={value => patch('shape', { minDiameter: value })} /></Row>
                        <Row label="Size Control"><Select testId="brush-shape-size-control" value={options.shape.sizeControl} options={CONTROL_OPTIONS} onChange={value => patch('shape', { sizeControl: value })} /></Row>
                        <Row label="Size Fade"><Slider testId="brush-shape-size-fade" value={options.shape.sizeFadeSteps} min={1} max={100} step={1} display={value => String(value)} onChange={value => patch('shape', { sizeFadeSteps: value })} /></Row>
                        <Row label="Angle Jitter"><Slider testId="brush-shape-angle-jitter" value={options.shape.angleJitter} onChange={value => patch('shape', { angleJitter: value })} /></Row>
                        <Row label="Angle Control"><Select testId="brush-shape-angle-control" value={options.shape.angleControl} options={CONTROL_OPTIONS} onChange={value => patch('shape', { angleControl: value })} /></Row>
                        <Row label="Round Jitter"><Slider testId="brush-shape-roundness-jitter" value={options.shape.roundnessJitter} onChange={value => patch('shape', { roundnessJitter: value })} /></Row>
                        <Row label="Min Round"><Slider testId="brush-shape-min-roundness" value={options.shape.minRoundness} onChange={value => patch('shape', { minRoundness: value })} /></Row>
                    </>
                )}

                {selected === 'scattering' && (
                    <>
                        <Row label="Scatter"><Slider testId="brush-scatter-amount" value={options.scattering.scatter} min={0} max={5} step={0.05} display={value => `${Math.round(value * 100)}%`} onChange={value => patch('scattering', { scatter: value })} /></Row>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0 8px 98px' }}>
                            <input data-testid="brush-scatter-both-axes" type="checkbox" checked={options.scattering.bothAxes} onChange={e => patch('scattering', { bothAxes: e.target.checked })} style={baseInputStyle} />
                            Both Axes
                        </label>
                        <Row label="Count"><Slider testId="brush-scatter-count" value={options.scattering.count} min={1} max={8} step={1} display={value => String(value)} onChange={value => patch('scattering', { count: value })} /></Row>
                        <Row label="Count Jitter"><Slider testId="brush-scatter-count-jitter" value={options.scattering.countJitter} onChange={value => patch('scattering', { countJitter: value })} /></Row>
                        <Row label="Control"><Select testId="brush-scatter-control" value={options.scattering.control} options={CONTROL_OPTIONS} onChange={value => patch('scattering', { control: value })} /></Row>
                    </>
                )}

                {selected === 'texture' && (
                    <>
                        <Row label="Pattern"><Select testId="brush-texture-pattern" value={options.texture.pattern} options={[{ value: 'checker', label: 'Checker' }, { value: 'dots', label: 'Dots' }, { value: 'paper', label: 'Paper' }]} onChange={value => patch('texture', { pattern: value })} /></Row>
                        <Row label="Mode"><Select testId="brush-texture-mode" value={options.texture.mode} options={[{ value: 'multiply', label: 'Multiply' }, { value: 'subtract', label: 'Subtract' }]} onChange={value => patch('texture', { mode: value })} /></Row>
                        <Row label="Scale"><Slider testId="brush-texture-scale" value={options.texture.scale} min={4} max={80} step={1} display={value => `${value}px`} onChange={value => patch('texture', { scale: value })} /></Row>
                        <Row label="Depth"><Slider testId="brush-texture-depth" value={options.texture.depth} onChange={value => patch('texture', { depth: value })} /></Row>
                        <Row label="Min Depth"><Slider testId="brush-texture-min-depth" value={options.texture.minDepth} onChange={value => patch('texture', { minDepth: value })} /></Row>
                        <Row label="Depth Jitter"><Slider testId="brush-texture-depth-jitter" value={options.texture.depthJitter} onChange={value => patch('texture', { depthJitter: value })} /></Row>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0 0 98px' }}>
                            <input data-testid="brush-texture-each-tip" type="checkbox" checked={options.texture.textureEachTip} onChange={e => patch('texture', { textureEachTip: e.target.checked })} style={baseInputStyle} />
                            Texture Each Tip
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0 0 98px' }}>
                            <input data-testid="brush-texture-invert" type="checkbox" checked={options.texture.invert} onChange={e => patch('texture', { invert: e.target.checked })} style={baseInputStyle} />
                            Invert
                        </label>
                    </>
                )}

                {selected === 'dualBrush' && (
                    <>
                        <Row label="Diameter"><Slider testId="brush-dual-diameter" value={options.dualBrush.diameter} min={2} max={80} step={1} display={value => `${value}px`} onChange={value => patch('dualBrush', { diameter: value })} /></Row>
                        <Row label="Spacing"><Slider testId="brush-dual-spacing" value={options.dualBrush.spacing} min={0.05} max={2} step={0.05} display={percent} onChange={value => patch('dualBrush', { spacing: value })} /></Row>
                        <Row label="Scatter"><Slider testId="brush-dual-scatter" value={options.dualBrush.scatter} min={0} max={5} step={0.05} display={value => `${Math.round(value * 100)}%`} onChange={value => patch('dualBrush', { scatter: value })} /></Row>
                        <Row label="Count"><Slider testId="brush-dual-count" value={options.dualBrush.count} min={1} max={8} step={1} display={value => String(value)} onChange={value => patch('dualBrush', { count: value })} /></Row>
                        <Row label="Mode"><Select testId="brush-dual-mode" value={options.dualBrush.mode} options={[{ value: 'multiply', label: 'Multiply' }, { value: 'overlay', label: 'Overlay' }, { value: 'hard-mix', label: 'Hard Mix' }]} onChange={value => patch('dualBrush', { mode: value })} /></Row>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0 0 98px' }}>
                            <input data-testid="brush-dual-flip" type="checkbox" checked={options.dualBrush.flip} onChange={e => patch('dualBrush', { flip: e.target.checked })} style={baseInputStyle} />
                            Flip
                        </label>
                    </>
                )}

                {selected === 'colorDynamics' && (
                    <>
                        <Row label="Fg/Bg Jitter"><Slider testId="brush-color-fg-bg-jitter" value={options.colorDynamics.foregroundBackgroundJitter} onChange={value => patch('colorDynamics', { foregroundBackgroundJitter: value })} /></Row>
                        <Row label="Control"><Select testId="brush-color-control" value={options.colorDynamics.control} options={CONTROL_OPTIONS} onChange={value => patch('colorDynamics', { control: value })} /></Row>
                        <Row label="Fade"><Slider testId="brush-color-fade" value={options.colorDynamics.fadeSteps} min={1} max={100} step={1} display={value => String(value)} onChange={value => patch('colorDynamics', { fadeSteps: value })} /></Row>
                        <Row label="Hue Jitter"><Slider testId="brush-color-hue-jitter" value={options.colorDynamics.hueJitter} onChange={value => patch('colorDynamics', { hueJitter: value })} /></Row>
                        <Row label="Sat Jitter"><Slider testId="brush-color-saturation-jitter" value={options.colorDynamics.saturationJitter} onChange={value => patch('colorDynamics', { saturationJitter: value })} /></Row>
                        <Row label="Bright Jitter"><Slider testId="brush-color-brightness-jitter" value={options.colorDynamics.brightnessJitter} onChange={value => patch('colorDynamics', { brightnessJitter: value })} /></Row>
                        <Row label="Purity"><Slider testId="brush-color-purity" value={options.colorDynamics.purity} min={-1} max={1} step={0.01} onChange={value => patch('colorDynamics', { purity: value })} /></Row>
                    </>
                )}

                {selected === 'otherDynamics' && (
                    <>
                        <Row label="Opacity Jitter"><Slider testId="brush-other-opacity-jitter" value={options.otherDynamics.opacityJitter} onChange={value => patch('otherDynamics', { opacityJitter: value })} /></Row>
                        <Row label="Opacity Ctrl"><Select testId="brush-other-opacity-control" value={options.otherDynamics.opacityControl} options={CONTROL_OPTIONS} onChange={value => patch('otherDynamics', { opacityControl: value })} /></Row>
                        <Row label="Opacity Fade"><Slider testId="brush-other-opacity-fade" value={options.otherDynamics.opacityFadeSteps} min={1} max={100} step={1} display={value => String(value)} onChange={value => patch('otherDynamics', { opacityFadeSteps: value })} /></Row>
                        <Row label="Flow Jitter"><Slider testId="brush-other-flow-jitter" value={options.otherDynamics.flowJitter} onChange={value => patch('otherDynamics', { flowJitter: value })} /></Row>
                        <Row label="Flow Ctrl"><Select testId="brush-other-flow-control" value={options.otherDynamics.flowControl} options={CONTROL_OPTIONS} onChange={value => patch('otherDynamics', { flowControl: value })} /></Row>
                        <Row label="Flow Fade"><Slider testId="brush-other-flow-fade" value={options.otherDynamics.flowFadeSteps} min={1} max={100} step={1} display={value => String(value)} onChange={value => patch('otherDynamics', { flowFadeSteps: value })} /></Row>
                    </>
                )}
            </div>
        </div>
    );
}
