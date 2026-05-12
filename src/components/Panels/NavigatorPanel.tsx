import { useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';

const PANEL_W = 220;
const PANEL_H = 150;

export function NavigatorPanel() {
    const width = useEditorStore(s => s.width);
    const height = useEditorStore(s => s.height);
    const zoom = useEditorStore(s => s.zoom);
    const pan = useEditorStore(s => s.pan);
    const layers = useEditorStore(s => s.layers);
    const setPan = useEditorStore(s => s.setPan);
    const setZoom = useEditorStore(s => s.setZoom);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const draggingRef = useRef(false);

    // Compute mini-canvas placement of the document and the visible viewport rect.
    const docScale = Math.min((PANEL_W - 8) / width, (PANEL_H - 8) / height);
    const docW = Math.max(1, Math.round(width * docScale));
    const docH = Math.max(1, Math.round(height * docScale));
    const docX = Math.round((PANEL_W - docW) / 2);
    const docY = Math.round((PANEL_H - docH) / 2);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, PANEL_W, PANEL_H);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(docX, docY, docW, docH);
        for (const layer of layers) {
            if (!layer.visible) continue;
            if (layer.kind === 'group' || layer.kind === 'adjustment') continue;
            try {
                ctx.globalAlpha = layer.opacity;
                ctx.drawImage(layer.canvas, docX, docY, docW, docH);
            } catch {
                // node-canvas in jsdom may not support every drawImage signature.
            }
        }
        ctx.globalAlpha = 1;
        // Viewport rectangle: derive the visible document-pixel window from the
        // actual on-screen position of the [data-photoweb-document] element so
        // the proxy tracks pan.x / pan.y verbatim, then map back to mini-canvas
        // coordinates. Photoshop draws this as a red rectangle ("proxy overlay").
        const docEl = document.querySelector('[data-photoweb-document]') as HTMLElement | null;
        const parentEl = docEl?.parentElement as HTMLElement | null;
        let visLeft = 0, visTop = 0, visRight = width, visBottom = height;
        if (docEl && parentEl) {
            const docRect = docEl.getBoundingClientRect();
            const containerRect = parentEl.getBoundingClientRect();
            const z = Math.max(zoom, 0.001);
            // Document-pixel coords visible inside the viewport container.
            visLeft = (containerRect.left - docRect.left) / z;
            visTop = (containerRect.top - docRect.top) / z;
            visRight = (containerRect.right - docRect.left) / z;
            visBottom = (containerRect.bottom - docRect.top) / z;
        }
        const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
        const cl = clamp(visLeft, 0, width);
        const ct = clamp(visTop, 0, height);
        const cr = clamp(visRight, 0, width);
        const cb = clamp(visBottom, 0, height);
        const rectX = docX + (cl / width) * docW;
        const rectY = docY + (ct / height) * docH;
        const rectW = Math.max(1, ((cr - cl) / width) * docW);
        const rectH = Math.max(1, ((cb - ct) / height) * docH);
        ctx.strokeStyle = '#ff3b30';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(rectX, rectY, rectW, rectH);
    }, [docX, docY, docW, docH, layers, pan.x, pan.y, zoom, width, height]);

    useEffect(() => {
        draw();
    }, [draw]);

    const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        draggingRef.current = true;
        try { (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId); } catch { /* jsdom */ }
        applyDrag(e);
    };

    const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!draggingRef.current) return;
        applyDrag(e);
    };

    const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        draggingRef.current = false;
        try { (e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    };

    function applyDrag(e: React.PointerEvent<HTMLCanvasElement>) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        // Convert mini-canvas-space click into document pixel coordinates.
        const u = (px - docX) / Math.max(docW, 1);
        const v = (py - docY) / Math.max(docH, 1);
        const docPxX = u * width;
        const docPxY = v * height;
        // Centre the viewport around (docPxX, docPxY).
        const viewW = window.innerWidth;
        const viewH = window.innerHeight;
        const newPanX = viewW / 2 - docPxX * zoom;
        const newPanY = viewH / 2 - docPxY * zoom;
        setPan(newPanX, newPanY);
    }

    return (
        <div style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <canvas
                ref={canvasRef}
                width={PANEL_W}
                height={PANEL_H}
                data-testid="navigator-canvas"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ width: PANEL_W, height: PANEL_H, background: '#1e1e1e', border: '1px solid hsl(var(--border-light))', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <button
                    onClick={() => setZoom(Math.max(0.02, zoom / 1.25))}
                    title="Zoom out"
                    style={{ background: 'hsl(var(--bg-input))', border: '1px solid hsl(var(--border-light))', color: 'hsl(var(--text-main))', padding: '2px 6px', cursor: 'pointer' }}
                >−</button>
                <input
                    type="range"
                    min={0.02}
                    max={8}
                    step={0.01}
                    value={zoom}
                    onChange={e => setZoom(Number(e.target.value))}
                    aria-label="Navigator zoom"
                    style={{ flex: 1 }}
                />
                <button
                    onClick={() => setZoom(Math.min(32, zoom * 1.25))}
                    title="Zoom in"
                    style={{ background: 'hsl(var(--bg-input))', border: '1px solid hsl(var(--border-light))', color: 'hsl(var(--text-main))', padding: '2px 6px', cursor: 'pointer' }}
                >+</button>
                <span style={{ minWidth: 38, textAlign: 'right', color: 'hsl(var(--text-muted))' }}>
                    {Math.round(zoom * 100)}%
                </span>
            </div>
        </div>
    );
}
