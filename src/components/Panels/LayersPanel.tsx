import { Eye, EyeOff, Plus, Trash2, Brush, Move, Lock } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { useState, useEffect, useRef } from 'react';
import type { LayerColorTag } from '../../core/Layer';
import type { Layer } from '../../core/Layer';
import { blendModes as v1BlendModes } from '../../core/blendModes';

const COLOR_TAGS: { id: LayerColorTag; color: string }[] = [
    { id: 'none', color: 'transparent' },
    { id: 'red', color: '#ef4444' },
    { id: 'orange', color: '#f97316' },
    { id: 'yellow', color: '#eab308' },
    { id: 'green', color: '#22c55e' },
    { id: 'blue', color: '#3b82f6' },
    { id: 'violet', color: '#a855f7' },
    { id: 'gray', color: '#6b7280' },
];

const BLEND_MODE_OPTIONS: { value: GlobalCompositeOperation; label: string }[] =
    (Object.keys(v1BlendModes) as Array<keyof typeof v1BlendModes>).map(key => {
        const mapping = v1BlendModes[key];
        const op = mapping.kind === 'native' ? mapping.op : 'source-over';
        return { value: op as GlobalCompositeOperation, label: key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) };
    });

// ── Layer thumbnail with checker pattern + scaled content ───────────────────
function LayerThumbnail({ layer, size = 36, tick }: { layer: Layer; size?: number; tick: number }) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const c = ref.current;
        if (!c) return;
        const cx = c.getContext('2d');
        if (!cx) return;
        cx.clearRect(0, 0, size, size);
        // Checker pattern background (transparent areas show through)
        const tile = 6;
        for (let y = 0; y < size; y += tile) {
            for (let x = 0; x < size; x += tile) {
                cx.fillStyle = ((x / tile + y / tile) % 2 === 0) ? '#fff' : '#bbb';
                cx.fillRect(x, y, tile, tile);
            }
        }
        if (layer.kind === 'type') {
            cx.fillStyle = 'rgba(255,255,255,0.78)';
            cx.fillRect(0, 0, size, size);
            cx.fillStyle = '#111827';
            cx.font = `700 ${Math.round(size * 0.62)}px Georgia, serif`;
            cx.textAlign = 'center';
            cx.textBaseline = 'middle';
            cx.fillText('T', size / 2, size / 2 + 1);
            return;
        }
        const lw = layer.canvas.width;
        const lh = layer.canvas.height;
        if (lw && lh) {
            const s = Math.min(size / lw, size / lh);
            const dw = lw * s;
            const dh = lh * s;
            cx.drawImage(layer.canvas, (size - dw) / 2, (size - dh) / 2, dw, dh);
        }
    }, [layer, size, tick]);
    return (
        <canvas
            ref={ref}
            width={size}
            height={size}
            style={{ width: size, height: size, border: '1px solid hsl(var(--border-light))', flexShrink: 0 }}
        />
    );
}

// ── Transparency-lock icon (checker square) ─────────────────────────────────
const TransparencyLockIcon = ({ size = 12 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor">
        <rect x="0" y="0" width="3" height="3" />
        <rect x="6" y="0" width="3" height="3" />
        <rect x="3" y="3" width="3" height="3" />
        <rect x="9" y="3" width="3" height="3" />
        <rect x="0" y="6" width="3" height="3" />
        <rect x="6" y="6" width="3" height="3" />
        <rect x="3" y="9" width="3" height="3" />
        <rect x="9" y="9" width="3" height="3" />
    </svg>
);

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

const headBtnStyle = (active: boolean): React.CSSProperties => ({
    ...HEAD_BTN,
    background: active ? 'hsl(var(--bg-input))' : 'transparent',
    color: active ? 'hsl(var(--text-main))' : 'hsl(var(--text-muted))',
    boxShadow: active ? 'inset 0 0 0 1px hsl(var(--border-light))' : 'none',
});

export function LayersPanel() {
    const {
        layers, activeLayerId,
        addLayer, removeLayer, setActiveLayer, toggleLayerVisibility, soloLayer,
        renameLayer, setLayerLock, setLayerColorTag, setLayerFill,
        reorderLayers, setLayerOpacity, setLayerBlendMode,
        mergeLayerDown, mergeVisible, stampVisible, flattenImage, layerViaCopy, layerViaCut,
    } = useEditorStore();

    const [editingNameId, setEditingNameId] = useState<string | null>(null);
    const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; layerId: string } | null>(null);

    // Tick periodically so thumbnails reflect canvas content updates from painting.
    const [thumbTick, setThumbTick] = useState(0);
    useEffect(() => {
        const id = window.setInterval(() => setThumbTick(t => t + 1), 500);
        return () => window.clearInterval(id);
    }, []);

    useEffect(() => {
        const closeMenu = () => setContextMenu(null);
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, []);

    const active = layers.find(l => l.id === activeLayerId);

    const handleContextMenu = (e: React.MouseEvent, layerId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, layerId });
    };

    const handleDragStart = (_e: React.DragEvent, id: string) => setDraggedLayerId(id);
    const handleDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedLayerId || draggedLayerId === targetId) return;
    };
    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedLayerId || draggedLayerId === targetId) return;
        const dragIndex = layers.findIndex(l => l.id === draggedLayerId);
        const hoverIndex = layers.findIndex(l => l.id === targetId);
        reorderLayers(dragIndex, hoverIndex);
        setDraggedLayerId(null);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'hsl(var(--bg-panel))' }}>

            {/* ── Blend mode + Opacity row ── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 8px',
                borderBottom: '1px solid hsl(var(--border-light))',
                opacity: active ? 1 : 0.5,
            }}>
                <select
                    value={active?.blendMode ?? 'source-over'}
                    onChange={(e) => active && setLayerBlendMode(active.id, e.target.value as GlobalCompositeOperation)}
                    disabled={!active}
                    style={{
                        flex: 1, minWidth: 80,
                        background: 'hsl(var(--bg-input))',
                        color: 'hsl(var(--text-main))',
                        border: '1px solid hsl(var(--border-light))',
                        borderRadius: 2,
                        fontSize: 11,
                        padding: '2px 4px',
                    }}
                >
                    {BLEND_MODE_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <span style={{ fontSize: 11, color: 'hsl(var(--text-muted))', whiteSpace: 'nowrap' }}>Opacity:</span>
                <input
                    type="number" min={0} max={100}
                    value={Math.round((active?.opacity ?? 1) * 100)}
                    onChange={(e) => {
                        if (!active) return;
                        const v = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                        setLayerOpacity(active.id, v / 100);
                    }}
                    disabled={!active}
                    style={{
                        width: 40,
                        background: 'hsl(var(--bg-input))',
                        color: 'hsl(var(--text-main))',
                        border: '1px solid hsl(var(--border-light))',
                        borderRadius: 2, fontSize: 11, padding: '2px 4px',
                    }}
                />
                <span style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>%</span>
            </div>

            {/* ── Lock toolbar + Fill row ── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 8px',
                borderBottom: '1px solid hsl(var(--border-light))',
                opacity: active ? 1 : 0.5,
            }}>
                <span style={{ fontSize: 11, color: 'hsl(var(--text-muted))', marginRight: 2 }}>Lock:</span>
                <button
                    title="Lock transparent pixels"
                    onClick={() => active && setLayerLock(active.id, 'transparency', !active.locks.transparency)}
                    disabled={!active}
                    style={headBtnStyle(!!active?.locks.transparency)}
                ><TransparencyLockIcon /></button>
                <button
                    title="Lock image pixels"
                    onClick={() => active && setLayerLock(active.id, 'image', !active.locks.image)}
                    disabled={!active}
                    style={headBtnStyle(!!active?.locks.image)}
                ><Brush size={12} /></button>
                <button
                    title="Lock position"
                    onClick={() => active && setLayerLock(active.id, 'position', !active.locks.position)}
                    disabled={!active}
                    style={headBtnStyle(!!active?.locks.position)}
                ><Move size={12} /></button>
                <button
                    title="Lock all"
                    onClick={() => active && setLayerLock(active.id, 'all', !active.locks.all)}
                    disabled={!active}
                    style={headBtnStyle(!!active?.locks.all)}
                ><Lock size={12} /></button>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>Fill:</span>
                <input
                    type="number" min={0} max={100}
                    value={Math.round((active?.fill ?? 1) * 100)}
                    onChange={(e) => {
                        if (!active) return;
                        const v = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                        setLayerFill(active.id, v / 100);
                    }}
                    disabled={!active}
                    style={{
                        width: 40,
                        background: 'hsl(var(--bg-input))',
                        color: 'hsl(var(--text-main))',
                        border: '1px solid hsl(var(--border-light))',
                        borderRadius: 2, fontSize: 11, padding: '2px 4px',
                    }}
                />
                <span style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>%</span>
            </div>

            {/* ── Layer list ── */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {layers.length === 0 && (
                    <div style={{ padding: 16, color: 'hsl(var(--text-muted))', fontSize: 12, textAlign: 'center' }}>
                        No layers
                    </div>
                )}
                {[...layers].reverse().map((layer) => {
                    const isActive = activeLayerId === layer.id;
                    const isLocked = layer.locks.all || layer.locks.transparency || layer.locks.image || layer.locks.position;
                    return (
                        <div
                            key={layer.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, layer.id)}
                            onDragOver={(e) => handleDragOver(e, layer.id)}
                            onDrop={(e) => handleDrop(e, layer.id)}
                            onClick={() => setActiveLayer(layer.id)}
                            onContextMenu={(e) => handleContextMenu(e, layer.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '4px 8px',
                                backgroundColor: isActive ? 'hsl(var(--accent-primary))' : 'transparent',
                                cursor: 'pointer',
                                userSelect: 'none',
                                opacity: draggedLayerId === layer.id ? 0.5 : 1,
                                minHeight: 44,
                                borderBottom: '1px solid hsl(var(--border-mid))',
                            }}
                        >
                            {/* Eye / visibility */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (e.altKey) soloLayer(layer.id);
                                    else toggleLayerVisibility(layer.id);
                                }}
                                title="Toggle visibility (Alt+Click to solo)"
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                    color: isActive ? '#fff' : 'hsl(var(--text-muted))',
                                    display: 'flex', flexShrink: 0,
                                }}
                            >
                                {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>

                            {/* Thumbnail */}
                            <LayerThumbnail layer={layer} tick={thumbTick} />

                            {/* Color-tag dot + name */}
                            {layer.colorTag !== 'none' && (
                                <span
                                    title={`Color tag: ${layer.colorTag}`}
                                    style={{
                                        width: 6, height: 22,
                                        backgroundColor: COLOR_TAGS.find(t => t.id === layer.colorTag)?.color ?? 'transparent',
                                        flexShrink: 0,
                                        borderRadius: 1,
                                    }} />
                            )}

                            {editingNameId === layer.id ? (
                                <input
                                    autoFocus
                                    defaultValue={layer.name}
                                    onClick={(e) => e.stopPropagation()}
                                    onBlur={(e) => { renameLayer(layer.id, e.currentTarget.value); setEditingNameId(null); }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') { renameLayer(layer.id, e.currentTarget.value); setEditingNameId(null); }
                                        else if (e.key === 'Escape') setEditingNameId(null);
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
                                    onDoubleClick={(e) => { e.stopPropagation(); setEditingNameId(layer.id); }}
                                    style={{
                                        flex: 1, fontSize: 12,
                                        color: isActive ? '#fff' : 'hsl(var(--text-main))',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    }}>
                                    {layer.name}
                                </span>
                            )}

                            {/* Lock indicator on right side */}
                            {isLocked && (
                                <Lock
                                    size={12}
                                    style={{ color: isActive ? '#fff' : 'hsl(var(--text-muted))', flexShrink: 0 }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Bottom toolbar: Add + Remove only ── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                padding: '4px 8px', gap: 4,
                borderTop: '1px solid hsl(var(--border-light))',
                backgroundColor: 'hsl(var(--bg-header))',
                flexShrink: 0,
            }}>
                <button
                    title="New Layer"
                    onClick={() => addLayer()}
                    style={HEAD_BTN}
                ><Plus size={14} /></button>
                <button
                    title="Delete Layer"
                    onClick={() => activeLayerId && removeLayer(activeLayerId)}
                    disabled={!activeLayerId}
                    style={{ ...HEAD_BTN, opacity: activeLayerId ? 1 : 0.4 }}
                ><Trash2 size={14} /></button>
            </div>

            {/* Context menu */}
            {contextMenu && (
                <div
                    style={{
                        position: 'fixed',
                        top: contextMenu.y, left: contextMenu.x,
                        backgroundColor: 'hsl(var(--bg-panel))',
                        border: '1px solid hsl(var(--border-light))',
                        boxShadow: 'var(--shadow-menu)',
                        padding: '4px 0',
                        zIndex: 1000,
                        minWidth: 160,
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {[
                        { label: 'Rename', run: () => setEditingNameId(contextMenu.layerId) },
                        { label: 'Layer via Copy', run: () => layerViaCopy() },
                        { label: 'Layer via Cut', run: () => layerViaCut() },
                        { label: 'Merge Down', run: () => mergeLayerDown(contextMenu.layerId) },
                        { label: 'Merge Visible', run: () => mergeVisible() },
                        { label: 'Stamp Visible', run: () => stampVisible() },
                        { label: 'Flatten Image', run: () => flattenImage() },
                    ].map(item => (
                        <button
                            key={item.label}
                            onClick={() => { item.run(); setContextMenu(null); }}
                            style={{
                                display: 'block', width: '100%', textAlign: 'left',
                                padding: '4px 12px', background: 'none', border: 'none',
                                color: 'hsl(var(--text-main))', cursor: 'pointer', fontSize: 12,
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--accent-primary))'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >{item.label}</button>
                    ))}
                    <div style={{ height: 1, background: 'hsl(var(--border-light))', margin: '4px 0' }} />
                    <div style={{ display: 'flex', gap: 2, padding: '4px 8px' }}>
                        {COLOR_TAGS.map(t => (
                            <button
                                key={t.id}
                                title={t.id}
                                onClick={() => { setLayerColorTag(contextMenu.layerId, t.id); setContextMenu(null); }}
                                style={{
                                    width: 14, height: 14,
                                    border: '1px solid hsl(var(--border-light))',
                                    backgroundColor: t.color === 'transparent' ? 'hsl(var(--bg-input))' : t.color,
                                    borderRadius: '50%',
                                    cursor: 'pointer',
                                    padding: 0,
                                }} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
