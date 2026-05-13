import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { RESAMPLE_METHOD_LABELS, type ResampleMethod } from '../../core/imageTransforms';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import { evaluateNumericExpression } from '../../utils/numericExpression';

type SizeUnit = 'pixels' | 'percent' | 'inches' | 'centimeters' | 'millimeters';

interface ImageSizeDialogProps {
    isOpen: boolean;
    currentWidth: number;
    currentHeight: number;
    currentResolution: number;
    onConfirm: (w: number, h: number, resolution: number, method: ResampleMethod, resample: boolean) => void;
    onClose: () => void;
}

const METHOD_ORDER: ResampleMethod[] = [
    'automatic',
    'preserve-details',
    'preserve-details-2',
    'bicubic-smoother',
    'bicubic-sharper',
    'bicubic',
    'nearest',
    'bilinear',
];

const UNIT_LABELS: Record<SizeUnit, string> = {
    pixels: 'Pixels',
    percent: 'Percent',
    inches: 'Inches',
    centimeters: 'Centimeters',
    millimeters: 'Millimeters',
};

const UNIT_ORDER: SizeUnit[] = ['pixels', 'percent', 'inches', 'centimeters', 'millimeters'];

const FIT_PRESETS = [
    { id: 'original', label: 'Original Size', kind: 'original' as const },
    { id: '960x640', label: '960 x 640 px 144 ppi', kind: 'pixels' as const, width: 960, height: 640, resolution: 144 },
    { id: '1024x768', label: '1024 x 768 px 72 ppi', kind: 'pixels' as const, width: 1024, height: 768, resolution: 72 },
    { id: '1136x640', label: '1136 x 640 px 144 ppi', kind: 'pixels' as const, width: 1136, height: 640, resolution: 144 },
    { id: '1366x768', label: '1366 x 768 px 72 ppi', kind: 'pixels' as const, width: 1366, height: 768, resolution: 72 },
    { id: '4x6', label: '4 x 6 in 300 ppi', kind: 'inches' as const, width: 4, height: 6, resolution: 300 },
    { id: '5x7', label: '5 x 7 in 300 ppi', kind: 'inches' as const, width: 5, height: 7, resolution: 300 },
    { id: '8x10', label: '8 x 10 in 300 ppi', kind: 'inches' as const, width: 8, height: 10, resolution: 300 },
    { id: '11x14', label: '11 x 14 in 300 ppi', kind: 'inches' as const, width: 11, height: 14, resolution: 300 },
];

function ChainLinkIcon({ linked }: { linked: boolean }) {
    const stroke = 'currentColor';
    if (linked) {
        return (
            <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden data-testid="chain-link-locked">
                <path d="M5 4 C3.5 4 2.5 5 2.5 6.5 C2.5 8 3.5 9 5 9 L6 9" stroke={stroke} strokeWidth={1.4} fill="none" strokeLinecap="round" />
                <path d="M9 5 L8 5 C9.5 5 10.5 6 10.5 7.5 C10.5 9 9.5 10 8 10 L7 10" stroke={stroke} strokeWidth={1.4} fill="none" strokeLinecap="round" />
                <path d="M6 7 L8 7" stroke={stroke} strokeWidth={1.4} strokeLinecap="round" />
            </svg>
        );
    }
    return (
        <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden data-testid="chain-link-broken">
            <path d="M5 4 C3.5 4 2.5 5 2.5 6.5 C2.5 8 3.5 9 5 9" stroke={stroke} strokeWidth={1.4} fill="none" strokeLinecap="round" />
            <path d="M9 5 C10.5 5 11.5 6 11.5 7.5 C11.5 9 10.5 10 9 10" stroke={stroke} strokeWidth={1.4} fill="none" strokeLinecap="round" />
            <path d="M5 7 L6 7 M8 7 L9 7" stroke={stroke} strokeWidth={1.4} strokeLinecap="round" />
        </svg>
    );
}

function unitToInches(value: number, unit: SizeUnit, baseInches: number): number {
    if (unit === 'inches') return value;
    if (unit === 'centimeters') return value / 2.54;
    if (unit === 'millimeters') return value / 25.4;
    if (unit === 'percent') return baseInches * (value / 100);
    return value;
}

function pixelsToUnit(px: number, unit: SizeUnit, resolution: number, originalPx: number, originalResolution: number): number {
    if (unit === 'pixels') return px;
    if (unit === 'percent') return (px / originalPx) * 100;
    const inches = px / resolution;
    if (unit === 'inches') return inches;
    if (unit === 'centimeters') return inches * 2.54;
    if (unit === 'millimeters') return inches * 25.4;
    return px / originalResolution;
}

function unitToPixels(value: number, unit: SizeUnit, resolution: number, originalPx: number): number {
    if (unit === 'pixels') return Math.round(value);
    if (unit === 'percent') return Math.round(originalPx * (value / 100));
    const inches = unitToInches(value, unit, originalPx / resolution);
    return Math.round(inches * resolution);
}

function formatNumber(value: number): string {
    if (!Number.isFinite(value)) return '';
    if (Math.abs(value - Math.round(value)) < 0.001) return String(Math.round(value));
    return value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

function formatSizeMB(width: number, height: number): string {
    const mb = (width * height * 3) / (1024 * 1024);
    if (mb >= 10) return `${mb.toFixed(1)}M`;
    return `${mb.toFixed(2)}M`;
}

function clampDimension(value: number): number {
    return Math.max(1, Math.round(value));
}

export function ImageSizeDialog({ isOpen, currentWidth, currentHeight, currentResolution, onConfirm, onClose }: ImageSizeDialogProps) {
    const safeResolution = Number.isFinite(currentResolution) && currentResolution > 0 ? currentResolution : 72;
    const [pixelW, setPixelW] = useState(currentWidth);
    const [pixelH, setPixelH] = useState(currentHeight);
    const [wText, setWText] = useState(String(currentWidth));
    const [hText, setHText] = useState(String(currentHeight));
    const [widthUnit, setWidthUnit] = useState<SizeUnit>('pixels');
    const [heightUnit, setHeightUnit] = useState<SizeUnit>('pixels');
    const [resolution, setResolution] = useState(safeResolution);
    const [resolutionText, setResolutionText] = useState(String(safeResolution));
    const [constrain, setConstrain] = useState(true);
    const [resample, setResample] = useState(true);
    const [method, setMethod] = useState<ResampleMethod>('automatic');
    const [fitTo, setFitTo] = useState('original');
    const dialogRef = useDialogA11y(isOpen, onClose);

    const aspect = currentWidth / currentHeight;
    const oldSize = useMemo(() => formatSizeMB(currentWidth, currentHeight), [currentWidth, currentHeight]);
    const newSize = useMemo(() => formatSizeMB(pixelW, pixelH), [pixelW, pixelH]);

    const displayWidth = (nextW = pixelW, unit = widthUnit, nextResolution = resolution) =>
        formatNumber(pixelsToUnit(nextW, unit, nextResolution, currentWidth, safeResolution));
    const displayHeight = (nextH = pixelH, unit = heightUnit, nextResolution = resolution) =>
        formatNumber(pixelsToUnit(nextH, unit, nextResolution, currentHeight, safeResolution));

    useEffect(() => {
        if (isOpen) {
            /* eslint-disable react-hooks/set-state-in-effect */
            setPixelW(currentWidth);
            setPixelH(currentHeight);
            setWText(String(currentWidth));
            setHText(String(currentHeight));
            setWidthUnit('pixels');
            setHeightUnit('pixels');
            setResolution(safeResolution);
            setResolutionText(formatNumber(safeResolution));
            setConstrain(true);
            setResample(true);
            setMethod('automatic');
            setFitTo('original');
            /* eslint-enable react-hooks/set-state-in-effect */
        }
    }, [isOpen, currentWidth, currentHeight, safeResolution]);

    if (!isOpen) return null;

    const valid = Number.isFinite(pixelW) && Number.isFinite(pixelH) && pixelW > 0 && pixelH > 0 && Number.isFinite(resolution) && resolution > 0;

    const setPixelsAndTexts = (nextW: number, nextH: number, nextResolution = resolution) => {
        const safeW = clampDimension(nextW);
        const safeH = clampDimension(nextH);
        setPixelW(safeW);
        setPixelH(safeH);
        setWText(displayWidth(safeW, widthUnit, nextResolution));
        setHText(displayHeight(safeH, heightUnit, nextResolution));
    };

    const commitWidth = (text: string) => {
        const value = evaluateNumericExpression(text);
        if (value === null || value <= 0) {
            setWText(displayWidth());
            return;
        }
        if (resample) {
            const nextW = clampDimension(unitToPixels(value, widthUnit, resolution, currentWidth));
            const nextH = constrain ? clampDimension(nextW / aspect) : pixelH;
            setFitTo('custom');
            setPixelsAndTexts(nextW, nextH);
            return;
        }
        const baseInches = currentWidth / safeResolution;
        const inches = unitToInches(value, widthUnit, baseInches);
        if (!Number.isFinite(inches) || inches <= 0) {
            setWText(displayWidth());
            return;
        }
        const nextResolution = currentWidth / inches;
        setFitTo('custom');
        setResolution(nextResolution);
        setResolutionText(formatNumber(nextResolution));
        setWText(displayWidth(currentWidth, widthUnit, nextResolution));
        setHText(displayHeight(currentHeight, heightUnit, nextResolution));
    };

    const commitHeight = (text: string) => {
        const value = evaluateNumericExpression(text);
        if (value === null || value <= 0) {
            setHText(displayHeight());
            return;
        }
        if (resample) {
            const nextH = clampDimension(unitToPixels(value, heightUnit, resolution, currentHeight));
            const nextW = constrain ? clampDimension(nextH * aspect) : pixelW;
            setFitTo('custom');
            setPixelsAndTexts(nextW, nextH);
            return;
        }
        const baseInches = currentHeight / safeResolution;
        const inches = unitToInches(value, heightUnit, baseInches);
        if (!Number.isFinite(inches) || inches <= 0) {
            setHText(displayHeight());
            return;
        }
        const nextResolution = currentHeight / inches;
        setFitTo('custom');
        setResolution(nextResolution);
        setResolutionText(formatNumber(nextResolution));
        setWText(displayWidth(currentWidth, widthUnit, nextResolution));
        setHText(displayHeight(currentHeight, heightUnit, nextResolution));
    };

    const commitResolution = (text: string) => {
        const value = evaluateNumericExpression(text);
        if (value === null || value <= 0) {
            setResolutionText(formatNumber(resolution));
            return;
        }
        const nextResolution = value;
        setResolution(nextResolution);
        setResolutionText(formatNumber(nextResolution));
        setFitTo('custom');
        if (resample) {
            const nextW = widthUnit === 'inches' || widthUnit === 'centimeters' || widthUnit === 'millimeters'
                ? clampDimension(unitToPixels(Number(wText), widthUnit, nextResolution, currentWidth))
                : pixelW;
            const nextH = heightUnit === 'inches' || heightUnit === 'centimeters' || heightUnit === 'millimeters'
                ? clampDimension(unitToPixels(Number(hText), heightUnit, nextResolution, currentHeight))
                : (constrain && nextW !== pixelW ? clampDimension(nextW / aspect) : pixelH);
            setPixelsAndTexts(nextW, nextH, nextResolution);
        } else {
            setWText(displayWidth(currentWidth, widthUnit, nextResolution));
            setHText(displayHeight(currentHeight, heightUnit, nextResolution));
        }
    };

    const changeWidthUnit = (unit: SizeUnit) => {
        const nextUnit = !resample && unit === 'pixels' ? 'inches' : unit;
        setWidthUnit(nextUnit);
        setWText(displayWidth(pixelW, nextUnit));
        if (constrain) {
            setHeightUnit(nextUnit);
            setHText(displayHeight(pixelH, nextUnit));
        }
    };

    const changeHeightUnit = (unit: SizeUnit) => {
        const nextUnit = !resample && unit === 'pixels' ? 'inches' : unit;
        setHeightUnit(nextUnit);
        setHText(displayHeight(pixelH, nextUnit));
    };

    const toggleResample = (checked: boolean) => {
        setResample(checked);
        setFitTo('custom');
        if (!checked) {
            const nextWidthUnit = widthUnit === 'pixels' ? 'inches' : widthUnit;
            const nextHeightUnit = heightUnit === 'pixels' ? nextWidthUnit : heightUnit;
            setPixelW(currentWidth);
            setPixelH(currentHeight);
            setWidthUnit(nextWidthUnit);
            setHeightUnit(nextHeightUnit);
            setWText(formatNumber(pixelsToUnit(currentWidth, nextWidthUnit, resolution, currentWidth, safeResolution)));
            setHText(formatNumber(pixelsToUnit(currentHeight, nextHeightUnit, resolution, currentHeight, safeResolution)));
        } else {
            setWidthUnit('pixels');
            setHeightUnit('pixels');
            setWText(String(currentWidth));
            setHText(String(currentHeight));
        }
    };

    const applyFitPreset = (id: string) => {
        const preset = FIT_PRESETS.find(p => p.id === id);
        if (!preset) return;
        setFitTo(id);
        if (preset.kind === 'original') {
            setResolution(safeResolution);
            setResolutionText(formatNumber(safeResolution));
            setResample(true);
            setWidthUnit('pixels');
            setHeightUnit('pixels');
            setPixelW(currentWidth);
            setPixelH(currentHeight);
            setWText(String(currentWidth));
            setHText(String(currentHeight));
            return;
        }
        const targetW = preset.kind === 'pixels' ? preset.width : preset.width * preset.resolution;
        const targetH = preset.kind === 'pixels' ? preset.height : preset.height * preset.resolution;
        const scale = Math.min(targetW / currentWidth, targetH / currentHeight);
        const nextW = clampDimension(currentWidth * scale);
        const nextH = clampDimension(currentHeight * scale);
        setResample(true);
        setResolution(preset.resolution);
        setResolutionText(formatNumber(preset.resolution));
        setWidthUnit(preset.kind === 'pixels' ? 'pixels' : 'inches');
        setHeightUnit(preset.kind === 'pixels' ? 'pixels' : 'inches');
        setPixelW(nextW);
        setPixelH(nextH);
        setWText(formatNumber(pixelsToUnit(nextW, preset.kind === 'pixels' ? 'pixels' : 'inches', preset.resolution, currentWidth, safeResolution)));
        setHText(formatNumber(pixelsToUnit(nextH, preset.kind === 'pixels' ? 'pixels' : 'inches', preset.resolution, currentHeight, safeResolution)));
    };

    const inputStyle: React.CSSProperties = {
        background: 'hsl(var(--bg-input))',
        border: '1px solid hsl(var(--border-light))',
        color: 'hsl(var(--text-main))',
        padding: '5px 7px',
        borderRadius: '3px',
        width: '82px',
        boxSizing: 'border-box',
        fontSize: '12px',
    };
    const selectStyle: React.CSSProperties = {
        background: 'hsl(var(--bg-input))',
        border: '1px solid hsl(var(--border-light))',
        color: 'hsl(var(--text-main))',
        padding: '5px 7px',
        borderRadius: '3px',
        fontSize: '12px',
    };
    const labelStyle: React.CSSProperties = { fontSize: '12px', color: 'hsl(var(--text-muted))', width: '76px', textAlign: 'right' };
    const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' };

    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }} onClick={onClose}>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="image-size-title" tabIndex={-1} style={{ width: '650px', background: 'hsl(var(--bg-panel))', border: '1px solid hsl(var(--border-light))', borderRadius: '8px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid hsl(var(--border-light))', background: 'hsl(var(--bg-header))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 id="image-size-title" style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'hsl(var(--text-main))' }}>Image Size</h3>
                    <button aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer', padding: '4px' }}><X size={16} /></button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '288px 1fr', gap: '18px', padding: '14px' }}>
                    <div data-testid="img-size-preview" style={{ height: '276px', border: '1px solid hsl(var(--border-light))', background: 'linear-gradient(135deg, #242424 25%, #2d2d2d 25%, #2d2d2d 50%, #242424 50%, #242424 75%, #2d2d2d 75%)', backgroundSize: '24px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--text-muted))', fontSize: '12px' }}>
                        <div style={{ width: '70%', aspectRatio: `${currentWidth} / ${currentHeight}`, maxHeight: '220px', background: 'linear-gradient(145deg, #6b6f62, #c8a08f 52%, #5b392e)', border: '1px solid rgba(255,255,255,0.22)', boxShadow: '0 0 0 1px rgba(0,0,0,0.45)' }} />
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', color: 'hsl(var(--text-main))', marginBottom: '8px' }} data-testid="img-size-memory">
                            Image Size: {newSize}{newSize !== oldSize ? ` (was ${oldSize})` : ''}
                        </div>
                        <div style={{ ...rowStyle, marginBottom: '10px' }}>
                            <span style={labelStyle}>Dimensions:</span>
                            <span data-testid="img-size-dimensions" style={{ color: 'hsl(var(--text-main))', fontSize: '12px' }}>{pixelW} px x {pixelH} px</span>
                        </div>
                        <div style={rowStyle}>
                            <span style={labelStyle}>Fit To:</span>
                            <select data-testid="img-size-fit-to" value={fitTo} onChange={e => applyFitPreset(e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                                {FIT_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                                <option value="custom">Custom</option>
                            </select>
                        </div>
                        <div style={rowStyle}>
                            <button
                                data-testid="img-size-constrain"
                                aria-pressed={constrain}
                                aria-label="Constrain Proportions"
                                title="Constrain Proportions"
                                onClick={() => setConstrain(c => !c)}
                                style={{
                                    width: 24,
                                    height: 24,
                                    marginLeft: '52px',
                                    background: constrain ? 'hsl(var(--accent-primary))' : 'hsl(var(--bg-input))',
                                    color: constrain ? '#fff' : 'hsl(var(--text-main))',
                                    border: '1px solid hsl(var(--border-light))',
                                    borderRadius: 3,
                                    cursor: 'pointer',
                                    padding: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <ChainLinkIcon linked={constrain} />
                            </button>
                            <span style={{ ...labelStyle, width: '45px' }}>Width:</span>
                            <input
                                data-testid="img-size-w"
                                type="text"
                                value={wText}
                                onChange={e => setWText(e.target.value)}
                                onBlur={e => commitWidth(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitWidth((e.target as HTMLInputElement).value); } }}
                                style={inputStyle}
                            />
                            <select data-testid="img-size-w-unit" value={widthUnit} onChange={e => changeWidthUnit(e.target.value as SizeUnit)} style={{ ...selectStyle, width: '116px' }}>
                                {UNIT_ORDER.map(unit => <option key={unit} value={unit} disabled={!resample && unit === 'pixels'}>{UNIT_LABELS[unit]}</option>)}
                            </select>
                        </div>
                        <div style={rowStyle}>
                            <span style={{ width: '83px' }} />
                            <span style={{ ...labelStyle, width: '45px' }}>Height:</span>
                            <input
                                data-testid="img-size-h"
                                type="text"
                                value={hText}
                                onChange={e => setHText(e.target.value)}
                                onBlur={e => commitHeight(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitHeight((e.target as HTMLInputElement).value); } }}
                                style={inputStyle}
                            />
                            <select data-testid="img-size-h-unit" value={heightUnit} onChange={e => changeHeightUnit(e.target.value as SizeUnit)} style={{ ...selectStyle, width: '116px' }}>
                                {UNIT_ORDER.map(unit => <option key={unit} value={unit} disabled={!resample && unit === 'pixels'}>{UNIT_LABELS[unit]}</option>)}
                            </select>
                        </div>
                        <div style={rowStyle}>
                            <span style={labelStyle}>Resolution:</span>
                            <input
                                data-testid="img-size-resolution"
                                type="text"
                                value={resolutionText}
                                onChange={e => setResolutionText(e.target.value)}
                                onBlur={e => commitResolution(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitResolution((e.target as HTMLInputElement).value); } }}
                                style={inputStyle}
                            />
                            <span style={{ ...selectStyle, width: '116px', boxSizing: 'border-box' }}>Pixels/Inch</span>
                        </div>
                        <div style={{ ...rowStyle, marginTop: '8px' }}>
                            <label style={{ fontSize: '12px', color: 'hsl(var(--text-main))', display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '69px' }}>
                                <input data-testid="img-size-resample-toggle" type="checkbox" checked={resample} onChange={e => toggleResample(e.target.checked)} />
                                Resample
                            </label>
                            <select data-testid="img-size-resample" value={method} disabled={!resample} onChange={e => setMethod(e.target.value as ResampleMethod)}
                                style={{ ...selectStyle, flex: 1, opacity: resample ? 1 : 0.6 }}>
                                {METHOD_ORDER.map(m => (
                                    <option key={m} value={m}>{RESAMPLE_METHOD_LABELS[m]}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                <div style={{ padding: '12px 14px', borderTop: '1px solid hsl(var(--border-light))', background: 'hsl(var(--bg-header))', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button data-testid="img-size-reset" onClick={() => applyFitPreset('original')} style={{ padding: '6px 34px', background: 'transparent', border: '1px solid hsl(var(--border-light))', color: 'hsl(var(--text-main))', borderRadius: '999px', cursor: 'pointer', fontSize: '12px', marginRight: 'auto' }}>Reset</button>
                    <button onClick={onClose} style={{ padding: '6px 34px', background: 'transparent', border: '1px solid hsl(var(--border-light))', color: 'hsl(var(--text-main))', borderRadius: '999px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                    <button data-testid="img-size-ok" disabled={!valid} onClick={() => { onConfirm(resample ? pixelW : currentWidth, resample ? pixelH : currentHeight, resolution, method, resample); onClose(); }}
                        style={{ padding: '6px 34px', background: valid ? 'hsl(var(--accent-primary))' : 'hsl(var(--bg-input))', color: 'white', border: '1px solid hsl(var(--border-light))', borderRadius: '999px', cursor: valid ? 'pointer' : 'default', fontSize: '12px', fontWeight: 500 }}>OK</button>
                </div>
            </div>
        </div>
    );
}
