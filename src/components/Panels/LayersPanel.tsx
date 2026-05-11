import { Eye, EyeOff, Plus, Trash2, Brush, Move, Lock, Folder, FolderPlus, ChevronDown, ChevronRight, Link2, Unlink2 } from 'lucide-react';
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
        if (layer.kind === 'group') {
            cx.fillStyle = 'rgba(245, 158, 11, 0.18)';
            cx.fillRect(0, 0, size, size);
            cx.strokeStyle = '#d97706';
            cx.lineWidth = 1.5;
            cx.beginPath();
            cx.roundRect(5, 11, size - 10, size - 14, 3);
            cx.stroke();
            cx.fillStyle = '#f59e0b';
            cx.fillRect(8, 8, 11, 5);
            return;
        }
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

function MaskThumbnail({ layer, size = 28, tick }: { layer: Layer; size?: number; tick: number }) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const c = ref.current;
        if (!c) return;
        const cx = c.getContext('2d');
        if (!cx) return;
        cx.clearRect(0, 0, size, size);
        cx.fillStyle = '#111827';
        cx.fillRect(0, 0, size, size);
        if (layer.mask) {
            const mw = layer.mask.canvas.width;
            const mh = layer.mask.canvas.height;
            const scale = Math.min(size / mw, size / mh);
            const dw = mw * scale;
            const dh = mh * scale;
            cx.drawImage(layer.mask.canvas, (size - dw) / 2, (size - dh) / 2, dw, dh);
            if (!layer.mask.enabled) {
                cx.strokeStyle = '#ef4444';
                cx.lineWidth = 3;
                cx.beginPath();
                cx.moveTo(3, size - 3);
                cx.lineTo(size - 3, 3);
                cx.stroke();
            }
        }
    }, [layer, size, tick]);
    return (
        <canvas
            ref={ref}
            width={size}
            height={size}
            data-testid={`mask-thumbnail-${layer.id}`}
            data-mask-enabled={layer.mask?.enabled ? 'true' : 'false'}
            style={{
                width: size,
                height: size,
                border: layer.mask?.enabled ? '1px solid hsl(var(--border-light))' : '1px solid #ef4444',
                flexShrink: 0,
            }}
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
        layers, activeLayerId, selectedLayerIds,
        addLayer, createLayerGroup, groupLayers, removeLayer, setActiveLayer, toggleLayerVisibility, soloLayer,
        renameLayer, setLayerLock, setLayerColorTag, setLayerFill,
        reorderLayers, setLayerOpacity, setLayerBlendMode,
        mergeLayerDown, mergeVisible, stampVisible, flattenImage, layerViaCopy, layerViaCut,
        ungroupLayerGroup, toggleLayerGroupExpanded, selectLayer,
        addLayerMask, removeLayerMask, applyLayerMask, setLayerMaskEnabled, setLayerMaskLinked,
        activeLayerEditTarget, setActiveLayerEditTarget,
    } = useEditorStore();
    const editTarget = activeLayerEditTarget;

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
    const visibleLayerRows = layers
        .map(layer => {
            let depth = 0;
            let parentId = layer.parentId;
            let hiddenByCollapsedParent = false;
            while (parentId) {
                const parent = layers.find(item => item.id === parentId);
                if (!parent) break;
                depth += 1;
                if (parent.kind === 'group' && !parent.expanded) hiddenByCollapsedParent = true;
                parentId = parent.parentId;
            }
            return { layer, depth, hiddenByCollapsedParent };
        })
        .filter(row => !row.hiddenByCollapsedParent);

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
                {[...visibleLayerRows].reverse().map(({ layer, depth }) => {
                    const isActive = activeLayerId === layer.id;
                    const isSelected = selectedLayerIds.includes(layer.id);
                    const isLocked = layer.locks.all || layer.locks.transparency || layer.locks.image || layer.locks.position;
                    return (
                        <div
                            key={layer.id}
                            data-testid={`layer-row-${layer.id}`}
                            data-layer-selected={isSelected ? 'true' : 'false'}
                            data-layer-active={isActive ? 'true' : 'false'}
                            draggable
                            onDragStart={(e) => handleDragStart(e, layer.id)}
                            onDragOver={(e) => handleDragOver(e, layer.id)}
                            onDrop={(e) => handleDrop(e, layer.id)}
                            onClick={(e) => {
                                if (e.shiftKey) selectLayer(layer.id, 'range');
                                else if (e.metaKey || e.ctrlKey) selectLayer(layer.id, 'toggle');
                                else setActiveLayer(layer.id);
                            }}
                            onContextMenu={(e) => handleContextMenu(e, layer.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: `4px 8px 4px ${8 + depth * 18}px`,
                                backgroundColor: isActive
                                    ? 'hsl(var(--accent-primary))'
                                    : isSelected
                                        ? 'hsl(var(--bg-input))'
                                        : 'transparent',
                                cursor: 'pointer',
                                userSelect: 'none',
                                opacity: draggedLayerId === layer.id ? 0.5 : 1,
                                minHeight: 44,
                                borderBottom: '1px solid hsl(var(--border-mid))',
                                boxShadow: isSelected && !isActive ? 'inset 3px 0 0 hsl(var(--accent-primary))' : 'none',
                            }}
                            >
                            {layer.kind === 'group' && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleLayerGroupExpanded(layer.id);
                                    }}
                                    title={layer.expanded ? 'Collapse group' : 'Expand group'}
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                        color: isActive ? '#fff' : 'hsl(var(--text-muted))',
                                        display: 'flex', flexShrink: 0,
                                    }}
                                >
                                    {layer.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                            )}

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

                            {layer.mask && (
                                <>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setLayerMaskLinked(layer.id, !layer.mask?.linked);
                                        }}
                                        title={layer.mask.linked ? 'Unlink layer and mask' : 'Link layer and mask'}
                                        data-testid={`mask-link-${layer.id}`}
                                        data-mask-linked={layer.mask.linked ? 'true' : 'false'}
                                        style={{
                                            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                            color: isActive ? '#fff' : 'hsl(var(--text-muted))',
                                            display: 'flex', alignItems: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {layer.mask.linked ? <Link2 size={12} /> : <Unlink2 size={12} />}
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (e.altKey || e.metaKey) {
                                                setLayerMaskEnabled(layer.id, !layer.mask?.enabled);
                                                return;
                                            }
                                            setActiveLayer(layer.id);
                                            setActiveLayerEditTarget('mask');
                                        }}
                                        title={editTarget === 'mask' && activeLayerId === layer.id
                                            ? 'Mask is the active edit target — Alt-click to disable'
                                            : 'Click to paint into the mask. Alt-click to enable/disable.'}
                                        style={{
                                            background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0,
                                            outline: editTarget === 'mask' && activeLayerId === layer.id
                                                ? '2px solid hsl(var(--accent-primary))'
                                                : 'none',
                                            outlineOffset: -1,
                                        }}
                                    >
                                        <MaskThumbnail layer={layer} tick={thumbTick} />
                                    </button>
                                </>
                            )}

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

                            {/* fx indicator: any enabled effect on this layer */}
                            {layer.effects && layer.effects.some(e => e.enabled) && (
                                <span
                                    data-testid={`layer-fx-${layer.id}`}
                                    title="Layer has effects"
                                    style={{
                                        fontSize: 9,
                                        fontWeight: 700,
                                        fontStyle: 'italic',
                                        padding: '1px 4px',
                                        borderRadius: 2,
                                        backgroundColor: isActive ? 'rgba(255,255,255,0.18)' : 'hsl(var(--bg-input))',
                                        color: isActive ? '#fff' : 'hsl(var(--text-muted))',
                                        flexShrink: 0,
                                        letterSpacing: '0.05em',
                                    }}
                                >fx</span>
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
                                    {layer.kind === 'group' && <Folder size={12} style={{ marginRight: 4, verticalAlign: -2 }} />}
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
                    title="Add Layer Mask"
                    onClick={() => activeLayerId && addLayerMask(activeLayerId, 'reveal-all')}
                    disabled={!activeLayerId}
                    style={{ ...HEAD_BTN, opacity: activeLayerId ? 1 : 0.4, fontSize: 11, fontWeight: 700 }}
                >M</button>
                <button
                    title={selectedLayerIds.length > 1 ? 'Group Selected Layers' : 'New Group'}
                    onClick={() => {
                        if (selectedLayerIds.length > 1) groupLayers(selectedLayerIds);
                        else createLayerGroup();
                    }}
                    style={HEAD_BTN}
                ><FolderPlus size={14} /></button>
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
                        { label: 'Ungroup Layers', run: () => ungroupLayerGroup(contextMenu.layerId), disabled: layers.find(layer => layer.id === contextMenu.layerId)?.kind !== 'group' },
                        { label: 'Layer via Copy', run: () => layerViaCopy() },
                        { label: 'Layer via Cut', run: () => layerViaCut() },
                        { label: 'Merge Down', run: () => mergeLayerDown(contextMenu.layerId) },
                        { label: 'Merge Visible', run: () => mergeVisible() },
                        { label: 'Stamp Visible', run: () => stampVisible() },
                        { label: 'Flatten Image', run: () => flattenImage() },
                        { label: 'Apply Layer Mask', run: () => applyLayerMask(contextMenu.layerId), disabled: !layers.find(layer => layer.id === contextMenu.layerId)?.mask },
                        { label: 'Delete Layer Mask', run: () => removeLayerMask(contextMenu.layerId), disabled: !layers.find(layer => layer.id === contextMenu.layerId)?.mask },
                        {
                            label: layers.find(layer => layer.id === contextMenu.layerId)?.mask?.enabled === false ? 'Enable Layer Mask' : 'Disable Layer Mask',
                            run: () => {
                                const layer = layers.find(item => item.id === contextMenu.layerId);
                                if (layer?.mask) setLayerMaskEnabled(layer.id, !layer.mask.enabled);
                            },
                            disabled: !layers.find(layer => layer.id === contextMenu.layerId)?.mask,
                        },
                    ].map(item => (
                        <button
                            key={item.label}
                            disabled={item.disabled}
                            onClick={() => { if (!item.disabled) item.run(); setContextMenu(null); }}
                            style={{
                                display: 'block', width: '100%', textAlign: 'left',
                                padding: '4px 12px', background: 'none', border: 'none',
                                color: item.disabled ? 'hsl(var(--text-muted))' : 'hsl(var(--text-main))',
                                cursor: item.disabled ? 'default' : 'pointer',
                                fontSize: 12,
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
