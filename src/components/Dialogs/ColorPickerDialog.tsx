/**
 * ColorPickerDialog — Photoshop-style color picker.
 * Layout: SV field, vertical hue slider, New/Current swatches, OK/Cancel/Add to
 * Swatches buttons, and the four numeric color spaces (HSB, Lab, RGB, CMYK)
 * plus a hex input and a "Only Web Colors" checkbox.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useDialogA11y } from '../../hooks/useDialogA11y';

interface Props {
    isOpen: boolean;
    initialColor: string;
    title?: string;
    onConfirm: (color: string) => void;
    onClose: () => void;
}

// ── Color conversions ──────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    if (h.length === 3) return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHex(r: number, g: number, b: number): string {
    return [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}
function rgbToHsb(r: number, g: number, b: number): [number, number, number] {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0;
    if (delta > 0) {
        if (max === r) h = ((g - b) / delta) % 6;
        else if (max === g) h = (b - r) / delta + 2;
        else h = (r - g) / delta + 4;
        h = Math.round(h * 60);
        if (h < 0) h += 360;
    }
    const s = max === 0 ? 0 : delta / max;
    return [h, Math.round(s * 100), Math.round(max * 100)];
}
function hsbToRgb(h: number, s: number, v: number): [number, number, number] {
    s /= 100; v /= 100;
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
function rgbToCmyk(r: number, g: number, b: number): [number, number, number, number] {
    r /= 255; g /= 255; b /= 255;
    const k = 1 - Math.max(r, g, b);
    if (k >= 1) return [0, 0, 0, 100];
    const c = (1 - r - k) / (1 - k);
    const m = (1 - g - k) / (1 - k);
    const y = (1 - b - k) / (1 - k);
    return [Math.round(c * 100), Math.round(m * 100), Math.round(y * 100), Math.round(k * 100)];
}
function rgbToLab(r: number, g: number, b: number): [number, number, number] {
    const lin = (v: number) => { v /= 255; return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92; };
    const R = lin(r), G = lin(g), B = lin(b);
    let X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
    let Y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750;
    let Z = R * 0.0193339 + G * 0.1191920 + B * 0.9503041;
    X /= 0.95047; Y /= 1.0; Z /= 1.08883;
    const f = (t: number) => t > 0.008856 ? Math.pow(t, 1 / 3) : (7.787 * t + 16 / 116);
    const fx = f(X), fy = f(Y), fz = f(Z);
    return [Math.round(116 * fy - 16), Math.round(500 * (fx - fy)), Math.round(200 * (fy - fz))];
}

const HUE_STOPS = '#f00 0%, #ff0 16.66%, #0f0 33.33%, #0ff 50%, #00f 66.66%, #f0f 83.33%, #f00 100%';

const WEBSAFE_RE = /^#?([036cf9])\1([036cf9])\2([036cf9])\3$/i;
function snapToWebSafe(r: number, g: number, b: number): [number, number, number] {
    const snap = (v: number) => Math.round(v / 51) * 51;
    return [snap(r), snap(g), snap(b)];
}

// ── Numeric input row ──────────────────────────────────────────────────────
const Row = ({
    label, value, suffix, min, max, onChange, radio, onSelect, selected,
}: {
    label: string; value: number; suffix?: string;
    min: number; max: number;
    onChange: (v: number) => void;
    radio?: boolean; onSelect?: () => void; selected?: boolean;
}) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
        {radio && (
            <input
                type="radio"
                checked={!!selected}
                onChange={() => onSelect?.()}
                style={{ margin: 0, accentColor: 'hsl(var(--accent-primary))', cursor: 'pointer' }}
            />
        )}
        <span style={{ width: 14, color: 'hsl(var(--text-main))' }}>{label}</span>
        <span style={{ color: 'hsl(var(--text-main))' }}>:</span>
        <input
            type="number" min={min} max={max} value={value}
            onChange={e => onChange(Math.max(min, Math.min(max, parseInt(e.target.value || '0'))))}
            style={{
                width: 48, fontSize: 11, padding: '2px 4px',
                background: 'hsl(var(--bg-input))',
                border: '1px solid hsl(var(--border-light))',
                color: 'hsl(var(--text-main))',
                borderRadius: 2,
            }}
        />
        {suffix && <span style={{ fontSize: 10, color: 'hsl(var(--text-muted))', width: 10 }}>{suffix}</span>}
    </div>
);

export function ColorPickerDialog({ isOpen, initialColor, title = 'Color Picker', onConfirm, onClose }: Props) {
    const addSwatch = useEditorStore.getState().addSwatch;
    const [hsb, setHsb] = useState<[number, number, number]>(() => { const [r, g, b] = hexToRgb(initialColor); return rgbToHsb(r, g, b); });
    const [hexInput, setHexInput] = useState(initialColor.replace('#', ''));
    const [activeChannel, setActiveChannel] = useState<'H' | 'S' | 'B' | 'R' | 'G' | 'B2' | 'L' | 'a' | 'b'>('H');
    const [webSafe, setWebSafe] = useState(false);

    const sbRef = useRef<HTMLDivElement>(null);
    const hueRef = useRef<HTMLDivElement>(null);
    const sbDragging = useRef(false);
    const hueDragging = useRef(false);
    const dialogRef = useDialogA11y(isOpen, onClose);

    function normalizeHexInput(raw: string): string | null {
        const trimmed = raw.trim().replace(/^#/, '');
        if (/^[0-9a-fA-F]{3}$/.test(trimmed)) {
            return trimmed[0] + trimmed[0] + trimmed[1] + trimmed[1] + trimmed[2] + trimmed[2];
        }
        if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
        return null;
    }

    // Sync from initialColor when dialog opens.
    useEffect(() => {
        if (isOpen) {
            const r3 = hexToRgb(initialColor);
            setHsb(rgbToHsb(...r3));
            setHexInput(initialColor.replace('#', ''));
        }
    }, [isOpen, initialColor]);

    const rgb = hsbToRgb(hsb[0], hsb[1], hsb[2]);
    const displayRgb = webSafe ? snapToWebSafe(rgb[0], rgb[1], rgb[2]) : rgb;
    const lab = rgbToLab(displayRgb[0], displayRgb[1], displayRgb[2]);
    const cmyk = rgbToCmyk(displayRgb[0], displayRgb[1], displayRgb[2]);
    const newHex = rgbToHex(...displayRgb);
    const isOutOfGamut = cmyk[0] + cmyk[1] + cmyk[2] + cmyk[3] >= 400;
    const isWebSafe = WEBSAFE_RE.test(newHex);

    const update = useCallback((h: number, s: number, v: number) => {
        const nh: [number, number, number] = [
            Math.max(0, Math.min(360, Math.round(h))),
            Math.max(0, Math.min(100, Math.round(s))),
            Math.max(0, Math.min(100, Math.round(v))),
        ];
        setHsb(nh);
        const [r, g, b] = hsbToRgb(...nh);
        setHexInput(rgbToHex(r, g, b));
    }, []);

    const updateFromRgb = useCallback((r: number, g: number, b: number) => {
        const [h, s, v] = rgbToHsb(r, g, b);
        // Preserve hue when greyscale lands at S=0.
        const newH = s === 0 ? hsb[0] : h;
        setHsb([newH, s, v]);
        setHexInput(rgbToHex(r, g, b));
    }, [hsb]);

    const handleSbMove = useCallback((clientX: number, clientY: number) => {
        const el = sbRef.current; if (!el) return;
        const rect = el.getBoundingClientRect();
        const s = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * 100;
        const v = (1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))) * 100;
        update(hsb[0], s, v);
    }, [hsb, update]);
    const handleHueMove = useCallback((clientY: number) => {
        const el = hueRef.current; if (!el) return;
        const rect = el.getBoundingClientRect();
        const h = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)) * 360;
        update(h, hsb[1], hsb[2]);
    }, [hsb, update]);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (sbDragging.current) handleSbMove(e.clientX, e.clientY);
            if (hueDragging.current) handleHueMove(e.clientY);
        };
        const onUp = () => { sbDragging.current = false; hueDragging.current = false; };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [handleSbMove, handleHueMove]);

    if (!isOpen) return null;

    const sbX = hsb[1];
    const sbY = 100 - hsb[2];
    const huePct = (hsb[0] / 360) * 100;

    const SV_SIZE = 260;
    const btnStyle = (variant: 'primary' | 'normal' | 'disabled'): React.CSSProperties => ({
        padding: '3px 10px', fontSize: 12, lineHeight: 1.3,
        background: variant === 'primary' ? 'hsl(var(--accent-primary))' : 'hsl(var(--bg-input))',
        color: variant === 'disabled' ? 'hsl(var(--text-muted))' : variant === 'primary' ? '#fff' : 'hsl(var(--text-main))',
        border: variant === 'primary' ? 'none' : '1px solid hsl(var(--border-light))',
        borderRadius: 12,
        cursor: variant === 'disabled' ? 'not-allowed' : 'pointer',
        opacity: variant === 'disabled' ? 0.6 : 1,
        whiteSpace: 'nowrap',
    });

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="color-picker-title"
                tabIndex={-1}
                data-testid="color-picker-dialog"
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        onConfirm('#' + newHex);
                        onClose();
                    }
                }}
                style={{
                    background: 'hsl(var(--bg-panel))',
                    border: '1px solid hsl(var(--border-light))',
                    borderRadius: 4,
                    padding: 10,
                    color: 'hsl(var(--text-main))',
                    fontSize: 12,
                    boxShadow: 'var(--shadow-menu)',
                    fontFamily: 'var(--font-sans)',
                }}
            >
                {/* Title */}
                <div id="color-picker-title" style={{
                    fontWeight: 600, fontSize: 13, marginBottom: 8,
                    paddingBottom: 6, borderBottom: '1px solid hsl(var(--border-light))',
                    textAlign: 'right',
                }}>{title}</div>

                {/* Main row: SV / hue / right column (top: swatches+buttons, bottom: numerics) */}
                <div style={{ display: 'flex', gap: 10 }}>
                    {/* SV Field */}
                    <div
                        ref={sbRef}
                        onMouseDown={(e) => { sbDragging.current = true; handleSbMove(e.clientX, e.clientY); }}
                        style={{
                            width: SV_SIZE, height: SV_SIZE,
                            position: 'relative',
                            cursor: 'crosshair',
                            border: '1px solid hsl(var(--border-light))',
                            background: `
                                linear-gradient(to bottom, transparent, #000),
                                linear-gradient(to right, #fff, transparent),
                                hsl(${hsb[0]}, 100%, 50%)
                            `,
                            flexShrink: 0,
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            left: `calc(${sbX}% - 7px)`, top: `calc(${sbY}% - 7px)`,
                            width: 14, height: 14,
                            borderRadius: '50%',
                            border: '2px solid #fff',
                            boxShadow: '0 0 0 1px rgba(0,0,0,0.6)',
                            pointerEvents: 'none',
                        }} />
                    </div>

                    {/* Hue slider with both-side triangles */}
                    <div style={{ position: 'relative', width: 24, height: SV_SIZE, flexShrink: 0 }}>
                        <div
                            ref={hueRef}
                            onMouseDown={(e) => { hueDragging.current = true; handleHueMove(e.clientY); }}
                            style={{
                                position: 'absolute', left: 6, top: 0,
                                width: 12, height: '100%',
                                cursor: 'ns-resize',
                                background: `linear-gradient(to bottom, ${HUE_STOPS})`,
                                border: '1px solid hsl(var(--border-light))',
                            }}
                        />
                        <div style={{
                            position: 'absolute', left: 0, top: `calc(${huePct}% - 4px)`,
                            width: 0, height: 0,
                            borderTop: '4px solid transparent',
                            borderBottom: '4px solid transparent',
                            borderLeft: '5px solid hsl(var(--text-main))',
                            pointerEvents: 'none',
                        }} />
                        <div style={{
                            position: 'absolute', right: 0, top: `calc(${huePct}% - 4px)`,
                            width: 0, height: 0,
                            borderTop: '4px solid transparent',
                            borderBottom: '4px solid transparent',
                            borderRight: '5px solid hsl(var(--text-main))',
                            pointerEvents: 'none',
                        }} />
                    </div>

                    {/* Right column: top half = swatches + status + buttons; bottom half = numerics */}
                    <div style={{ display: 'flex', flexDirection: 'column', height: SV_SIZE, gap: 8 }}>
                        {/* Top row of right column */}
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            {/* Swatches column (new/current with labels) */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                <span style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>new</span>
                                <div title="New color" style={{
                                    width: 50, height: 38, background: '#' + newHex,
                                    border: '1px solid hsl(var(--border-light))',
                                }} />
                                <div
                                    title="Click to revert to current color"
                                    role="button"
                                    tabIndex={0}
                                    data-testid="color-picker-current-swatch"
                                    onClick={() => {
                                        const [r, g, b] = hexToRgb(initialColor);
                                        updateFromRgb(r, g, b);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            const [r, g, b] = hexToRgb(initialColor);
                                            updateFromRgb(r, g, b);
                                        }
                                    }}
                                    style={{
                                        width: 50, height: 38, background: initialColor,
                                        border: '1px solid hsl(var(--border-light))',
                                        cursor: 'pointer',
                                    }}
                                />
                                <span style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>current</span>
                            </div>
                            {/* Status icons (warning + web-safe) */}
                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', paddingTop: 14, paddingBottom: 14 }}>
                                <span
                                    title={isOutOfGamut ? 'Out-of-gamut warning' : ''}
                                    style={{
                                        fontSize: 14,
                                        color: isOutOfGamut ? '#f5a623' : 'transparent',
                                        cursor: isOutOfGamut ? 'pointer' : 'default',
                                        lineHeight: 1,
                                    }}
                                    onClick={() => isOutOfGamut && updateFromRgb(...displayRgb)}
                                >⚠</span>
                                <span
                                    title={isWebSafe ? 'Web-safe color' : 'Snap to web-safe color'}
                                    style={{
                                        fontSize: 14,
                                        color: isWebSafe ? 'hsl(var(--accent-primary))' : 'hsl(var(--text-muted))',
                                        cursor: 'pointer', lineHeight: 1,
                                    }}
                                    onClick={() => updateFromRgb(...snapToWebSafe(...displayRgb))}
                                >▢</span>
                            </div>
                            {/* Buttons */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                                <button autoFocus onClick={() => { onConfirm('#' + newHex); onClose(); }} style={btnStyle('primary')}>OK</button>
                                <button onClick={onClose} style={btnStyle('normal')}>Cancel</button>
                                <button onClick={() => addSwatch('#' + newHex)} style={btnStyle('normal')}>Add to Swatches</button>
                                <button disabled title="Color libraries (not yet implemented)" style={btnStyle('disabled')}>Color Libraries</button>
                            </div>
                        </div>

                        {/* Bottom of right column: numeric grid (2 cols × 6/7 rows) */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'auto auto',
                            columnGap: 18, rowGap: 3,
                            alignContent: 'start',
                            flex: 1,
                        }}>
                            {/* Left column: H S B / R G B */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <Row label="H" value={hsb[0]} suffix="°" min={0} max={360}
                                    onChange={(v) => update(v, hsb[1], hsb[2])}
                                    radio selected={activeChannel === 'H'} onSelect={() => setActiveChannel('H')} />
                                <Row label="S" value={hsb[1]} suffix="%" min={0} max={100}
                                    onChange={(v) => update(hsb[0], v, hsb[2])}
                                    radio selected={activeChannel === 'S'} onSelect={() => setActiveChannel('S')} />
                                <Row label="B" value={hsb[2]} suffix="%" min={0} max={100}
                                    onChange={(v) => update(hsb[0], hsb[1], v)}
                                    radio selected={activeChannel === 'B'} onSelect={() => setActiveChannel('B')} />
                                <Row label="R" value={displayRgb[0]} min={0} max={255}
                                    onChange={(v) => updateFromRgb(v, displayRgb[1], displayRgb[2])}
                                    radio selected={activeChannel === 'R'} onSelect={() => setActiveChannel('R')} />
                                <Row label="G" value={displayRgb[1]} min={0} max={255}
                                    onChange={(v) => updateFromRgb(displayRgb[0], v, displayRgb[2])}
                                    radio selected={activeChannel === 'G'} onSelect={() => setActiveChannel('G')} />
                                <Row label="B" value={displayRgb[2]} min={0} max={255}
                                    onChange={(v) => updateFromRgb(displayRgb[0], displayRgb[1], v)}
                                    radio selected={activeChannel === 'B2'} onSelect={() => setActiveChannel('B2')} />
                            </div>
                            {/* Right column: L a b / C M Y K */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <Row label="L" value={lab[0]} min={0} max={100}
                                    onChange={() => { /* Lab editing requires Lab→RGB; read-only */ }}
                                    radio selected={activeChannel === 'L'} onSelect={() => setActiveChannel('L')} />
                                <Row label="a" value={lab[1]} min={-128} max={127}
                                    onChange={() => { /* read-only */ }}
                                    radio selected={activeChannel === 'a'} onSelect={() => setActiveChannel('a')} />
                                <Row label="b" value={lab[2]} min={-128} max={127}
                                    onChange={() => { /* read-only */ }}
                                    radio selected={activeChannel === 'b'} onSelect={() => setActiveChannel('b')} />
                                <Row label="C" value={cmyk[0]} suffix="%" min={0} max={100}
                                    onChange={() => { /* read-only */ }} />
                                <Row label="M" value={cmyk[1]} suffix="%" min={0} max={100}
                                    onChange={() => { /* read-only */ }} />
                                <Row label="Y" value={cmyk[2]} suffix="%" min={0} max={100}
                                    onChange={() => { /* read-only */ }} />
                                <Row label="K" value={cmyk[3]} suffix="%" min={0} max={100}
                                    onChange={() => { /* read-only */ }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom row: Web-only + hex (full dialog width) */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    marginTop: 8, paddingTop: 8,
                    borderTop: '1px solid hsl(var(--border-light))',
                }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                        <input
                            type="checkbox"
                            checked={webSafe}
                            onChange={(e) => setWebSafe(e.target.checked)}
                            style={{ accentColor: 'hsl(var(--accent-primary))' }}
                        />
                        Only Web Colors
                    </label>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 11 }}>#</span>
                    <input
                        type="text"
                        value={hexInput}
                        data-testid="color-picker-hex-input"
                        onChange={e => {
                            setHexInput(e.target.value);
                            const normalized = normalizeHexInput(e.target.value);
                            if (normalized) {
                                const [r, g, b] = hexToRgb('#' + normalized);
                                updateFromRgb(r, g, b);
                            }
                        }}
                        onBlur={() => {
                            const normalized = normalizeHexInput(hexInput);
                            if (normalized) setHexInput(normalized);
                        }}
                        style={{
                            width: 80, fontSize: 11, padding: '2px 4px',
                            background: 'hsl(var(--bg-input))',
                            border: '1px solid hsl(var(--accent-primary))',
                            color: 'hsl(var(--text-main))',
                            borderRadius: 2, fontFamily: 'monospace',
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
