/**
 * PathsPanel — lists vector paths created by the Pen / Freeform Pen tools.
 * Selecting a row sets it as the active path so the pen extends that path.
 * Bottom toolbar: Duplicate + Delete only (per request).
 */
import { Trash2, Copy } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
    getPaths, getActivePathId, setActivePath,
    duplicatePath, removePath, getPathName, renamePath,
    type PathShape,
} from '../../tools/pen';

const HEAD_BTN: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: 'hsl(var(--text-muted))',
    cursor: 'pointer',
    width: 22, height: 22,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 2,
    padding: 0,
};

// Render a small thumbnail of the path on a 36x36 canvas, fitted with margin.
function PathThumbnail({ path, size = 36 }: { path: PathShape; size?: number }) {
    const ref = (el: HTMLCanvasElement | null) => {
        if (!el) return;
        const ctx = el.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = '#7f7f7f';
        ctx.fillRect(0, 0, size, size);
        if (path.anchors.length === 0) return;
        // Compute bounding box of anchors (incl. handles).
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        path.anchors.forEach(a => {
            minX = Math.min(minX, a.x); minY = Math.min(minY, a.y);
            maxX = Math.max(maxX, a.x); maxY = Math.max(maxY, a.y);
        });
        if (!isFinite(minX) || maxX - minX === 0 && maxY - minY === 0) {
            // Single point — draw a centered dot.
            ctx.fillStyle = '#fff';
            ctx.fillRect(size / 2 - 1, size / 2 - 1, 2, 2);
            return;
        }
        const margin = 4;
        const bw = Math.max(1, maxX - minX);
        const bh = Math.max(1, maxY - minY);
        const scale = Math.min((size - margin * 2) / bw, (size - margin * 2) / bh);
        const ox = (size - bw * scale) / 2 - minX * scale;
        const oy = (size - bh * scale) / 2 - minY * scale;
        ctx.beginPath();
        const a0 = path.anchors[0];
        ctx.moveTo(a0.x * scale + ox, a0.y * scale + oy);
        for (let i = 1; i < path.anchors.length; i++) {
            const prev = path.anchors[i - 1];
            const a = path.anchors[i];
            if (prev.outHandle && a.inHandle) {
                ctx.bezierCurveTo(
                    prev.outHandle.x * scale + ox, prev.outHandle.y * scale + oy,
                    a.inHandle.x * scale + ox, a.inHandle.y * scale + oy,
                    a.x * scale + ox, a.y * scale + oy,
                );
            } else {
                ctx.lineTo(a.x * scale + ox, a.y * scale + oy);
            }
        }
        if (path.closed) ctx.closePath();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
    };
    return (
        <canvas
            ref={ref}
            width={size} height={size}
            style={{ width: size, height: size, border: '1px solid hsl(var(--border-light))', flexShrink: 0 }}
        />
    );
}

export function PathsPanel() {
    // pathStore is a module-level singleton — poll it to mirror updates from
    // pen/freeform-pen tool clicks (no Zustand subscription on the path store).
    const [, setTick] = useState(0);
    useEffect(() => {
        const id = window.setInterval(() => setTick(t => t + 1), 250);
        return () => window.clearInterval(id);
    }, []);

    const paths = getPaths();
    const activeId = getActivePathId();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [, forceLocal] = useState(0);
    const refresh = () => forceLocal(n => n + 1);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'hsl(var(--bg-panel))' }}>
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {paths.length === 0 && (
                    <div style={{ padding: 16, color: 'hsl(var(--text-muted))', fontSize: 12, textAlign: 'center' }}>
                        No paths. Use the Pen tool to create one.
                    </div>
                )}
                {paths.map((path) => {
                    const isActive = activeId === path.id;
                    const name = getPathName(path.id);
                    return (
                        <div
                            key={path.id}
                            onClick={() => { setActivePath(path.id); refresh(); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '4px 8px',
                                backgroundColor: isActive ? 'hsl(var(--accent-primary))' : 'transparent',
                                cursor: 'pointer',
                                userSelect: 'none',
                                minHeight: 44,
                                borderBottom: '1px solid hsl(var(--border-mid))',
                            }}
                        >
                            <PathThumbnail path={path} />
                            {editingId === path.id ? (
                                <input
                                    autoFocus
                                    defaultValue={name}
                                    onClick={(e) => e.stopPropagation()}
                                    onBlur={(e) => { renamePath(path.id, e.currentTarget.value); setEditingId(null); }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') { renamePath(path.id, e.currentTarget.value); setEditingId(null); }
                                        else if (e.key === 'Escape') setEditingId(null);
                                    }}
                                    style={{
                                        flex: 1, fontSize: 12, padding: '2px 4px',
                                        background: 'hsl(var(--bg-input))',
                                        color: 'hsl(var(--text-main))',
                                        border: '1px solid hsl(var(--border-light))',
                                        borderRadius: 2,
                                    }}
                                />
                            ) : (
                                <span
                                    onDoubleClick={(e) => { e.stopPropagation(); setEditingId(path.id); }}
                                    style={{
                                        flex: 1, fontSize: 12,
                                        color: isActive ? '#fff' : 'hsl(var(--text-main))',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    }}
                                >{name}</span>
                            )}
                        </div>
                    );
                })}
            </div>

            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                padding: '4px 8px', gap: 4,
                borderTop: '1px solid hsl(var(--border-light))',
                backgroundColor: 'hsl(var(--bg-header))',
                flexShrink: 0,
            }}>
                <button
                    title="Duplicate Path"
                    onClick={() => { if (activeId) { duplicatePath(activeId); refresh(); } }}
                    disabled={!activeId}
                    style={{ ...HEAD_BTN, opacity: activeId ? 1 : 0.4 }}
                ><Copy size={14} /></button>
                <button
                    title="Delete Path"
                    onClick={() => { if (activeId) { removePath(activeId); refresh(); } }}
                    disabled={!activeId}
                    style={{ ...HEAD_BTN, opacity: activeId ? 1 : 0.4 }}
                ><Trash2 size={14} /></button>
            </div>
        </div>
    );
}
