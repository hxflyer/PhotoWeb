/**
 * ColorPanel — compact SV color picker with vertical hue slider, plus
 * overlapping FG/BG swatches in the top-left corner. Drag the SV field to
 * change saturation/brightness of the primary color; drag the hue slider to
 * change hue. Click either FG/BG swatch to open the full picker dialog.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Repeat2 } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';

function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    if (h.length === 3) return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
    if (h.length < 6) return [0, 0, 0];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
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

const HUE_STOPS = '#f00 0%, #ff0 16.66%, #0f0 33.33%, #0ff 50%, #00f 66.66%, #f0f 83.33%, #f00 100%';

export function ColorPanel() {
    const primaryColor = useEditorStore(s => s.primaryColor);
    const secondaryColor = useEditorStore(s => s.secondaryColor);
    const setPrimaryColor = useEditorStore.getState().setPrimaryColor;
    const swapColors = useEditorStore.getState().swapColors;
    const openColorPicker = useEditorStore.getState().openColorPicker;

    // Track HSB locally so we don't lose hue when S/B both reach zero.
    const initialHsb = (() => { const [r, g, b] = hexToRgb(primaryColor); return rgbToHsb(r, g, b); })();
    const [hsb, setHsb] = useState<[number, number, number]>(initialHsb);

    // Sync from external primaryColor changes (only when the user-derived hex differs).
    useEffect(() => {
        const [r, g, b] = hexToRgb(primaryColor);
        const [h2, s2, v2] = rgbToHsb(r, g, b);
        // Preserve current hue if saturation collapses to 0 (white/black/grey).
        const newH = s2 === 0 ? hsb[0] : h2;
        if (newH !== hsb[0] || s2 !== hsb[1] || v2 !== hsb[2]) {
            setHsb([newH, s2, v2]);
        }
    }, [primaryColor]); // eslint-disable-line react-hooks/exhaustive-deps

    const sbRef = useRef<HTMLDivElement>(null);
    const hueRef = useRef<HTMLDivElement>(null);
    const sbDragging = useRef(false);
    const hueDragging = useRef(false);

    const update = useCallback((h: number, s: number, v: number) => {
        const newHsb: [number, number, number] = [h, s, v];
        setHsb(newHsb);
        const [r, g, b] = hsbToRgb(h, s, v);
        setPrimaryColor(rgbToHex(r, g, b));
    }, [setPrimaryColor]);

    const handleSbMove = useCallback((clientX: number, clientY: number) => {
        const el = sbRef.current; if (!el) return;
        const rect = el.getBoundingClientRect();
        const s = Math.round(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * 100);
        const v = Math.round((1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))) * 100);
        update(hsb[0], s, v);
    }, [hsb, update]);

    const handleHueMove = useCallback((clientY: number) => {
        const el = hueRef.current; if (!el) return;
        const rect = el.getBoundingClientRect();
        const h = Math.round(Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)) * 360);
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

    // Indicator positions (in % of the SV field / hue slider).
    const sbX = hsb[1];
    const sbY = 100 - hsb[2];
    const huePct = (hsb[0] / 360) * 100;
    const baseHueColor = `hsl(${hsb[0]}, 100%, 50%)`;

    return (
        <div data-testid="color-panel" style={{ position: 'relative', padding: 6, display: 'flex', gap: 6, height: 156 }}>
            {/* FG/BG swatches stacked in the top-left, overlapping like Photoshop's tool swatches */}
            <div style={{ position: 'relative', width: 38, height: 38, flexShrink: 0 }}>
                <div
                    onClick={() => openColorPicker('secondary')}
                    title="Background Color"
                    style={{
                        position: 'absolute', right: 0, bottom: 0,
                        width: 22, height: 22,
                        backgroundColor: secondaryColor,
                        border: '1px solid #000',
                        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.4)',
                        cursor: 'pointer',
                    }}
                />
                <div
                    onClick={() => openColorPicker('primary')}
                    title="Foreground Color"
                    style={{
                        position: 'absolute', left: 0, top: 0,
                        width: 22, height: 22,
                        backgroundColor: primaryColor,
                        border: '1px solid #000',
                        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.4)',
                        cursor: 'pointer',
                        zIndex: 2,
                    }}
                />
                <button
                    onClick={swapColors}
                    title="Swap Colors (X)"
                    style={{
                        position: 'absolute', right: -2, top: 0,
                        width: 14, height: 14, padding: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'transparent', border: 'none',
                        color: 'hsl(var(--text-main))',
                        cursor: 'pointer', userSelect: 'none',
                    }}
                >
                    <Repeat2 size={13} strokeWidth={2.1} />
                </button>
            </div>

            {/* SV color field */}
            <div
                ref={sbRef}
                onMouseDown={(e) => { sbDragging.current = true; handleSbMove(e.clientX, e.clientY); }}
                style={{
                    flex: 1,
                    minWidth: 0,
                    height: '100%',
                    cursor: 'crosshair',
                    position: 'relative',
                    background: `
                        linear-gradient(to bottom, transparent, #000),
                        linear-gradient(to right, #fff, transparent),
                        ${baseHueColor}
                    `,
                    border: '1px solid hsl(var(--border-light))',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        left: `calc(${sbX}% - 6px)`, top: `calc(${sbY}% - 6px)`,
                        width: 12, height: 12,
                        borderRadius: '50%',
                        border: '2px solid #fff',
                        boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
                        pointerEvents: 'none',
                    }}
                />
            </div>

            {/* Hue slider */}
            <div
                ref={hueRef}
                onMouseDown={(e) => { hueDragging.current = true; handleHueMove(e.clientY); }}
                style={{
                    width: 16, height: '100%',
                    cursor: 'ns-resize',
                    position: 'relative',
                    background: `linear-gradient(to bottom, ${HUE_STOPS})`,
                    border: '1px solid hsl(var(--border-light))',
                    flexShrink: 0,
                }}
            >
                {/* Left-side triangle indicator */}
                <div
                    style={{
                        position: 'absolute',
                        left: -6, top: `calc(${huePct}% - 5px)`,
                        width: 0, height: 0,
                        borderTop: '5px solid transparent',
                        borderBottom: '5px solid transparent',
                        borderLeft: '6px solid hsl(var(--text-main))',
                        pointerEvents: 'none',
                    }}
                />
            </div>
        </div>
    );
}
