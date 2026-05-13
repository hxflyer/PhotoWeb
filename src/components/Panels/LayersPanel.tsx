import { Eye, EyeOff, Plus, Trash2, Brush, Move, Lock, Folder, FolderPlus, ChevronDown, ChevronRight, Link2, Unlink2 } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { useState, useEffect, useRef } from 'react';
import type { LayerColorTag } from '../../core/Layer';
import type { Layer } from '../../core/Layer';
import { blendModeLabel, PHOTOSHOP_BLEND_MODE_OPTIONS, type BlendModeId } from '../../core/blendModes';
import { PanelFlyout, type PanelFlyoutItem } from './PanelFlyout';
import { LayerStyleDialog } from '../Dialogs/LayerStyleDialog';

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
const STYLE_EFFECT_MENU = [
    { kind: 'drop-shadow' as const, label: 'Drop Shadow…' },
    { kind: 'inner-shadow' as const, label: 'Inner Shadow…' },
    { kind: 'outer-glow' as const, label: 'Outer Glow…' },
    { kind: 'inner-glow' as const, label: 'Inner Glow…' },
    { kind: 'bevel-emboss' as const, label: 'Bevel & Emboss…' },
    { kind: 'satin' as const, label: 'Satin…' },
    { kind: 'color-overlay' as const, label: 'Color Overlay…' },
    { kind: 'gradient-overlay' as const, label: 'Gradient Overlay…' },
    { kind: 'pattern-overlay' as const, label: 'Pattern Overlay…' },
    { kind: 'stroke' as const, label: 'Stroke…' },
];

type LayerThumbnailPreference = 'none' | 'small' | 'medium' | 'large';

const THUMBNAIL_STORAGE_KEY = 'photoweb.layers.thumbnailSize';
const THUMBNAIL_SIZES: Record<Exclude<LayerThumbnailPreference, 'none'>, number> = {
    small: 24,
    medium: 36,
    large: 52,
};

function loadThumbnailPreference(): LayerThumbnailPreference {
    if (typeof localStorage === 'undefined') return 'medium';
    try {
        const value = localStorage.getItem(THUMBNAIL_STORAGE_KEY);
        if (value === 'none' || value === 'small' || value === 'medium' || value === 'large') return value;
    } catch {
        // Storage is optional.
    }
    return 'medium';
}

function persistThumbnailPreference(value: LayerThumbnailPreference): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(THUMBNAIL_STORAGE_KEY, value);
    } catch {
        // Storage is optional.
    }
}

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

function LayersPanelOptionsDialog({
    isOpen,
    value,
    onChange,
    onClose,
}: {
    isOpen: boolean;
    value: LayerThumbnailPreference;
    onChange: (value: LayerThumbnailPreference) => void;
    onClose: () => void;
}) {
    if (!isOpen) return null;
    const choices: { value: LayerThumbnailPreference; label: string; box: number }[] = [
        { value: 'small', label: 'Small', box: 24 },
        { value: 'medium', label: 'Medium', box: 34 },
        { value: 'large', label: 'Large', box: 46 },
        { value: 'none', label: 'None', box: 0 },
    ];
    return (
        <div
            data-testid="layers-panel-options-dialog"
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="layers-panel-options-title"
                style={{ width: 330, background: 'hsl(var(--bg-panel))', color: 'hsl(var(--text-main))', border: '1px solid hsl(var(--border-light))', borderRadius: 8, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ padding: '12px 16px', background: 'hsl(var(--bg-header))', borderBottom: '1px solid hsl(var(--border-light))' }}>
                    <h3 id="layers-panel-options-title" style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Layers Panel Options</h3>
                </div>
                <div style={{ padding: 16 }}>
                    <div style={{ fontSize: 12, marginBottom: 10, color: 'hsl(var(--text-muted))' }}>Thumbnail Size</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                        {choices.map(choice => (
                            <label key={choice.value} style={{ display: 'grid', justifyItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer' }}>
                                <span
                                    style={{
                                        width: 52,
                                        height: 52,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: value === choice.value ? '2px solid hsl(var(--accent-primary))' : '1px solid hsl(var(--border-light))',
                                        background: 'hsl(var(--bg-input))',
                                    }}
                                >
                                    {choice.value !== 'none' && (
                                        <span
                                            style={{
                                                width: choice.box,
                                                height: choice.box,
                                                border: '1px solid hsl(var(--border-light))',
                                                background: 'linear-gradient(45deg, #fff 25%, #bbb 25% 50%, #fff 50% 75%, #bbb 75%)',
                                                backgroundSize: '10px 10px',
                                            }}
                                        />
                                    )}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <input
                                        data-testid={`layers-panel-thumbnail-${choice.value}`}
                                        type="radio"
                                        name="layers-thumbnail-size"
                                        checked={value === choice.value}
                                        onChange={() => onChange(choice.value)}
                                    />
                                    {choice.label}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
                <div style={{ padding: '12px 16px', background: 'hsl(var(--bg-header))', borderTop: '1px solid hsl(var(--border-light))', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={onClose} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid hsl(var(--border-light))', color: 'hsl(var(--text-main))', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                    <button data-testid="layers-panel-options-ok" onClick={onClose} style={{ padding: '6px 12px', background: 'hsl(var(--accent-primary))', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>OK</button>
                </div>
            </div>
        </div>
    );
}

function BlendModeMenu({
    activeLayer,
    disabled,
    onPreview,
    onCommit,
}: {
    activeLayer: Layer | undefined;
    disabled: boolean;
    onPreview: (id: string, mode: BlendModeId) => void;
    onCommit: (id: string, mode: BlendModeId) => void;
}) {
    const [open, setOpen] = useState(false);
    const originalModeRef = useRef<BlendModeId | null>(null);
    const activeId = activeLayer?.id ?? null;
    const currentMode = activeLayer?.blendMode ?? 'normal';

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || !activeId || !originalModeRef.current) return;
            event.preventDefault();
            onPreview(activeId, originalModeRef.current);
            setOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [activeId, onPreview, open]);

    const startPreview = () => {
        if (!activeLayer || disabled) return;
        originalModeRef.current = activeLayer.blendMode;
        setOpen(true);
    };

    const closeAndRevert = () => {
        if (activeId && originalModeRef.current) onPreview(activeId, originalModeRef.current);
        setOpen(false);
    };

    const commit = (mode: BlendModeId) => {
        if (!activeId) return;
        const original = originalModeRef.current;
        if (original) onPreview(activeId, original);
        onCommit(activeId, mode);
        setOpen(false);
    };

    return (
        <div style={{ position: 'relative', flex: 1, minWidth: 96 }}>
            <button
                type="button"
                data-testid="layers-blend-mode-button"
                disabled={disabled || !activeLayer}
                onClick={() => (open ? closeAndRevert() : startPreview())}
                style={{
                    width: '100%',
                    height: 22,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 6,
                    background: 'hsl(var(--bg-input))',
                    color: 'hsl(var(--text-main))',
                    border: '1px solid hsl(var(--border-light))',
                    borderRadius: 2,
                    fontSize: 11,
                    padding: '2px 6px',
                    cursor: disabled || !activeLayer ? 'default' : 'pointer',
                    opacity: disabled || !activeLayer ? 0.55 : 1,
                }}
            >
                <span>{blendModeLabel(currentMode)}</span>
                <ChevronDown size={12} />
            </button>
            {open && activeLayer && (
                <div
                    data-testid="layers-blend-mode-menu"
                    onMouseLeave={closeAndRevert}
                    style={{
                        position: 'absolute',
                        top: 24,
                        left: 0,
                        width: 188,
                        maxHeight: 360,
                        overflowY: 'auto',
                        background: 'hsl(var(--bg-panel))',
                        border: '1px solid hsl(var(--border-light))',
                        boxShadow: 'var(--shadow-lg)',
                        zIndex: 50,
                        padding: '4px 0',
                    }}
                >
                    {PHOTOSHOP_BLEND_MODE_OPTIONS.map((mode, index) => {
                        const prev = PHOTOSHOP_BLEND_MODE_OPTIONS[index - 1];
                        const separator = prev && prev.group !== mode.group;
                        return (
                            <div key={mode.id}>
                                {separator && <div style={{ height: 1, margin: '4px 0', background: 'hsl(var(--border-light))' }} />}
                                <button
                                    type="button"
                                    data-testid={`layers-blend-mode-${mode.id}`}
                                    onMouseEnter={() => onPreview(activeLayer.id, mode.id)}
                                    onFocus={() => onPreview(activeLayer.id, mode.id)}
                                    onClick={() => commit(mode.id)}
                                    style={{
                                        width: '100%',
                                        display: 'block',
                                        textAlign: 'left',
                                        background: currentMode === mode.id ? 'hsl(var(--accent-primary) / 0.22)' : 'transparent',
                                        color: 'hsl(var(--text-main))',
                                        border: 0,
                                        fontSize: 12,
                                        padding: '3px 14px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {mode.label}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export function LayersPanel() {
    const {
        layers, activeLayerId, selectedLayerIds,
        addLayer, createLayerGroup, groupLayers, removeLayer, setActiveLayer, toggleLayerVisibility, soloLayer,
        renameLayer, setLayerLock, setLayerColorTag, setLayerFill,
        reorderLayers, moveLayerToGroup, setLayerOpacity, setLayerBlendMode, previewLayerBlendMode,
        mergeLayerDown, mergeVisible, stampVisible, flattenImage, layerViaCopy, layerViaCut,
        ungroupLayerGroup, toggleLayerGroupExpanded, selectLayer, setSelectedLayerIds,
        addLayerMask, removeLayerMask, applyLayerMask, setLayerMaskEnabled, setLayerMaskLinked,
        addLayerEffect,
        copyLayerStyle, pasteLayerStyle,
        activeLayerEditTarget, setActiveLayerEditTarget,
        openNewLayerDialog,
        convertBackgroundLayer,
    } = useEditorStore();
    const editTarget = activeLayerEditTarget;

    const [editingNameId, setEditingNameId] = useState<string | null>(null);
    const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
    const [draggedEffectsLayerId, setDraggedEffectsLayerId] = useState<string | null>(null);
    const draggedEffectsLayerIdRef = useRef<string | null>(null);
    const [dropHint, setDropHint] = useState<{ targetId: string; zone: 'above' | 'inside' | 'below' } | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; layerId: string; submenu: 'main' | 'fx' } | null>(null);
    const [layerStyleDialog, setLayerStyleDialog] = useState<{ layerId: string; tab: string } | null>(null);
    const [thumbnailPreference, setThumbnailPreference] = useState<LayerThumbnailPreference>(() => loadThumbnailPreference());
    const [panelOptionsOpen, setPanelOptionsOpen] = useState(false);

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
    const activeIsBackground = !!active?.isBackground;
    const thumbnailSize = thumbnailPreference === 'none' ? 0 : THUMBNAIL_SIZES[thumbnailPreference];
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
        setContextMenu({ x: e.clientX, y: e.clientY, layerId, submenu: 'main' });
    };

    const handleVisibleRowClick = (e: React.MouseEvent, layerId: string) => {
        if (e.shiftKey) {
            // Range select against the displayed visible-row order (not the internal flat array)
            // so collapsed children of groups aren't silently included.
            const visibleIds = visibleLayerRows.map(r => r.layer.id);
            const anchorId = useEditorStore.getState().layerSelectionAnchorId ?? activeLayerId ?? layerId;
            const anchorIdx = visibleIds.indexOf(anchorId);
            const targetIdx = visibleIds.indexOf(layerId);
            if (anchorIdx === -1 || targetIdx === -1) {
                setSelectedLayerIds([layerId]);
                return;
            }
            const [from, to] = anchorIdx <= targetIdx ? [anchorIdx, targetIdx] : [targetIdx, anchorIdx];
            setSelectedLayerIds(visibleIds.slice(from, to + 1), layerId);
        } else if (e.metaKey || e.ctrlKey) {
            selectLayer(layerId, 'toggle');
        } else {
            setActiveLayer(layerId);
        }
    };

    const handleDragStart = (_e: React.DragEvent, id: string) => {
        setDraggedLayerId(id);
        setDraggedEffectsLayerId(null);
        draggedEffectsLayerIdRef.current = null;
        setDropHint(null);
    };

    const computeDropZone = (e: React.DragEvent, targetLayer: Layer): 'above' | 'inside' | 'below' => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const relativeY = e.clientY - rect.top;
        const fraction = relativeY / rect.height;
        if (targetLayer.kind === 'group' && fraction > 0.25 && fraction < 0.75) return 'inside';
        return fraction < 0.5 ? 'above' : 'below';
    };

    const handleDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        const effectsSourceId = draggedEffectsLayerIdRef.current ?? draggedEffectsLayerId;
        if (effectsSourceId) {
            if (effectsSourceId !== targetId) e.dataTransfer.dropEffect = 'copy';
            setDropHint(null);
            return;
        }
        if (!draggedLayerId || draggedLayerId === targetId) {
            setDropHint(null);
            return;
        }
        const targetLayer = layers.find(l => l.id === targetId);
        if (!targetLayer) return;
        // Don't allow dropping a group onto its own descendant or itself
        const dragged = layers.find(l => l.id === draggedLayerId);
        if (dragged && dragged.kind === 'group') {
            let pid: string | null = targetLayer.parentId;
            while (pid) {
                if (pid === draggedLayerId) { setDropHint(null); return; }
                pid = layers.find(l => l.id === pid)?.parentId ?? null;
            }
        }
        const zone = computeDropZone(e, targetLayer);
        setDropHint({ targetId, zone });
    };

    const handleDragLeave = () => setDropHint(null);

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        const effectsSourceId = draggedEffectsLayerIdRef.current ?? draggedEffectsLayerId;
        if (effectsSourceId) {
            if (effectsSourceId !== targetId) {
                copyLayerStyle(effectsSourceId);
                pasteLayerStyle(targetId);
            }
            draggedEffectsLayerIdRef.current = null;
            setDraggedEffectsLayerId(null);
            setDraggedLayerId(null);
            setDropHint(null);
            return;
        }
        if (!draggedLayerId || draggedLayerId === targetId) {
            setDraggedLayerId(null);
            setDropHint(null);
            return;
        }
        const targetLayer = layers.find(l => l.id === targetId);
        if (!targetLayer) {
            setDraggedLayerId(null);
            setDropHint(null);
            return;
        }
        const zone = computeDropZone(e, targetLayer);
        if (zone === 'inside' && targetLayer.kind === 'group') {
            // Shift on release = drop at bottom of group's children; default = top.
            const position: 'top' | 'bottom' = e.shiftKey ? 'bottom' : 'top';
            moveLayerToGroup(draggedLayerId, targetId, position);
        } else {
            const dragIndex = layers.findIndex(l => l.id === draggedLayerId);
            // For "above" zone, drop directly above the target row in the displayed (top-down) panel
            // which means AFTER the target in the flat array (the flat array reads bottom-up).
            // For "below" zone, drop right after the target in the panel = before the target in the flat array.
            const hoverIndex = zone === 'above'
                ? layers.findIndex(l => l.id === targetId) + 1
                : layers.findIndex(l => l.id === targetId);
            reorderLayers(dragIndex, Math.min(Math.max(hoverIndex, 0), layers.length - 1));
        }
        setDraggedLayerId(null);
        setDropHint(null);
    };

    const setThumbs = (value: LayerThumbnailPreference) => {
        setThumbnailPreference(value);
        persistThumbnailPreference(value);
    };

    const flyoutItems: PanelFlyoutItem[] = [
        { label: 'New Layer…', onClick: () => openNewLayerDialog() },
        { label: 'Duplicate Layer', onClick: () => activeLayerId && layerViaCopy(), disabled: !activeLayerId },
        { label: 'Delete Layer', onClick: () => activeLayerId && removeLayer(activeLayerId), disabled: !activeLayerId || activeIsBackground },
        { separator: true, label: '' },
        { label: 'New Group', onClick: () => (selectedLayerIds.length > 1 ? groupLayers(selectedLayerIds) : createLayerGroup()) },
        { label: 'Ungroup Layers', onClick: () => activeLayerId && ungroupLayerGroup(activeLayerId), disabled: !activeLayerId || layers.find(l => l.id === activeLayerId)?.kind !== 'group' },
        { separator: true, label: '' },
        {
            label: 'Thumbnail Size',
            submenuItems: [
                { label: 'Small', checked: thumbnailPreference === 'small', onClick: () => setThumbs('small') },
                { label: 'Medium', checked: thumbnailPreference === 'medium', onClick: () => setThumbs('medium') },
                { label: 'Large', checked: thumbnailPreference === 'large', onClick: () => setThumbs('large') },
                { label: 'No Thumbnails', checked: thumbnailPreference === 'none', onClick: () => setThumbs('none') },
            ],
        },
        { label: 'Panel Options…', onClick: () => setPanelOptionsOpen(true) },
        { separator: true, label: '' },
        { label: 'Merge Down', onClick: () => activeLayerId && mergeLayerDown(activeLayerId), disabled: !activeLayerId },
        { label: 'Merge Visible', onClick: () => mergeVisible() },
        { label: 'Stamp Visible', onClick: () => stampVisible() },
        { label: 'Flatten Image', onClick: () => flattenImage() },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'hsl(var(--bg-panel))' }}>

            {/* ── Panel header (title + flyout) ── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '4px 8px',
                borderBottom: '1px solid hsl(var(--border-light))',
                backgroundColor: 'hsl(var(--bg-header))',
            }}>
                <span style={{ fontSize: 11, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Layers</span>
                <PanelFlyout items={flyoutItems} label="Layers panel menu" testId="layers-panel-flyout" />
            </div>

            {/* ── Blend mode + Opacity row ── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 8px',
                borderBottom: '1px solid hsl(var(--border-light))',
                opacity: active ? 1 : 0.5,
            }}>
                <BlendModeMenu
                    activeLayer={active}
                    disabled={!active || activeIsBackground}
                    onPreview={previewLayerBlendMode}
                    onCommit={setLayerBlendMode}
                />
                <span style={{ fontSize: 11, color: 'hsl(var(--text-muted))', whiteSpace: 'nowrap' }}>Opacity:</span>
                <input
                    type="number" min={0} max={100}
                    value={Math.round((active?.opacity ?? 1) * 100)}
                    onChange={(e) => {
                        if (!active) return;
                        const v = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                        setLayerOpacity(active.id, v / 100);
                    }}
                    disabled={!active || activeIsBackground}
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
                    disabled={!active || activeIsBackground}
                    style={headBtnStyle(!!active?.lockTransparency)}
                ><TransparencyLockIcon /></button>
                <button
                    title="Lock image pixels"
                    onClick={() => active && setLayerLock(active.id, 'image', !active.locks.image)}
                    disabled={!active || activeIsBackground}
                    style={headBtnStyle(!!active?.locks.image)}
                ><Brush size={12} /></button>
                <button
                    title="Lock position"
                    onClick={() => active && setLayerLock(active.id, 'position', !active.locks.position)}
                    disabled={!active || activeIsBackground}
                    style={headBtnStyle(!!active?.lockPosition)}
                ><Move size={12} /></button>
                <button
                    title="Lock all"
                    onClick={() => active && setLayerLock(active.id, 'all', !active.locks.all)}
                    disabled={!active || activeIsBackground}
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
                    disabled={!active || activeIsBackground}
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
                    const isLocked = layer.isBackground || layer.locks.all || layer.locks.transparency || layer.locks.image || layer.locks.position;
                    return (
                        <div
                            key={layer.id}
                            data-testid={`layer-row-${layer.id}`}
                            data-layer-selected={isSelected ? 'true' : 'false'}
                            data-layer-active={isActive ? 'true' : 'false'}
                            draggable={!layer.isBackground}
                            onDragStart={(e) => handleDragStart(e, layer.id)}
                            onDragOver={(e) => handleDragOver(e, layer.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, layer.id)}
                            onClick={(e) => handleVisibleRowClick(e, layer.id)}
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                                if ((e.target as HTMLElement).tagName === 'INPUT') return;
                                setActiveLayer(layer.id);
                                setContextMenu({ x: e.clientX, y: e.clientY, layerId: layer.id, submenu: 'fx' });
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
                                minHeight: thumbnailPreference === 'none' ? 28 : Math.max(32, thumbnailSize + 8),
                                borderBottom: '1px solid hsl(var(--border-mid))',
                                boxShadow: isSelected && !isActive ? 'inset 3px 0 0 hsl(var(--accent-primary))' : 'none',
                                outline: dropHint && dropHint.targetId === layer.id && dropHint.zone === 'inside'
                                    ? '2px solid hsl(var(--accent-primary))'
                                    : 'none',
                                outlineOffset: '-2px',
                                borderTop: dropHint && dropHint.targetId === layer.id && dropHint.zone === 'below'
                                    ? '2px solid hsl(var(--accent-primary))'
                                    : '1px solid transparent',
                                position: 'relative',
                            }}
                            >
                            {dropHint && dropHint.targetId === layer.id && dropHint.zone === 'above' && (
                                <div style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 2, background: 'hsl(var(--accent-primary))', pointerEvents: 'none', zIndex: 5 }} />
                            )}
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

                            {thumbnailPreference !== 'none' && (
                                <div
                                    data-testid={`layer-thumb-${layer.id}`}
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        setActiveLayer(layer.id);
                                        setLayerStyleDialog({ layerId: layer.id, tab: 'blending' });
                                    }}
                                    style={{ flexShrink: 0, lineHeight: 0, cursor: 'pointer' }}
                                    title="Double-click to open Layer Style"
                                >
                                    <LayerThumbnail layer={layer} size={thumbnailSize} tick={thumbTick} />
                                </div>
                            )}

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
                                    draggable
                                    title="Layer has effects. Alt-drag to copy effects."
                                    onClick={(e) => e.stopPropagation()}
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        setLayerStyleDialog({ layerId: layer.id, tab: layer.effects.find(effect => effect.enabled)?.kind ?? 'blending' });
                                    }}
                                    onDragStart={(e) => {
                                        e.stopPropagation();
                                        e.dataTransfer.effectAllowed = 'copy';
                                        e.dataTransfer.setData('text/plain', layer.id);
                                        draggedEffectsLayerIdRef.current = layer.id;
                                        setDraggedEffectsLayerId(layer.id);
                                        setDraggedLayerId(null);
                                        setDropHint(null);
                                    }}
                                    onDragEnd={() => {
                                        draggedEffectsLayerIdRef.current = null;
                                        setDraggedEffectsLayerId(null);
                                        setDropHint(null);
                                    }}
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
                                        fontStyle: layer.isBackground ? 'italic' : 'normal',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    }}>
                                    {layer.kind === 'group' && <Folder size={12} style={{ marginRight: 4, verticalAlign: -2 }} />}
                                    {layer.name}
                                </span>
                            )}

                            {/* Lock indicator on right side */}
                            {isLocked && (
                                layer.isBackground ? (
                                    <button
                                        type="button"
                                        data-testid={`background-lock-${layer.id}`}
                                        title="Convert to normal layer"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            convertBackgroundLayer(layer.id);
                                        }}
                                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: isActive ? '#fff' : 'hsl(var(--text-muted))', display: 'flex', flexShrink: 0 }}
                                    >
                                        <Lock size={12} />
                                    </button>
                                ) : (
                                    <Lock
                                        size={12}
                                        style={{ color: isActive ? '#fff' : 'hsl(var(--text-muted))', flexShrink: 0 }}
                                    />
                                )
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
                    data-testid="layers-panel-fx-button"
                    title="Add a Layer Style"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!activeLayerId || activeIsBackground) return;
                        const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                        setContextMenu({ x: rect.left, y: rect.top, layerId: activeLayerId, submenu: 'fx' });
                    }}
                    disabled={!activeLayerId || activeIsBackground}
                    style={{ ...HEAD_BTN, opacity: activeLayerId && !activeIsBackground ? 1 : 0.4, fontSize: 11, fontWeight: 700, fontStyle: 'italic' }}
                >fx</button>
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
                    onClick={(e) => {
                        if (e.altKey) openNewLayerDialog();
                        else addLayer({ insert: e.metaKey || e.ctrlKey ? 'below' : 'above' });
                    }}
                    style={HEAD_BTN}
                ><Plus size={14} /></button>
                <button
                    title="Delete Layer"
                    onClick={() => activeLayerId && removeLayer(activeLayerId)}
                    disabled={!activeLayerId || activeIsBackground}
                    style={{ ...HEAD_BTN, opacity: activeLayerId && !activeIsBackground ? 1 : 0.4 }}
                ><Trash2 size={14} /></button>
            </div>

            {/* Context menu */}
            {contextMenu && contextMenu.submenu === 'main' && (
                <div
                    data-testid="layer-context-menu"
                    style={{
                        position: 'fixed',
                        top: contextMenu.y, left: contextMenu.x,
                        backgroundColor: 'hsl(var(--bg-panel))',
                        border: '1px solid hsl(var(--border-light))',
                        boxShadow: 'var(--shadow-menu)',
                        padding: '4px 0',
                        zIndex: 1000,
                        minWidth: 180,
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        data-testid="layer-context-blending-options"
                        onClick={() => {
                            setActiveLayer(contextMenu.layerId);
                            setLayerStyleDialog({ layerId: contextMenu.layerId, tab: 'blending' });
                            setContextMenu(null);
                        }}
                        style={{
                            display: 'block', width: '100%', textAlign: 'left',
                            padding: '4px 12px', background: 'none', border: 'none',
                            color: 'hsl(var(--text-main))', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--accent-primary))'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >Blending Options…</button>
                    <button
                        data-testid="layer-context-fx"
                        disabled={!!layers.find(layer => layer.id === contextMenu.layerId)?.isBackground}
                        onClick={() => setContextMenu({ ...contextMenu, submenu: 'fx' })}
                        style={{
                            display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between',
                            padding: '4px 12px', background: 'none', border: 'none',
                            color: layers.find(layer => layer.id === contextMenu.layerId)?.isBackground ? 'hsl(var(--text-muted))' : 'hsl(var(--text-main))',
                            cursor: layers.find(layer => layer.id === contextMenu.layerId)?.isBackground ? 'default' : 'pointer',
                            fontSize: 12,
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--accent-primary))'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    ><span>Layer Effects</span><span style={{ opacity: 0.6 }}>▸</span></button>
                    <div style={{ height: 1, background: 'hsl(var(--border-light))', margin: '4px 0' }} />
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

            {/* FX submenu (Layer Effects) */}
            {contextMenu && contextMenu.submenu === 'fx' && (
                <div
                    data-testid="layer-context-fx-submenu"
                    style={{
                        position: 'fixed',
                        top: contextMenu.y, left: contextMenu.x,
                        backgroundColor: 'hsl(var(--bg-panel))',
                        border: '1px solid hsl(var(--border-light))',
                        boxShadow: 'var(--shadow-menu)',
                        padding: '4px 0',
                        zIndex: 1000,
                        minWidth: 180,
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => setContextMenu({ ...contextMenu, submenu: 'main' })}
                        style={{
                            display: 'block', width: '100%', textAlign: 'left',
                            padding: '4px 12px', background: 'none', border: 'none',
                            color: 'hsl(var(--text-muted))', cursor: 'pointer', fontSize: 11,
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--accent-primary))'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >◂ Back</button>
                    <div style={{ height: 1, background: 'hsl(var(--border-light))', margin: '4px 0' }} />
                    {STYLE_EFFECT_MENU.map(item => (
                        <button
                            key={item.kind}
                            data-testid={`layer-context-add-${item.kind}`}
                            disabled={!!layers.find(layer => layer.id === contextMenu.layerId)?.isBackground}
                            onClick={() => {
                                if (layers.find(layer => layer.id === contextMenu.layerId)?.isBackground) return;
                                addLayerEffect(contextMenu.layerId, item.kind);
                                setActiveLayer(contextMenu.layerId);
                                useEditorStore.getState().setPanelVisibility?.('properties', true);
                                setLayerStyleDialog({ layerId: contextMenu.layerId, tab: item.kind });
                                window.dispatchEvent(new CustomEvent('photoweb:focus-effects', { detail: { layerId: contextMenu.layerId, kind: item.kind } }));
                                setContextMenu(null);
                            }}
                            style={{
                                display: 'block', width: '100%', textAlign: 'left',
                                padding: '4px 12px', background: 'none', border: 'none',
                                color: layers.find(layer => layer.id === contextMenu.layerId)?.isBackground ? 'hsl(var(--text-muted))' : 'hsl(var(--text-main))',
                                cursor: layers.find(layer => layer.id === contextMenu.layerId)?.isBackground ? 'default' : 'pointer',
                                fontSize: 12,
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--accent-primary))'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >{item.label}</button>
                    ))}
                </div>
            )}

            <LayerStyleDialog
                isOpen={layerStyleDialog !== null}
                layerId={layerStyleDialog?.layerId ?? null}
                initialTab={layerStyleDialog?.tab}
                onClose={() => setLayerStyleDialog(null)}
            />
            <LayersPanelOptionsDialog
                isOpen={panelOptionsOpen}
                value={thumbnailPreference}
                onChange={setThumbs}
                onClose={() => setPanelOptionsOpen(false)}
            />
        </div>
    );
}
