import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Pipette } from 'lucide-react';
import { getAdjustment } from '../../adjustments';
import { buildSelectionMask, blendWithMask } from '../../filters/selectionMask';
import type { SelectionState } from '../../store/types';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import { useDialogEyedropper } from '../../hooks/useDialogEyedropper';
import { useEditorStore } from '../../store/editorStore';

interface AdjustmentDialogProps {
    isOpen: boolean;
    adjustmentId: string;
    sourceImage: ImageData | null;
    sourceScale?: number;
    selection: SelectionState;
    initialParams?: Record<string, unknown>;
    onConfirm: (params: Record<string, unknown>) => void;
    onClose: () => void;
}

const inputStyle: React.CSSProperties = {
    width: 72,
    background: 'hsl(var(--bg-input))',
    border: '1px solid hsl(var(--border-light))',
    borderRadius: 2,
    color: 'hsl(var(--text-main))',
    padding: '3px 5px',
    fontSize: 11,
};

function numberValue(params: Record<string, unknown>, key: string, fallback: number): number {
    const value = params[key];
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function stringValue(params: Record<string, unknown>, key: string, fallback: string): string {
    const value = params[key];
    return typeof value === 'string' ? value : fallback;
}

function booleanValue(params: Record<string, unknown>, key: string, fallback: boolean): boolean {
    const value = params[key];
    return typeof value === 'boolean' ? value : fallback;
}

function histogramBounds(image: ImageData | null, lowPercent = 0.005, highPercent = 0.995): { black: number; white: number } {
    if (!image) return { black: 0, white: 255 };
    const hist = new Uint32Array(256);
    let total = 0;
    for (let i = 0; i < image.data.length; i += 4) {
        if (image.data[i + 3] === 0) continue;
        const luma = Math.round(0.299 * image.data[i] + 0.587 * image.data[i + 1] + 0.114 * image.data[i + 2]);
        hist[luma]++;
        total++;
    }
    if (total === 0) return { black: 0, white: 255 };
    const lowTarget = total * lowPercent;
    const highTarget = total * highPercent;
    let sum = 0;
    let black = 0;
    for (let i = 0; i < 256; i++) {
        sum += hist[i];
        if (sum >= lowTarget) {
            black = i;
            break;
        }
    }
    sum = 0;
    let white = 255;
    for (let i = 0; i < 256; i++) {
        sum += hist[i];
        if (sum >= highTarget) {
            white = i;
            break;
        }
    }
    return white <= black ? { black: 0, white: 255 } : { black, white };
}

function SliderRow({
    label,
    value,
    min,
    max,
    step = 1,
    onChange,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (value: number) => void;
}) {
    return (
        <label style={{ display: 'grid', gridTemplateColumns: '96px 1fr 72px', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span>{label}</span>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={e => onChange(Number(e.target.value))}
                style={{ accentColor: 'hsl(var(--accent-primary))' }}
            />
            <input
                type="number"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={e => onChange(Number(e.target.value))}
                style={inputStyle}
            />
        </label>
    );
}

function SelectRow({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
}) {
    return (
        <label style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span>{label}</span>
            <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
                {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
        </label>
    );
}

function CheckboxRow({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
            <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
            <span>{label}</span>
        </label>
    );
}

function ColorRow({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <label style={{ display: 'grid', gridTemplateColumns: '96px 36px 1fr', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span>{label}</span>
            <input type="color" value={value} onChange={e => onChange(e.target.value)} style={{ width: 32, height: 24, padding: 0 }} />
            <input value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
        </label>
    );
}

function EyedropperButton({
    slot,
    armed,
    onActivate,
    title,
    testId,
}: {
    slot: string;
    armed: boolean;
    onActivate: () => void;
    title: string;
    testId?: string;
}) {
    return (
        <button
            type="button"
            data-testid={testId ?? `eyedropper-${slot}`}
            aria-label={title}
            title={title}
            onClick={(e) => { e.preventDefault(); onActivate(); }}
            style={{
                width: 24,
                height: 24,
                background: armed ? 'hsl(var(--accent-primary))' : 'transparent',
                border: '1px solid #777',
                borderRadius: 3,
                color: armed ? 'white' : '#e0e0e0',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
            }}
        >
            <Pipette size={14} />
        </button>
    );
}

function Histogram({ image }: { image: ImageData | null }) {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const width = 240;
        const height = 92;
        canvas.width = width;
        canvas.height = height;
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#2d2d2d';
        for (let x = 0; x <= width; x += width / 4) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        if (!image) return;
        const hist = new Uint32Array(256);
        let max = 0;
        for (let i = 0; i < image.data.length; i += 4) {
            if (image.data[i + 3] === 0) continue;
            const luma = Math.round(0.299 * image.data[i] + 0.587 * image.data[i + 1] + 0.114 * image.data[i + 2]);
            hist[luma]++;
            if (hist[luma] > max) max = hist[luma];
        }
        if (max === 0) return;
        ctx.fillStyle = '#b8c7d9';
        for (let i = 0; i < 256; i++) {
            const bar = Math.round((hist[i] / max) * (height - 8));
            const x = Math.floor((i / 256) * width);
            ctx.fillRect(x, height - bar, Math.max(1, Math.ceil(width / 256)), bar);
        }
    }, [image]);

    return <canvas ref={ref} style={{ width: '100%', height: 92, border: '1px solid hsl(var(--border-light))', borderRadius: 2, marginBottom: 10 }} />;
}

function normalizeCurve(points: unknown): { x: number; y: number }[] {
    if (!Array.isArray(points) || points.length === 0) return [{ x: 0, y: 0 }, { x: 255, y: 255 }];
    return points
        .map(point => {
            const p = point as { x?: unknown; y?: unknown };
            const x = Math.max(0, Math.min(255, Number(p.x)));
            const y = Math.max(0, Math.min(255, Number(p.y)));
            return { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 };
        })
        .sort((a, b) => a.x - b.x);
}

function CurveEditor({
    points,
    onChange,
}: {
    points: { x: number; y: number }[];
    onChange: (points: { x: number; y: number }[]) => void;
}) {
    const ref = useRef<HTMLCanvasElement>(null);
    const dragging = useRef<number | null>(null);
    const size = 220;

    const draw = useCallback(() => {
        const canvas = ref.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = size;
        canvas.height = size;
        ctx.fillStyle = '#101010';
        ctx.fillRect(0, 0, size, size);
        ctx.strokeStyle = '#303030';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const p = (i / 4) * size;
            ctx.beginPath();
            ctx.moveTo(p, 0);
            ctx.lineTo(p, size);
            ctx.moveTo(0, p);
            ctx.lineTo(size, p);
            ctx.stroke();
        }
        ctx.strokeStyle = '#555';
        ctx.beginPath();
        ctx.moveTo(0, size);
        ctx.lineTo(size, 0);
        ctx.stroke();

        const safe = normalizeCurve(points);
        const sampleCurve = (xValue: number): number => {
            if (xValue <= safe[0].x) return safe[0].y;
            if (xValue >= safe[safe.length - 1].x) return safe[safe.length - 1].y;
            for (let i = 0; i < safe.length - 1; i++) {
                if (xValue >= safe[i].x && xValue <= safe[i + 1].x) {
                    if (safe.length <= 2) {
                        const t = (xValue - safe[i].x) / Math.max(1, safe[i + 1].x - safe[i].x);
                        return safe[i].y + t * (safe[i + 1].y - safe[i].y);
                    }
                    const p0 = safe[Math.max(0, i - 1)];
                    const p1 = safe[i];
                    const p2 = safe[i + 1];
                    const p3 = safe[Math.min(safe.length - 1, i + 2)];
                    const t = (xValue - p1.x) / Math.max(1, p2.x - p1.x);
                    const t2 = t * t;
                    const t3 = t2 * t;
                    return Math.max(0, Math.min(255, 0.5 * (
                        (2 * p1.y)
                        + (-p0.y + p2.y) * t
                        + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2
                        + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
                    )));
                }
            }
            return xValue;
        };
        ctx.strokeStyle = '#d7ecff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let px = 0; px <= size; px++) {
            const xValue = (px / size) * 255;
            const y = size - (sampleCurve(xValue) / 255) * size;
            if (px === 0) ctx.moveTo(px, y);
            else ctx.lineTo(px, y);
        }
        ctx.stroke();

        ctx.fillStyle = '#fff';
        safe.forEach(point => {
            const x = (point.x / 255) * size;
            const y = size - (point.y / 255) * size;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
    }, [points]);

    useEffect(() => { draw(); }, [draw]);

    const updateAtEvent = (event: React.PointerEvent<HTMLCanvasElement>, explicitIndex?: number) => {
        const canvas = ref.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(255, ((event.clientX - rect.left) / rect.width) * 255));
        const y = Math.max(0, Math.min(255, (1 - ((event.clientY - rect.top) / rect.height)) * 255));
        const safe = normalizeCurve(points);
        const index = explicitIndex ?? dragging.current;
        if (index === null) return;
        safe[index] = {
            x: index === 0 ? 0 : index === safe.length - 1 ? 255 : Math.round(x),
            y: Math.round(y),
        };
        onChange(safe.sort((a, b) => a.x - b.x));
    };

    return (
        <div>
            <canvas
                ref={ref}
                onPointerDown={event => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const x = ((event.clientX - rect.left) / rect.width) * 255;
                    const y = (1 - ((event.clientY - rect.top) / rect.height)) * 255;
                    const safe = normalizeCurve(points);
                    let nearest = 0;
                    let nearestDistance = Infinity;
                    safe.forEach((point, index) => {
                        const distance = Math.hypot(point.x - x, point.y - y);
                        if (distance < nearestDistance) {
                            nearest = index;
                            nearestDistance = distance;
                        }
                    });
                    if (nearestDistance > 18) {
                        safe.push({ x: Math.round(x), y: Math.round(y) });
                        safe.sort((a, b) => a.x - b.x);
                        nearest = safe.findIndex(point => point.x === Math.round(x) && point.y === Math.round(y));
                        onChange(safe);
                    }
                    dragging.current = nearest;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    updateAtEvent(event, nearest);
                }}
                onPointerMove={event => updateAtEvent(event)}
                onPointerUp={event => {
                    dragging.current = null;
                    event.currentTarget.releasePointerCapture(event.pointerId);
                }}
                style={{ width: size, height: size, border: '1px solid hsl(var(--border-light))', borderRadius: 2, cursor: 'crosshair' }}
            />
            <button
                onClick={() => onChange([{ x: 0, y: 0 }, { x: 255, y: 255 }])}
                style={{ marginTop: 6, padding: '4px 8px', background: 'transparent', border: '1px solid hsl(var(--border-light))', color: 'hsl(var(--text-main))', borderRadius: 2, cursor: 'pointer', fontSize: 11 }}
            >
                Reset Curve
            </button>
        </div>
    );
}

export function AdjustmentDialog({
    isOpen,
    adjustmentId,
    sourceImage,
    sourceScale = 1,
    selection,
    initialParams,
    onConfirm,
    onClose,
}: AdjustmentDialogProps) {
    const adjustment = getAdjustment(adjustmentId);
    const [params, setParams] = useState<Record<string, unknown>>({});
    const previewRef = useRef<HTMLCanvasElement>(null);
    const [curveChannel, setCurveChannel] = useState<'rgb' | 'r' | 'g' | 'b'>('rgb');
    const dialogRef = useDialogA11y(isOpen, onClose);
    const [previewEnabled, setPreviewEnabled] = useState(true);
    const eyedropper = useDialogEyedropper({
        getActiveLayerCanvas: () => {
            const store = useEditorStore.getState();
            const layer = store.layers.find(l => l.id === store.activeLayerId);
            return layer?.canvas ?? null;
        },
    });

    const mergedParams = useMemo(() => ({
        ...(adjustment?.defaultParams ?? {}),
        ...(params ?? {}),
    }), [adjustment, params]);

    useEffect(() => {
        if (isOpen) {
            setParams({ ...(adjustment?.defaultParams ?? {}), ...(initialParams ?? {}) }); // eslint-disable-line react-hooks/set-state-in-effect
            setCurveChannel('rgb'); // eslint-disable-line react-hooks/set-state-in-effect
            setPreviewEnabled(true); // eslint-disable-line react-hooks/set-state-in-effect
        }
    }, [isOpen, adjustmentId]); // eslint-disable-line react-hooks/exhaustive-deps

    const setParam = (key: string, value: unknown) => {
        setParams(prev => ({ ...prev, [key]: value }));
    };

    const renderPreview = useCallback(() => {
        if (!adjustment || !sourceImage || !previewRef.current) return;
        const canvas = previewRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        if (!previewEnabled) {
            canvas.width = sourceImage.width;
            canvas.height = sourceImage.height;
            ctx.putImageData(sourceImage, 0, 0);
            return;
        }
        const adjusted = adjustment.apply(mergedParams, {
            image: sourceImage,
            width: sourceImage.width,
            height: sourceImage.height,
            selectionMask: null,
            dirtyRect: null,
        });
        const previewSelection = sourceScale === 1
            ? selection
            : {
                ...selection,
                path: selection.path.map(point => ({ x: point.x * sourceScale, y: point.y * sourceScale })),
                polyPoints: selection.polyPoints.map(point => ({ x: point.x * sourceScale, y: point.y * sourceScale })),
                operations: selection.operations.map(op => ({
                    ...op,
                    path: op.path.map(point => ({ x: point.x * sourceScale, y: point.y * sourceScale })),
                })),
            };
        const mask = buildSelectionMask(previewSelection, sourceImage.width, sourceImage.height);
        const preview = blendWithMask(sourceImage, adjusted, mask);
        canvas.width = preview.width;
        canvas.height = preview.height;
        ctx.putImageData(preview, 0, 0);
    }, [adjustment, mergedParams, previewEnabled, selection, sourceImage, sourceScale]);

    useEffect(() => {
        if (isOpen) renderPreview();
    }, [isOpen, renderPreview]);

    if (!isOpen || !adjustment) return null;

    const dialogWidth = adjustmentId === 'curves' ? 920 : adjustmentId === 'levels' ? 760 : 720;
    const autoParams = () => {
        const { black, white } = histogramBounds(sourceImage);
        if (adjustmentId === 'brightness-contrast') return { ...mergedParams, brightness: 0, contrast: 25, useLegacy: false };
        if (adjustmentId === 'levels') return { ...mergedParams, inputBlack: black, inputWhite: white, gamma: 1 };
        if (adjustmentId === 'curves') return {
            ...mergedParams,
            rgb: [{ x: 0, y: 0 }, { x: black, y: 0 }, { x: white, y: 255 }, { x: 255, y: 255 }],
        };
        if (adjustmentId === 'exposure') return { ...mergedParams, exposure: 0, offset: 0, gamma: 1 };
        return mergedParams;
    };
    const currentCurve = normalizeCurve(mergedParams[curveChannel]);
    const controls = (() => {
        switch (adjustmentId) {
            case 'brightness-contrast':
                return (
                    <>
                        <SliderRow label="Brightness" value={numberValue(mergedParams, 'brightness', 0)} min={-150} max={150} onChange={v => setParam('brightness', v)} />
                        <SliderRow label="Contrast" value={numberValue(mergedParams, 'contrast', 0)} min={-50} max={100} onChange={v => setParam('contrast', v)} />
                        <CheckboxRow label="Use Legacy" checked={booleanValue(mergedParams, 'useLegacy', false)} onChange={v => setParam('useLegacy', v)} />
                    </>
                );
            case 'levels':
                return (
                    <>
                        <Histogram image={sourceImage} />
                        <SelectRow label="Channel" value={stringValue(mergedParams, 'channel', 'rgb')} options={[
                            { value: 'rgb', label: 'RGB' },
                            { value: 'red', label: 'Red' },
                            { value: 'green', label: 'Green' },
                            { value: 'blue', label: 'Blue' },
                        ]} onChange={v => setParam('channel', v)} />
                        <SliderRow label="Input Black" value={numberValue(mergedParams, 'inputBlack', 0)} min={0} max={254} onChange={v => setParam('inputBlack', v)} />
                        <SliderRow label="Gamma" value={numberValue(mergedParams, 'gamma', 1)} min={0.1} max={9.99} step={0.01} onChange={v => setParam('gamma', v)} />
                        <SliderRow label="Input White" value={numberValue(mergedParams, 'inputWhite', 255)} min={1} max={255} onChange={v => setParam('inputWhite', v)} />
                        <SliderRow label="Output Black" value={numberValue(mergedParams, 'outputBlack', 0)} min={0} max={255} onChange={v => setParam('outputBlack', v)} />
                        <SliderRow label="Output White" value={numberValue(mergedParams, 'outputWhite', 255)} min={0} max={255} onChange={v => setParam('outputWhite', v)} />
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                            <EyedropperButton testId="eyedropper-levels-black" slot="levels-black" armed={eyedropper.armedSlot === 'levels-black'} title="Set Black Point" onActivate={() => eyedropper.activate('levels-black', (s) => setParam('inputBlack', s.luma))} />
                            <EyedropperButton testId="eyedropper-levels-gray" slot="levels-gray" armed={eyedropper.armedSlot === 'levels-gray'} title="Set Gray Point" onActivate={() => eyedropper.activate('levels-gray', (s) => {
                                const ib = numberValue(mergedParams, 'inputBlack', 0);
                                const iw = numberValue(mergedParams, 'inputWhite', 255);
                                const t = Math.max(1, iw - ib);
                                const normalized = Math.max(0.001, Math.min(0.999, (s.luma - ib) / t));
                                const gamma = Math.log(0.5) / Math.log(normalized);
                                setParam('gamma', Math.max(0.1, Math.min(9.99, gamma)));
                            })} />
                            <EyedropperButton testId="eyedropper-levels-white" slot="levels-white" armed={eyedropper.armedSlot === 'levels-white'} title="Set White Point" onActivate={() => eyedropper.activate('levels-white', (s) => setParam('inputWhite', Math.max(1, s.luma)))} />
                            <span style={{ color: '#c0c0c0', fontSize: 11, marginLeft: 4 }}>Sample Black / Gray / White Point</span>
                        </div>
                    </>
                );
            case 'curves':
                return (
                    <>
                        <Histogram image={sourceImage} />
                        <SelectRow label="Channel" value={curveChannel} options={[
                            { value: 'rgb', label: 'RGB' },
                            { value: 'r', label: 'Red' },
                            { value: 'g', label: 'Green' },
                            { value: 'b', label: 'Blue' },
                        ]} onChange={v => setCurveChannel(v as typeof curveChannel)} />
                        <CurveEditor points={currentCurve} onChange={points => setParam(curveChannel, points)} />
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
                            <EyedropperButton testId="eyedropper-curves-black" slot="curves-black" armed={eyedropper.armedSlot === 'curves-black'} title="Set Black Point" onActivate={() => eyedropper.activate('curves-black', (s) => {
                                const pts = normalizeCurve(mergedParams[curveChannel]);
                                pts[0] = { x: s.luma, y: 0 };
                                setParam(curveChannel, pts);
                            })} />
                            <EyedropperButton testId="eyedropper-curves-gray" slot="curves-gray" armed={eyedropper.armedSlot === 'curves-gray'} title="Set Gray Point" onActivate={() => eyedropper.activate('curves-gray', (s) => {
                                const pts = normalizeCurve(mergedParams[curveChannel]);
                                pts.push({ x: s.luma, y: 128 });
                                setParam(curveChannel, pts.sort((a, b) => a.x - b.x));
                            })} />
                            <EyedropperButton testId="eyedropper-curves-white" slot="curves-white" armed={eyedropper.armedSlot === 'curves-white'} title="Set White Point" onActivate={() => eyedropper.activate('curves-white', (s) => {
                                const pts = normalizeCurve(mergedParams[curveChannel]);
                                pts[pts.length - 1] = { x: s.luma, y: 255 };
                                setParam(curveChannel, pts);
                            })} />
                            <span style={{ color: '#c0c0c0', fontSize: 11, marginLeft: 4 }}>Sample Black / Gray / White Point</span>
                        </div>
                    </>
                );
            case 'exposure':
                return (
                    <>
                        <SliderRow label="Exposure" value={numberValue(mergedParams, 'exposure', 0)} min={-20} max={20} step={0.01} onChange={v => setParam('exposure', v)} />
                        <SliderRow label="Offset" value={numberValue(mergedParams, 'offset', 0)} min={-1} max={1} step={0.001} onChange={v => setParam('offset', v)} />
                        <SliderRow label="Gamma" value={numberValue(mergedParams, 'gamma', 1)} min={0.01} max={9.99} step={0.01} onChange={v => setParam('gamma', v)} />
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                            <EyedropperButton testId="eyedropper-exposure-black" slot="exposure-black" armed={eyedropper.armedSlot === 'exposure-black'} title="Set Black Point" onActivate={() => eyedropper.activate('exposure-black', (s) => setParam('offset', Math.max(-1, Math.min(1, -s.luma / 255))))} />
                            <EyedropperButton testId="eyedropper-exposure-gray" slot="exposure-gray" armed={eyedropper.armedSlot === 'exposure-gray'} title="Set Gray Point" onActivate={() => eyedropper.activate('exposure-gray', (s) => {
                                const normalized = Math.max(0.001, Math.min(0.999, s.luma / 255));
                                const gamma = Math.log(0.5) / Math.log(normalized);
                                setParam('gamma', Math.max(0.01, Math.min(9.99, gamma)));
                            })} />
                            <EyedropperButton testId="eyedropper-exposure-white" slot="exposure-white" armed={eyedropper.armedSlot === 'exposure-white'} title="Set White Point" onActivate={() => eyedropper.activate('exposure-white', (s) => {
                                const v = Math.max(1, s.luma) / 255;
                                const ev = Math.log2(1 / v);
                                setParam('exposure', Math.max(-20, Math.min(20, ev)));
                            })} />
                            <span style={{ color: '#c0c0c0', fontSize: 11, marginLeft: 4 }}>Sample Black / Gray / White Point</span>
                        </div>
                    </>
                );
            case 'vibrance':
                return (
                    <>
                        <SliderRow label="Vibrance" value={numberValue(mergedParams, 'vibrance', 0)} min={-100} max={100} onChange={v => setParam('vibrance', v)} />
                        <SliderRow label="Saturation" value={numberValue(mergedParams, 'saturation', 0)} min={-100} max={100} onChange={v => setParam('saturation', v)} />
                    </>
                );
            case 'hue-saturation':
                return (
                    <>
                        <SliderRow label="Hue" value={numberValue(mergedParams, 'hue', 0)} min={-180} max={180} onChange={v => setParam('hue', v)} />
                        <SliderRow label="Saturation" value={numberValue(mergedParams, 'saturation', 0)} min={-100} max={100} onChange={v => setParam('saturation', v)} />
                        <SliderRow label="Lightness" value={numberValue(mergedParams, 'lightness', 0)} min={-100} max={100} onChange={v => setParam('lightness', v)} />
                        <CheckboxRow label="Colorize" checked={booleanValue(mergedParams, 'colorize', false)} onChange={v => setParam('colorize', v)} />
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                            <EyedropperButton testId="eyedropper-huesat-range" slot="huesat-range" armed={eyedropper.armedSlot === 'huesat-range'} title="Sample range to edit" onActivate={() => eyedropper.activate('huesat-range', (s) => {
                                // Map sampled hue to one of the 6 chromatic ranges.
                                const max = Math.max(s.r, s.g, s.b);
                                const min = Math.min(s.r, s.g, s.b);
                                if (max === min) { setParam('range', 'master'); return; }
                                const d = max - min;
                                let h: number;
                                if (max === s.r) h = ((s.g - s.b) / d + (s.g < s.b ? 6 : 0));
                                else if (max === s.g) h = ((s.b - s.r) / d + 2);
                                else h = ((s.r - s.g) / d + 4);
                                h = (h * 60 + 360) % 360;
                                const range =
                                    h < 30 || h >= 330 ? 'reds'
                                    : h < 90 ? 'yellows'
                                    : h < 150 ? 'greens'
                                    : h < 210 ? 'cyans'
                                    : h < 270 ? 'blues'
                                    : 'magentas';
                                setParam('range', range);
                            })} />
                            <span style={{ color: '#c0c0c0', fontSize: 11, marginLeft: 4 }}>Sample range to edit</span>
                        </div>
                    </>
                );
            case 'color-balance':
                return (
                    <>
                        <SelectRow label="Tone" value={stringValue(mergedParams, 'range', 'midtones')} options={[
                            { value: 'shadows', label: 'Shadows' },
                            { value: 'midtones', label: 'Midtones' },
                            { value: 'highlights', label: 'Highlights' },
                        ]} onChange={v => setParam('range', v)} />
                        <SliderRow label="Cyan/Red" value={numberValue(mergedParams, 'cyanRed', 0)} min={-100} max={100} onChange={v => setParam('cyanRed', v)} />
                        <SliderRow label="Magenta/Green" value={numberValue(mergedParams, 'magentaGreen', 0)} min={-100} max={100} onChange={v => setParam('magentaGreen', v)} />
                        <SliderRow label="Yellow/Blue" value={numberValue(mergedParams, 'yellowBlue', 0)} min={-100} max={100} onChange={v => setParam('yellowBlue', v)} />
                        <CheckboxRow label="Preserve Luminosity" checked={booleanValue(mergedParams, 'preserveLuminosity', true)} onChange={v => setParam('preserveLuminosity', v)} />
                    </>
                );
            case 'black-and-white':
                return (
                    <>
                        {(['reds', 'yellows', 'greens', 'cyans', 'blues', 'magentas'] as const).map(key => (
                            <SliderRow key={key} label={key[0].toUpperCase() + key.slice(1)} value={numberValue(mergedParams, key, 40)} min={-200} max={300} onChange={v => setParam(key, v)} />
                        ))}
                        <CheckboxRow label="Tint" checked={booleanValue(mergedParams, 'tint', false)} onChange={v => setParam('tint', v)} />
                        <ColorRow label="Tint Color" value={stringValue(mergedParams, 'tintColor', '#ddc080')} onChange={v => setParam('tintColor', v)} />
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                            <EyedropperButton testId="eyedropper-bw-range" slot="bw-range" armed={eyedropper.armedSlot === 'bw-range'} title="Sample range to brighten/darken" onActivate={() => eyedropper.activate('bw-range', (s) => {
                                const max = Math.max(s.r, s.g, s.b);
                                const min = Math.min(s.r, s.g, s.b);
                                if (max === min) return;
                                const d = max - min;
                                let h: number;
                                if (max === s.r) h = ((s.g - s.b) / d + (s.g < s.b ? 6 : 0));
                                else if (max === s.g) h = ((s.b - s.r) / d + 2);
                                else h = ((s.r - s.g) / d + 4);
                                h = (h * 60 + 360) % 360;
                                const target =
                                    h < 30 || h >= 330 ? 'reds'
                                    : h < 90 ? 'yellows'
                                    : h < 150 ? 'greens'
                                    : h < 210 ? 'cyans'
                                    : h < 270 ? 'blues'
                                    : 'magentas';
                                const current = numberValue(mergedParams, target, 40);
                                setParam(target, Math.max(-200, Math.min(300, current + 25)));
                            })} />
                            <span style={{ color: '#c0c0c0', fontSize: 11, marginLeft: 4 }}>Sample range to brighten</span>
                        </div>
                    </>
                );
            case 'photo-filter':
                return (
                    <>
                        <ColorRow label="Filter Color" value={stringValue(mergedParams, 'color', '#ec8b5e')} onChange={v => setParam('color', v)} />
                        <SliderRow label="Density" value={numberValue(mergedParams, 'density', 25)} min={0} max={100} onChange={v => setParam('density', v)} />
                        <CheckboxRow label="Preserve Luminosity" checked={booleanValue(mergedParams, 'preserveLuminosity', true)} onChange={v => setParam('preserveLuminosity', v)} />
                    </>
                );
            case 'channel-mixer':
                return (
                    <>
                        <SelectRow label="Output" value={stringValue(mergedParams, 'output', 'red')} options={[
                            { value: 'red', label: 'Red' },
                            { value: 'green', label: 'Green' },
                            { value: 'blue', label: 'Blue' },
                        ]} onChange={v => setParam('output', v)} />
                        <SliderRow label="Red" value={numberValue(mergedParams, 'red', 100)} min={-200} max={200} onChange={v => setParam('red', v)} />
                        <SliderRow label="Green" value={numberValue(mergedParams, 'green', 0)} min={-200} max={200} onChange={v => setParam('green', v)} />
                        <SliderRow label="Blue" value={numberValue(mergedParams, 'blue', 0)} min={-200} max={200} onChange={v => setParam('blue', v)} />
                        <SliderRow label="Constant" value={numberValue(mergedParams, 'constant', 0)} min={-255} max={255} onChange={v => setParam('constant', v)} />
                        <CheckboxRow label="Monochrome" checked={booleanValue(mergedParams, 'monochrome', false)} onChange={v => setParam('monochrome', v)} />
                    </>
                );
            case 'selective-color':
                return (
                    <>
                        <SelectRow label="Colors" value={stringValue(mergedParams, 'range', 'reds')} options={[
                            { value: 'reds', label: 'Reds' },
                            { value: 'yellows', label: 'Yellows' },
                            { value: 'greens', label: 'Greens' },
                            { value: 'cyans', label: 'Cyans' },
                            { value: 'blues', label: 'Blues' },
                            { value: 'magentas', label: 'Magentas' },
                            { value: 'whites', label: 'Whites' },
                            { value: 'neutrals', label: 'Neutrals' },
                            { value: 'blacks', label: 'Blacks' },
                        ]} onChange={v => setParam('range', v)} />
                        <SliderRow label="Cyan" value={numberValue(mergedParams, 'cyan', 0)} min={-100} max={100} onChange={v => setParam('cyan', v)} />
                        <SliderRow label="Magenta" value={numberValue(mergedParams, 'magenta', 0)} min={-100} max={100} onChange={v => setParam('magenta', v)} />
                        <SliderRow label="Yellow" value={numberValue(mergedParams, 'yellow', 0)} min={-100} max={100} onChange={v => setParam('yellow', v)} />
                        <SliderRow label="Black" value={numberValue(mergedParams, 'black', 0)} min={-100} max={100} onChange={v => setParam('black', v)} />
                        <SelectRow label="Method" value={stringValue(mergedParams, 'method', 'relative')} options={[
                            { value: 'relative', label: 'Relative' },
                            { value: 'absolute', label: 'Absolute' },
                        ]} onChange={v => setParam('method', v)} />
                    </>
                );
            case 'posterize':
                return <SliderRow label="Levels" value={numberValue(mergedParams, 'levels', 4)} min={2} max={255} onChange={v => setParam('levels', v)} />;
            case 'threshold':
                return (
                    <>
                        <Histogram image={sourceImage} />
                        <SliderRow label="Threshold" value={numberValue(mergedParams, 'level', 128)} min={0} max={255} onChange={v => setParam('level', v)} />
                    </>
                );
            case 'gradient-map': {
                const stops = Array.isArray(mergedParams.stops) ? mergedParams.stops as { position: number; color: string }[] : [];
                const shadow = stops[0]?.color ?? '#000000';
                const highlight = stops[stops.length - 1]?.color ?? '#ffffff';
                const setStops = (nextShadow: string, nextHighlight: string) => setParam('stops', [
                    { position: 0, color: nextShadow },
                    { position: 1, color: nextHighlight },
                ]);
                return (
                    <>
                        <ColorRow label="Shadows" value={shadow} onChange={v => setStops(v, highlight)} />
                        <ColorRow label="Highlights" value={highlight} onChange={v => setStops(shadow, v)} />
                    </>
                );
            }
            default:
                return <span style={{ color: 'hsl(var(--text-muted))' }}>No configurable parameters.</span>;
        }
    })();

    return (
        <div
            data-testid="adjustment-dialog"
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: eyedropper.isArmed ? 'rgba(0,0,0,0)' : 'rgba(0, 0, 0, 0.62)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1100,
                backdropFilter: eyedropper.isArmed ? 'none' : 'blur(2px)',
                pointerEvents: eyedropper.isArmed ? 'none' : 'auto',
                cursor: eyedropper.isArmed ? 'crosshair' : undefined,
            }}
            onClick={onClose}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="adjustment-dialog-title"
                tabIndex={-1}
                style={{
                    width: dialogWidth,
                    maxHeight: '84vh',
                    background: 'linear-gradient(#565656, #4b4b4b)',
                    border: '1px solid #202020',
                    borderRadius: 14,
                    boxShadow: '0 18px 46px rgba(0,0,0,0.52), inset 0 1px rgba(255,255,255,0.18)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{
                    padding: '10px 16px',
                    borderBottom: '1px solid #242424',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'linear-gradient(#454545, #3b3b3b)',
                }}>
                    <div style={{ width: 24 }} />
                    <h3 id="adjustment-dialog-title" style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#e4e4e4', letterSpacing: 0.2 }}>
                        {adjustment.label}
                    </h3>
                    <button
                        aria-label="Close"
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 4 }}
                    >
                        <X size={16} />
                    </button>
                </div>

                <div style={{ display: 'flex', minHeight: adjustmentId === 'curves' ? 500 : 320, overflow: 'hidden', padding: 20, gap: 22 }}>
                    <div style={{
                        flex: 1,
                        minWidth: 0,
                        overflowY: 'auto',
                        color: '#efefef',
                        fontSize: 15,
                        fontWeight: 600,
                    }}>
                        {controls}
                    </div>
                    <div style={{ flex: '0 0 150px', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'stretch' }}>
                        <button
                            data-testid="adjustment-confirm"
                            onClick={() => {
                                onConfirm(mergedParams);
                                onClose();
                            }}
                            style={{ padding: '8px 16px', background: 'transparent', border: '2px solid #eeeeee', color: '#f7f7f7', borderRadius: 20, cursor: 'pointer', fontSize: 16, fontWeight: 700 }}
                        >
                            OK
                        </button>
                        <button
                            onClick={onClose}
                            style={{ padding: '8px 16px', background: 'transparent', border: '2px solid #777', color: '#f0f0f0', borderRadius: 20, cursor: 'pointer', fontSize: 16, fontWeight: 700 }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => setParams(autoParams())}
                            style={{ padding: '8px 16px', background: 'transparent', border: '2px solid #777', color: '#f0f0f0', borderRadius: 20, cursor: 'pointer', fontSize: 16, fontWeight: 700 }}
                        >
                            Auto
                        </button>
                        <CheckboxRow label="Preview" checked={previewEnabled} onChange={setPreviewEnabled} />
                        <div style={{ marginTop: 8, color: '#d8d8d8', fontSize: 11, fontWeight: 500 }}>
                            Preview sample
                        </div>
                        <div style={{ height: 96, background: '#171717', border: '1px solid #6a6a6a', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <canvas
                                ref={previewRef}
                                data-testid="adjustment-preview-canvas"
                                style={{ maxWidth: '100%', maxHeight: '100%', imageRendering: 'auto' }}
                            />
                            {!sourceImage && <span style={{ fontSize: 11, color: '#aaa' }}>Loading</span>}
                        </div>
                    </div>
                </div>

                <div style={{
                    padding: '8px 20px 14px',
                    borderTop: '1px solid #3d3d3d',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 8,
                    background: 'transparent',
                }}>
                    <span style={{ color: '#d0d0d0', fontSize: 11 }}>
                        Image &gt; Adjustments edits the active layer directly{selection.hasSelection ? ' inside the selection.' : '.'}
                    </span>
                </div>
            </div>
        </div>
    );
}
