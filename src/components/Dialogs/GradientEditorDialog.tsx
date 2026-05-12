import { X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import type { GradientColorStop, GradientOpacityStop } from '../../store/types';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import { ColorPickerDialog } from './ColorPickerDialog';

export interface GradientEditorResult {
    colorStops: GradientColorStop[];
    opacityStops: GradientOpacityStop[];
    smoothness: number;
}

interface GradientEditorDialogProps {
    isOpen: boolean;
    initialColorStops: GradientColorStop[];
    initialOpacityStops: GradientOpacityStop[];
    initialSmoothness?: number;
    onClose: () => void;
    onConfirm: (result: GradientEditorResult) => void;
}

type Selected =
    | { kind: 'color'; index: number }
    | { kind: 'opacity'; index: number }
    | null;

const STRIP_WIDTH = 360;
const STRIP_HEIGHT = 28;
const PEG_HALF = 6;

function clamp01(v: number): number {
    return Math.max(0, Math.min(1, v));
}

function sortStops<T extends { position: number }>(stops: T[]): T[] {
    return [...stops].sort((a, b) => a.position - b.position);
}

/**
 * Re-map a 0..1 fraction so the gradient's midpoint (Photoshop's diamond
 * marker between two stops) controls where the 50% transition lies between
 * the two endpoints. midpoint = 0.5 → linear. midpoint < 0.5 pushes the
 * transition toward the low stop; midpoint > 0.5 pushes it toward the high
 * stop.
 */
function applyMidpoint(k: number, midpoint?: number): number {
    const m = Math.max(0.05, Math.min(0.95, midpoint ?? 0.5));
    if (Math.abs(m - 0.5) < 1e-4) return k;
    // Piecewise linear remap: 0..m maps to 0..0.5, m..1 maps to 0.5..1.
    if (k <= m) return (k / m) * 0.5;
    return 0.5 + ((k - m) / (1 - m)) * 0.5;
}

/**
 * Smoothness slider (0..100) blends between straight linear (0) and a
 * Hermite/smoothstep S-curve (100). Smoothstep gives zero derivative at the
 * endpoints, which is Photoshop's "smooth" gradient look.
 */
function applySmoothness(k: number, smoothness: number): number {
    const s = Math.max(0, Math.min(100, smoothness)) / 100;
    if (s <= 0) return k;
    const sm = k * k * (3 - 2 * k);
    return k * (1 - s) + sm * s;
}

function sampleColor(stops: GradientColorStop[], t: number, smoothness = 0): { r: number; g: number; b: number } {
    if (stops.length === 0) return { r: 0, g: 0, b: 0 };
    const sorted = sortStops(stops);
    if (t <= sorted[0].position) return parseHex(sorted[0].color);
    if (t >= sorted[sorted.length - 1].position) return parseHex(sorted[sorted.length - 1].color);
    let lo = sorted[0]; let hi = sorted[sorted.length - 1];
    for (let i = 0; i < sorted.length - 1; i++) {
        if (t >= sorted[i].position && t <= sorted[i + 1].position) {
            lo = sorted[i]; hi = sorted[i + 1]; break;
        }
    }
    const span = hi.position - lo.position || 1;
    const kRaw = (t - lo.position) / span;
    const kMid = applyMidpoint(kRaw, lo.midpointToNext);
    const k = applySmoothness(kMid, smoothness);
    const a = parseHex(lo.color);
    const b = parseHex(hi.color);
    return {
        r: Math.round(a.r + (b.r - a.r) * k),
        g: Math.round(a.g + (b.g - a.g) * k),
        b: Math.round(a.b + (b.b - a.b) * k),
    };
}

function sampleOpacity(stops: GradientOpacityStop[], t: number, smoothness = 0): number {
    if (stops.length === 0) return 1;
    const sorted = sortStops(stops);
    if (t <= sorted[0].position) return sorted[0].opacity;
    if (t >= sorted[sorted.length - 1].position) return sorted[sorted.length - 1].opacity;
    let lo = sorted[0]; let hi = sorted[sorted.length - 1];
    for (let i = 0; i < sorted.length - 1; i++) {
        if (t >= sorted[i].position && t <= sorted[i + 1].position) {
            lo = sorted[i]; hi = sorted[i + 1]; break;
        }
    }
    const span = hi.position - lo.position || 1;
    const kRaw = (t - lo.position) / span;
    const kMid = applyMidpoint(kRaw, lo.midpointToNext);
    const k = applySmoothness(kMid, smoothness);
    return lo.opacity + (hi.opacity - lo.opacity) * k;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
    const h = hex.startsWith('#') ? hex.slice(1) : hex;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return { r: isNaN(r) ? 0 : r, g: isNaN(g) ? 0 : g, b: isNaN(b) ? 0 : b };
}

function drawStrip(
    canvas: HTMLCanvasElement,
    colorStops: GradientColorStop[],
    opacityStops: GradientOpacityStop[],
    smoothness = 0,
): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    // Checkerboard for transparency.
    const cs = 6;
    for (let y = 0; y < h; y += cs) {
        for (let x = 0; x < w; x += cs) {
            ctx.fillStyle = ((Math.floor(x / cs) + Math.floor(y / cs)) & 1) ? '#bbb' : '#eee';
            ctx.fillRect(x, y, cs, cs);
        }
    }
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let x = 0; x < w; x++) {
        const t = x / Math.max(1, w - 1);
        const c = sampleColor(colorStops, t, smoothness);
        const a = clamp01(sampleOpacity(opacityStops, t, smoothness));
        for (let y = 0; y < h; y++) {
            const idx = (y * w + x) * 4;
            const bgR = d[idx]; const bgG = d[idx + 1]; const bgB = d[idx + 2];
            d[idx]     = Math.round(bgR * (1 - a) + c.r * a);
            d[idx + 1] = Math.round(bgG * (1 - a) + c.g * a);
            d[idx + 2] = Math.round(bgB * (1 - a) + c.b * a);
            d[idx + 3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
}

export function GradientEditorDialog(props: GradientEditorDialogProps) {
    if (!props.isOpen) return null;
    return <GradientEditorDialogBody {...props} />;
}

function GradientEditorDialogBody(props: GradientEditorDialogProps) {
    const { initialColorStops, initialOpacityStops, initialSmoothness = 100, onClose, onConfirm } = props;

    const [colorStops, setColorStops] = useState<GradientColorStop[]>(() => initialColorStops.map(s => ({ ...s })));
    const [opacityStops, setOpacityStops] = useState<GradientOpacityStop[]>(() => initialOpacityStops.map(s => ({ ...s })));
    const [smoothness, setSmoothness] = useState<number>(initialSmoothness);
    const [selected, setSelected] = useState<Selected>(null);
    const [presetName, setPresetName] = useState<string>('');
    const [pickerForIndex, setPickerForIndex] = useState<number | null>(null);
    const stripRef = useRef<HTMLCanvasElement | null>(null);
    const dialogRef = useDialogA11y(true, onClose);

    const dragRef = useRef<{ kind: 'color' | 'opacity' | 'color-mid' | 'opacity-mid'; index: number; pointerId: number } | null>(null);

    const gradientPresets = useEditorStore(s => s.gradientPresets);
    const saveGradientPreset = useEditorStore(s => s.saveGradientPreset);
    const applyGradientPreset = useEditorStore(s => s.applyGradientPreset);
    const removeGradientPreset = useEditorStore(s => s.removeGradientPreset);

    useEffect(() => {
        if (stripRef.current) drawStrip(stripRef.current, colorStops, opacityStops, smoothness);
    }, [colorStops, opacityStops, smoothness]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Delete' && e.key !== 'Backspace') return;
            const sel = selected;
            if (!sel) return;
            if (sel.kind === 'color') {
                if (colorStops.length <= 2) return;
                const next = colorStops.filter((_, i) => i !== sel.index);
                setSelected(null);
                setColorStops(next);
            } else {
                if (opacityStops.length <= 2) return;
                const next = opacityStops.filter((_, i) => i !== sel.index);
                setSelected(null);
                setOpacityStops(next);
            }
            e.preventDefault();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selected, colorStops, opacityStops]);

    const sortedColorStops = useMemo(() => sortStops(colorStops), [colorStops]);
    const sortedOpacityStops = useMemo(() => sortStops(opacityStops), [opacityStops]);

    const rowToPosition = (clientX: number, rowEl: HTMLElement): number => {
        const rect = rowEl.getBoundingClientRect();
        const x = clientX - rect.left;
        return clamp01(rect.width === 0 ? 0 : x / rect.width);
    };

    const handleColorRowClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).dataset.peg) return;
        const pos = rowToPosition(e.clientX, e.currentTarget);
        const sampled = sampleColor(colorStops, pos);
        const hex = `#${[sampled.r, sampled.g, sampled.b].map(c => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
        const next = [...colorStops, { position: pos, color: hex }];
        setColorStops(next);
        setSelected({ kind: 'color', index: next.length - 1 });
    };

    const handleOpacityRowClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).dataset.peg) return;
        const pos = rowToPosition(e.clientX, e.currentTarget);
        const opacity = clamp01(sampleOpacity(opacityStops, pos));
        const next = [...opacityStops, { position: pos, opacity }];
        setOpacityStops(next);
        setSelected({ kind: 'opacity', index: next.length - 1 });
    };

    const startDrag = (kind: 'color' | 'opacity', index: number) => (e: React.PointerEvent<HTMLDivElement>) => {
        e.stopPropagation();
        dragRef.current = { kind, index, pointerId: e.pointerId };
        setSelected({ kind, index });
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    };

    const startMidpointDrag = (kind: 'color-mid' | 'opacity-mid', index: number) => (e: React.PointerEvent<HTMLDivElement>) => {
        e.stopPropagation();
        dragRef.current = { kind, index, pointerId: e.pointerId };
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    };

    const onPegMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        if (!drag) return;
        const row = (e.currentTarget.parentElement) as HTMLElement | null;
        if (!row) return;
        const pos = rowToPosition(e.clientX, row);
        if (drag.kind === 'color') {
            setColorStops(prev => prev.map((s, i) => i === drag.index ? { ...s, position: pos } : s));
        } else if (drag.kind === 'opacity') {
            setOpacityStops(prev => prev.map((s, i) => i === drag.index ? { ...s, position: pos } : s));
        } else if (drag.kind === 'color-mid') {
            // Adjust midpointToNext of color stop at drag.index based on pointer
            // position relative to the gap between that stop and the next.
            setColorStops(prev => {
                const sorted = sortStops(prev);
                const lo = sorted[drag.index];
                const hi = sorted[drag.index + 1];
                if (!lo || !hi) return prev;
                const span = hi.position - lo.position || 1;
                const m = Math.max(0.05, Math.min(0.95, (pos - lo.position) / span));
                return prev.map(s => s === lo ? { ...s, midpointToNext: m } : s);
            });
        } else if (drag.kind === 'opacity-mid') {
            setOpacityStops(prev => {
                const sorted = sortStops(prev);
                const lo = sorted[drag.index];
                const hi = sorted[drag.index + 1];
                if (!lo || !hi) return prev;
                const span = hi.position - lo.position || 1;
                const m = Math.max(0.05, Math.min(0.95, (pos - lo.position) / span));
                return prev.map(s => s === lo ? { ...s, midpointToNext: m } : s);
            });
        }
    };

    const onPegUp = () => { dragRef.current = null; };

    const onPegDouble = (kind: 'color' | 'opacity', index: number) => (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (kind === 'color') {
            setSelected({ kind: 'color', index });
            setPickerForIndex(index);
        } else {
            setSelected({ kind: 'opacity', index });
        }
    };

    const handleConfirm = () => {
        onConfirm({
            colorStops: sortStops(colorStops),
            opacityStops: sortStops(opacityStops),
            smoothness,
        });
        onClose();
    };

    const handleSavePreset = () => {
        const name = presetName.trim() || `Custom Gradient ${gradientPresets.length + 1}`;
        saveGradientPreset(name, sortStops(colorStops), sortStops(opacityStops), smoothness);
        setPresetName('');
    };

    const handleApplyPreset = (id: string) => {
        const preset = applyGradientPreset(id);
        if (!preset) return;
        setColorStops(preset.colorStops);
        setOpacityStops(preset.opacityStops);
        setSmoothness(preset.smoothness);
        setSelected(null);
    };

    const selectedColorStop = selected?.kind === 'color' ? colorStops[selected.index] : null;
    const selectedOpacityStop = selected?.kind === 'opacity' ? opacityStops[selected.index] : null;

    return (
        <div
            data-testid="gradient-editor-dialog"
            style={{
                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                backdropFilter: 'blur(2px)',
            }}
            onClick={onClose}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="gradient-editor-title"
                tabIndex={-1}
                onClick={e => e.stopPropagation()}
                style={{
                    width: 440, backgroundColor: 'hsl(var(--bg-panel))',
                    border: '1px solid hsl(var(--border-light))', borderRadius: 8,
                    boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}
            >
                <div style={{ padding: '12px 16px', borderBottom: '1px solid hsl(var(--border-light))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'hsl(var(--bg-header))' }}>
                    <h3 id="gradient-editor-title" style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'hsl(var(--text-main))' }}>Gradient Editor</h3>
                    <button aria-label="Close" onClick={onClose} style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 4 }}>
                        <X size={16} />
                    </button>
                </div>

                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 12, color: 'hsl(var(--text-main))' }}>
                    {/* Presets */}
                    <div>
                        <div style={{ fontSize: 11, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Presets</div>
                        <div data-testid="gradient-presets-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, minHeight: 28 }}>
                            {gradientPresets.length === 0 && (
                                <div style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>No saved presets.</div>
                            )}
                            {gradientPresets.map(p => {
                                const previewStops = p.colorStops.map(s => {
                                    const opacity = sampleOpacity(p.opacityStops, s.position);
                                    return { color: s.color, position: s.position, opacity };
                                });
                                const css = `linear-gradient(to right, ${sortStops(previewStops).map(s => {
                                    const { r, g, b } = parseHex(s.color);
                                    return `rgba(${r},${g},${b},${s.opacity}) ${(s.position * 100).toFixed(1)}%`;
                                }).join(', ')})`;
                                return (
                                    <button
                                        key={p.id}
                                        title={p.name}
                                        data-testid={`gradient-preset-${p.id}`}
                                        onClick={() => handleApplyPreset(p.id)}
                                        onDoubleClick={() => removeGradientPreset(p.id)}
                                        style={{ width: 48, height: 22, background: css, border: '1px solid hsl(var(--border-light))', borderRadius: 2, cursor: 'pointer', padding: 0 }}
                                    />
                                );
                            })}
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                            <input
                                type="text"
                                value={presetName}
                                onChange={e => setPresetName(e.target.value)}
                                placeholder="Preset name"
                                data-testid="gradient-preset-name"
                                style={{ flex: 1, background: 'hsl(var(--bg-input))', border: '1px solid hsl(var(--border-light))', color: 'hsl(var(--text-main))', padding: '4px 6px', borderRadius: 2, fontSize: 11 }}
                            />
                            <button
                                data-testid="gradient-save-preset"
                                onClick={handleSavePreset}
                                style={{ padding: '4px 10px', backgroundColor: 'hsl(var(--bg-input))', border: '1px solid hsl(var(--border-light))', color: 'hsl(var(--text-main))', borderRadius: 2, cursor: 'pointer', fontSize: 11 }}
                            >Save</button>
                        </div>
                    </div>

                    {/* Opacity stops row (above strip) */}
                    <div>
                        <div style={{ fontSize: 11, color: 'hsl(var(--text-muted))', marginBottom: 4 }}>Opacity Stops</div>
                        <div
                            data-testid="gradient-opacity-row"
                            onClick={handleOpacityRowClick}
                            style={{ position: 'relative', width: STRIP_WIDTH, height: 18, background: 'hsl(var(--bg-input))', border: '1px solid hsl(var(--border-light))', borderRadius: 2, cursor: 'crosshair' }}
                        >
                            {sortedOpacityStops.slice(0, -1).map((s, i) => {
                                const next = sortedOpacityStops[i + 1];
                                const mid = Math.max(0.05, Math.min(0.95, s.midpointToNext ?? 0.5));
                                const pos = s.position + (next.position - s.position) * mid;
                                return (
                                    <div
                                        key={`op-mid-${i}`}
                                        data-peg="opacity-mid"
                                        data-testid={`gradient-opacity-midpoint-${i}`}
                                        onPointerDown={startMidpointDrag('opacity-mid', i)}
                                        onPointerMove={onPegMove}
                                        onPointerUp={onPegUp}
                                        style={{
                                            position: 'absolute',
                                            left: `calc(${pos * 100}% - 4px)`,
                                            top: 5,
                                            width: 8, height: 8,
                                            background: '#ccc',
                                            transform: 'rotate(45deg)',
                                            border: '1px solid #444',
                                            cursor: 'ew-resize',
                                        }}
                                    />
                                );
                            })}
                            {opacityStops.map((s, i) => (
                                <div
                                    key={`op-${i}`}
                                    data-peg="opacity"
                                    data-testid={`gradient-opacity-stop-${i}`}
                                    onPointerDown={startDrag('opacity', i)}
                                    onPointerMove={onPegMove}
                                    onPointerUp={onPegUp}
                                    onDoubleClick={onPegDouble('opacity', i)}
                                    style={{
                                        position: 'absolute',
                                        left: `calc(${s.position * 100}% - ${PEG_HALF}px)`,
                                        top: 2,
                                        width: PEG_HALF * 2, height: 14,
                                        background: `rgba(0,0,0,${s.opacity})`,
                                        border: `1px solid ${selected?.kind === 'opacity' && selected.index === i ? 'hsl(var(--accent-primary))' : '#888'}`,
                                        borderRadius: 2,
                                        cursor: 'pointer',
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Gradient strip */}
                    <canvas
                        ref={stripRef}
                        width={STRIP_WIDTH}
                        height={STRIP_HEIGHT}
                        data-testid="gradient-strip"
                        style={{ width: STRIP_WIDTH, height: STRIP_HEIGHT, border: '1px solid hsl(var(--border-light))', borderRadius: 2 }}
                    />

                    {/* Color stops row (below strip) */}
                    <div>
                        <div style={{ fontSize: 11, color: 'hsl(var(--text-muted))', marginBottom: 4 }}>Color Stops</div>
                        <div
                            data-testid="gradient-color-row"
                            onClick={handleColorRowClick}
                            style={{ position: 'relative', width: STRIP_WIDTH, height: 18, background: 'hsl(var(--bg-input))', border: '1px solid hsl(var(--border-light))', borderRadius: 2, cursor: 'crosshair' }}
                        >
                            {sortedColorStops.slice(0, -1).map((s, i) => {
                                const next = sortedColorStops[i + 1];
                                const mid = Math.max(0.05, Math.min(0.95, s.midpointToNext ?? 0.5));
                                const pos = s.position + (next.position - s.position) * mid;
                                return (
                                    <div
                                        key={`cs-mid-${i}`}
                                        data-peg="color-mid"
                                        data-testid={`gradient-color-midpoint-${i}`}
                                        onPointerDown={startMidpointDrag('color-mid', i)}
                                        onPointerMove={onPegMove}
                                        onPointerUp={onPegUp}
                                        style={{
                                            position: 'absolute',
                                            left: `calc(${pos * 100}% - 4px)`,
                                            top: 5,
                                            width: 8, height: 8,
                                            background: '#ccc',
                                            transform: 'rotate(45deg)',
                                            border: '1px solid #444',
                                            cursor: 'ew-resize',
                                        }}
                                    />
                                );
                            })}
                            {colorStops.map((s, i) => (
                                <div
                                    key={`cs-${i}`}
                                    data-peg="color"
                                    data-testid={`gradient-color-stop-${i}`}
                                    onPointerDown={startDrag('color', i)}
                                    onPointerMove={onPegMove}
                                    onPointerUp={onPegUp}
                                    onDoubleClick={onPegDouble('color', i)}
                                    style={{
                                        position: 'absolute',
                                        left: `calc(${s.position * 100}% - ${PEG_HALF}px)`,
                                        top: 2,
                                        width: PEG_HALF * 2, height: 14,
                                        background: s.color,
                                        border: `1px solid ${selected?.kind === 'color' && selected.index === i ? 'hsl(var(--accent-primary))' : '#222'}`,
                                        borderRadius: 2,
                                        cursor: 'pointer',
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Selected stop editor */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                        {selectedColorStop && selected?.kind === 'color' && (
                            <>
                                <span>Location:</span>
                                <input
                                    type="number" min={0} max={100}
                                    value={Math.round(selectedColorStop.position * 100)}
                                    data-testid="gradient-selected-location"
                                    onChange={e => {
                                        const v = clamp01((+e.target.value) / 100);
                                        setColorStops(prev => prev.map((s, i) => i === selected.index ? { ...s, position: v } : s));
                                    }}
                                    style={{ width: 48, background: 'hsl(var(--bg-input))', border: '1px solid hsl(var(--border-light))', color: 'hsl(var(--text-main))', padding: '2px 4px', borderRadius: 2 }}
                                />
                                <span>%</span>
                                <span style={{ marginLeft: 8 }}>Color:</span>
                                <button
                                    type="button"
                                    data-testid="gradient-selected-color"
                                    aria-label="Open Color Picker"
                                    onClick={() => setPickerForIndex(selected.index)}
                                    style={{ width: 32, height: 22, border: '1px solid hsl(var(--border-light))', background: selectedColorStop.color, cursor: 'pointer', padding: 0, borderRadius: 2 }}
                                />
                                <span style={{ fontSize: 10, color: 'hsl(var(--text-muted))', fontFamily: 'monospace' }}>{selectedColorStop.color}</span>
                            </>
                        )}
                        {selectedOpacityStop && selected?.kind === 'opacity' && (
                            <>
                                <span>Location:</span>
                                <input
                                    type="number" min={0} max={100}
                                    value={Math.round(selectedOpacityStop.position * 100)}
                                    data-testid="gradient-selected-location"
                                    onChange={e => {
                                        const v = clamp01((+e.target.value) / 100);
                                        setOpacityStops(prev => prev.map((s, i) => i === selected.index ? { ...s, position: v } : s));
                                    }}
                                    style={{ width: 48, background: 'hsl(var(--bg-input))', border: '1px solid hsl(var(--border-light))', color: 'hsl(var(--text-main))', padding: '2px 4px', borderRadius: 2 }}
                                />
                                <span>%</span>
                                <span style={{ marginLeft: 8 }}>Opacity:</span>
                                <input
                                    type="number" min={0} max={100}
                                    value={Math.round(selectedOpacityStop.opacity * 100)}
                                    data-testid="gradient-selected-opacity"
                                    onChange={e => {
                                        const v = clamp01((+e.target.value) / 100);
                                        setOpacityStops(prev => prev.map((s, i) => i === selected.index ? { ...s, opacity: v } : s));
                                    }}
                                    style={{ width: 48, background: 'hsl(var(--bg-input))', border: '1px solid hsl(var(--border-light))', color: 'hsl(var(--text-main))', padding: '2px 4px', borderRadius: 2 }}
                                />
                                <span>%</span>
                            </>
                        )}
                        {!selected && (
                            <span style={{ color: 'hsl(var(--text-muted))' }}>Click a stop to edit. Click on the row to add. Delete removes.</span>
                        )}
                    </div>

                    {/* Smoothness */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 80 }}>Smoothness:</span>
                        <input
                            type="range" min={0} max={100} step={1}
                            value={smoothness}
                            data-testid="gradient-smoothness"
                            onChange={e => setSmoothness(+e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <span style={{ width: 40, textAlign: 'right' }}>{smoothness}%</span>
                    </div>

                    {/* For sorted stops, expose hidden state for tests */}
                    <div data-testid="gradient-debug-counts" data-color-count={sortedColorStops.length} data-opacity-count={sortedOpacityStops.length} style={{ display: 'none' }} />
                </div>

                <div style={{ padding: '12px 16px', borderTop: '1px solid hsl(var(--border-light))', display: 'flex', justifyContent: 'flex-end', gap: 8, backgroundColor: 'hsl(var(--bg-header))' }}>
                    <button
                        data-testid="gradient-editor-cancel"
                        onClick={onClose}
                        style={{ padding: '6px 12px', backgroundColor: 'transparent', border: '1px solid hsl(var(--border-light))', color: 'hsl(var(--text-main))', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                    >Cancel</button>
                    <button
                        data-testid="gradient-editor-ok"
                        onClick={handleConfirm}
                        style={{ padding: '6px 12px', backgroundColor: 'hsl(var(--accent-primary))', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}
                    >OK</button>
                </div>
            </div>
            <ColorPickerDialog
                isOpen={pickerForIndex !== null}
                initialColor={pickerForIndex !== null && colorStops[pickerForIndex] ? colorStops[pickerForIndex].color : '#000000'}
                title="Gradient Stop Color"
                onConfirm={(c) => {
                    if (pickerForIndex === null) return;
                    const idx = pickerForIndex;
                    setColorStops(prev => prev.map((s, i) => i === idx ? { ...s, color: c } : s));
                }}
                onClose={() => setPickerForIndex(null)}
            />
        </div>
    );
}
