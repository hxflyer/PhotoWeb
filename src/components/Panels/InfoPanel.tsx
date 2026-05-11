import { useEffect, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { computeMemoryEstimate, formatMemoryMB } from '../../utils/storageEstimate';

interface CursorReadout {
    x: number;
    y: number;
    r: number;
    g: number;
    b: number;
    a: number;
}

function rgbToHsb(r: number, g: number, b: number): { h: number; s: number; v: number } {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
        if (max === rn) h = ((gn - bn) / d) % 6;
        else if (max === gn) h = (bn - rn) / d + 2;
        else h = (rn - gn) / d + 4;
        h = Math.round(h * 60);
        if (h < 0) h += 360;
    }
    const s = max === 0 ? 0 : Math.round((d / max) * 100);
    const v = Math.round(max * 100);
    return { h, s, v };
}

export function InfoPanel() {
    const width = useEditorStore(s => s.width);
    const height = useEditorStore(s => s.height);
    const layers = useEditorStore(s => s.layers);
    const activeLayerId = useEditorStore(s => s.activeLayerId);

    const [readout, setReadout] = useState<CursorReadout | null>(null);

    useEffect(() => {
        const move = (e: MouseEvent) => {
            const docEl = document.querySelector('[data-photoweb-document]') as HTMLElement | null;
            if (!docEl) { setReadout(null); return; }
            const rect = docEl.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) { setReadout(null); return; }
            const cx = Math.round(((e.clientX - rect.left) / rect.width) * width);
            const cy = Math.round(((e.clientY - rect.top) / rect.height) * height);
            if (cx < 0 || cy < 0 || cx >= width || cy >= height) {
                setReadout(null);
                return;
            }
            // Sample from the active layer if available, otherwise the topmost
            // visible raster layer.
            const target = layers.find(l => l.id === activeLayerId)
                ?? [...layers].reverse().find(l => l.visible && l.kind !== 'group' && l.kind !== 'adjustment');
            if (!target) { setReadout({ x: cx, y: cy, r: 0, g: 0, b: 0, a: 0 }); return; }
            try {
                const px = target.ctx.getImageData(cx, cy, 1, 1).data;
                setReadout({ x: cx, y: cy, r: px[0], g: px[1], b: px[2], a: px[3] });
            } catch {
                setReadout({ x: cx, y: cy, r: 0, g: 0, b: 0, a: 0 });
            }
        };
        window.addEventListener('mousemove', move);
        return () => window.removeEventListener('mousemove', move);
    }, [width, height, layers, activeLayerId]);

    const memoryBytes = computeMemoryEstimate(useEditorStore.getState()).totalBytes;
    const hsb = readout ? rgbToHsb(readout.r, readout.g, readout.b) : null;

    return (
        <div style={{ padding: 8, fontSize: 11, color: 'hsl(var(--text-main))', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <section data-testid="info-cursor" style={{ display: 'grid', gridTemplateColumns: '60px 1fr', columnGap: 8, rowGap: 2 }}>
                <span style={{ color: 'hsl(var(--text-muted))' }}>X:</span>
                <span data-testid="info-cursor-x">{readout ? readout.x : '—'}</span>
                <span style={{ color: 'hsl(var(--text-muted))' }}>Y:</span>
                <span data-testid="info-cursor-y">{readout ? readout.y : '—'}</span>
            </section>
            <div style={{ height: 1, background: 'hsl(var(--border-light))' }} />
            <section style={{ display: 'grid', gridTemplateColumns: '60px 1fr', columnGap: 8, rowGap: 2 }}>
                <span style={{ color: 'hsl(var(--text-muted))' }}>R:</span>
                <span>{readout ? readout.r : '—'}</span>
                <span style={{ color: 'hsl(var(--text-muted))' }}>G:</span>
                <span>{readout ? readout.g : '—'}</span>
                <span style={{ color: 'hsl(var(--text-muted))' }}>B:</span>
                <span>{readout ? readout.b : '—'}</span>
                <span style={{ color: 'hsl(var(--text-muted))' }}>A:</span>
                <span>{readout ? readout.a : '—'}</span>
            </section>
            <div style={{ height: 1, background: 'hsl(var(--border-light))' }} />
            <section style={{ display: 'grid', gridTemplateColumns: '60px 1fr', columnGap: 8, rowGap: 2 }}>
                <span style={{ color: 'hsl(var(--text-muted))' }}>H:</span>
                <span>{hsb ? `${hsb.h}°` : '—'}</span>
                <span style={{ color: 'hsl(var(--text-muted))' }}>S:</span>
                <span>{hsb ? `${hsb.s}%` : '—'}</span>
                <span style={{ color: 'hsl(var(--text-muted))' }}>B:</span>
                <span>{hsb ? `${hsb.v}%` : '—'}</span>
            </section>
            <div style={{ height: 1, background: 'hsl(var(--border-light))' }} />
            <section style={{ display: 'grid', gridTemplateColumns: '60px 1fr', columnGap: 8, rowGap: 2 }}>
                <span style={{ color: 'hsl(var(--text-muted))' }}>Doc:</span>
                <span>{width} × {height}</span>
                <span style={{ color: 'hsl(var(--text-muted))' }}>Mem:</span>
                <span>{formatMemoryMB(memoryBytes)} MB</span>
            </section>
        </div>
    );
}
