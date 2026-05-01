import { Eye, EyeOff, Plus, Trash2, GripVertical, Lock, Unlock } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { useState, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import type { LayerColorTag } from '../../core/Layer';
import { blendModes as v1BlendModes } from '../../core/blendModes';

const COLOR_TAGS: { id: LayerColorTag; label: string; color: string }[] = [
    { id: 'none', label: 'None', color: 'transparent' },
    { id: 'red', label: 'Red', color: '#ef4444' },
    { id: 'orange', label: 'Orange', color: '#f97316' },
    { id: 'yellow', label: 'Yellow', color: '#eab308' },
    { id: 'green', label: 'Green', color: '#22c55e' },
    { id: 'blue', label: 'Blue', color: '#3b82f6' },
    { id: 'violet', label: 'Violet', color: '#a855f7' },
    { id: 'gray', label: 'Gray', color: '#6b7280' },
];

const BLEND_MODE_OPTIONS: { value: GlobalCompositeOperation; label: string }[] = (Object.keys(v1BlendModes) as Array<keyof typeof v1BlendModes>).map(key => {
    const mapping = v1BlendModes[key];
    const op = mapping.kind === 'native' ? mapping.op : 'source-over';
    return { value: op as GlobalCompositeOperation, label: key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) };
});

// Simplified Drag and Drop using HTML5 API
export function LayersPanel() {
    const {
        layers,
        activeLayerId,
        addLayer,
        removeLayer,
        setActiveLayer,
        toggleLayerVisibility,
        soloLayer,
        renameLayer,
        setLayerLock,
        setLayerColorTag,
        setLayerFill,
        reorderLayers,
        setLayerOpacity,
        setLayerBlendMode,
        mergeLayerDown,
        mergeVisible,
        stampVisible,
        flattenImage,
        layerViaCopy,
        layerViaCut,
    } = useEditorStore();
    const [editingNameId, setEditingNameId] = useState<string | null>(null);

    const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, layerId: string } | null>(null);

    // Global click listener to close context menu
    useEffect(() => {
        const closeMenu = () => setContextMenu(null);
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, []);

    const handleContextMenu = (e: React.MouseEvent, layerId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            layerId
        });
    };

    // ... drag handlers ... (omitted for brevity in replacement if unchanged, but I need to be careful with replace_file_content context. 
    // Actually, I should just replace the header part mainly, but I need to add the import.)

    // Let's do a larger replacement to be safe with imports.
    // Wait, I can't do "omitted for brevity". I must provide valid replacement.
    // I will use two replacements: one for import, one for the picker.

    // ...

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedLayerId(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedLayerId || draggedLayerId === targetId) return;

        // Visual feedback could be added here
    };

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedLayerId || draggedLayerId === targetId) return;

        const dragIndex = layers.findIndex(l => l.id === draggedLayerId);
        const hoverIndex = layers.findIndex(l => l.id === targetId);

        reorderLayers(dragIndex, hoverIndex);
        setDraggedLayerId(null);
    };

    const blendModes = BLEND_MODE_OPTIONS;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

            {/* Persistent Color Picker */}
            <div style={{ padding: '12px', borderBottom: '1px solid hsl(var(--border-light))', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '11px', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>COLOR PICKER</label>
                <div style={{ paddingBottom: '4px' }}>
                    <HexColorPicker
                        color={useEditorStore(s => s.primaryColor)}
                        onChange={useEditorStore.getState().setPrimaryColor}
                        style={{ width: '100%', height: '120px' }}
                    />
                </div>
                {/* Hex Input Manually */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '24px', height: '24px',
                        backgroundColor: useEditorStore(s => s.primaryColor),
                        border: '1px solid hsl(var(--border-light))',
                        borderRadius: '4px'
                    }} />
                    <input
                        type="text"
                        value={useEditorStore(s => s.primaryColor)}
                        onChange={(e) => useEditorStore.getState().setPrimaryColor(e.target.value)}
                        style={{
                            flex: 1,
                            background: 'hsl(var(--bg-input))',
                            border: '1px solid hsl(var(--border-light))',
                            color: 'hsl(var(--text-main))',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px'
                        }}
                    />
                </div>
            </div>

            {/* Header */}
            <div style={{
                padding: '12px',
                borderBottom: '1px solid hsl(var(--border-light))',
                fontWeight: 600,
                fontSize: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span>Layers</span>
                <button
                    onClick={addLayer}
                    title="New Layer"
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'hsl(var(--text-main))',
                        cursor: 'pointer',
                        padding: 4
                    }}
                >
                    <Plus size={16} />
                </button>
            </div>

            {/* Layer List */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column' // Removed reverse
            }}>
                {[...layers].reverse().map((layer) => (
                    <div
                        key={layer.id}
                        // Draggable moved to handle
                        onDragOver={(e) => handleDragOver(e, layer.id)}
                        onDrop={(e) => handleDrop(e, layer.id)}
                        onClick={() => setActiveLayer(layer.id)}
                        onContextMenu={(e) => handleContextMenu(e, layer.id)}
                        style={{
                            padding: '8px 12px',
                            backgroundColor: activeLayerId === layer.id ? 'hsl(var(--accent-primary))' : 'transparent',
                            borderBottom: '1px solid hsl(var(--border-light))',
                            cursor: 'pointer',
                            userSelect: 'none',
                            opacity: draggedLayerId === layer.id ? 0.5 : 1
                        }}
                    >
                        {/* Top Row: Name and Toggles */}
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                            <div
                                draggable
                                onDragStart={(e) => handleDragStart(e, layer.id)}
                                style={{ cursor: 'grab', marginRight: '6px', color: 'hsl(var(--text-muted))' }}
                            >
                                <GripVertical size={14} />
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (e.altKey) soloLayer(layer.id);
                                    else toggleLayerVisibility(layer.id);
                                }}
                                title={'Toggle visibility (Alt+Click to solo)'}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: activeLayerId === layer.id ? 'white' : 'hsl(var(--text-muted))',
                                    cursor: 'pointer',
                                    marginRight: '8px',
                                    display: 'flex'
                                }}
                            >
                                {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>

                            {layer.colorTag !== 'none' && (
                                <span title={`Color tag: ${layer.colorTag}`} style={{
                                    width: 8, height: 8, borderRadius: 4,
                                    backgroundColor: COLOR_TAGS.find(t => t.id === layer.colorTag)?.color ?? 'transparent',
                                    marginRight: 6,
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
                                        flex: 1, fontSize: '13px', padding: '2px 4px',
                                        background: 'hsl(var(--bg-input))',
                                        color: 'hsl(var(--text-main))',
                                        border: '1px solid hsl(var(--border-light))',
                                        borderRadius: '3px',
                                    }}
                                />
                            ) : (
                                <span
                                    onDoubleClick={(e) => { e.stopPropagation(); setEditingNameId(layer.id); }}
                                    style={{
                                        flex: 1,
                                        fontSize: '13px',
                                        color: activeLayerId === layer.id ? 'white' : 'hsl(var(--text-main))'
                                    }}>
                                    {layer.name}
                                </span>
                            )}

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeLayer(layer.id);
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: activeLayerId === layer.id ? 'white' : 'hsl(var(--text-muted))',
                                    cursor: 'pointer',
                                    opacity: 0.6
                                }}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        {/* Bottom Row: Controls (Opacity, Blend) - Only specific for active layer or visible always? Photoshop shows it for active layer at top, but simplified here we can show inline or better, at the top of the panel?
                Actually, standard is having these controls at the top of the panel for the *active* layer.
                Let's move these out of the list item to the header area or just below header to save space?
                For now, let's put them inline if active for clarity or keep it clean.
                Let's put them in the list item if active.
            */}
                        {activeLayerId === layer.id && (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px', paddingLeft: '28px' }}>
                                {/* Blend Mode */}
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <select
                                        value={layer.blendMode}
                                        onChange={(e) => setLayerBlendMode(layer.id, e.target.value as GlobalCompositeOperation)}
                                        style={{
                                            width: '100%',
                                            background: 'hsl(var(--bg-input))',
                                            color: 'hsl(var(--text-main))',
                                            border: '1px solid hsl(var(--border-light))',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            padding: '2px 4px'
                                        }}
                                    >
                                        {blendModes.map(m => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Opacity */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '80px' }}>
                                    <span style={{ fontSize: '10px', opacity: 0.7 }}>Op%:</span>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={Math.round(layer.opacity * 100)}
                                        onChange={(e) => {
                                            const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                                            setLayerOpacity(layer.id, val / 100);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                            width: '100%',
                                            background: 'hsl(var(--bg-input))',
                                            color: '#fff',
                                            border: '1px solid hsl(var(--border-light))',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            padding: '2px'
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                        {activeLayerId === layer.id && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 28, marginTop: 4 }}>
                                <span style={{ fontSize: '10px', opacity: 0.7 }}>Fill%:</span>
                                <input
                                    type="number" min="0" max="100"
                                    value={Math.round(layer.fill * 100)}
                                    onChange={(e) => {
                                        const v = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                                        setLayerFill(layer.id, v / 100);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ width: 60, background: 'hsl(var(--bg-input))', color: '#fff', border: '1px solid hsl(var(--border-light))', borderRadius: 4, fontSize: 11, padding: 2 }}
                                />
                                <div style={{ display: 'flex', gap: 2, marginLeft: 'auto' }} onClick={(e) => e.stopPropagation()}>
                                    {(['transparency', 'image', 'position', 'all'] as const).map(kind => {
                                        const active = layer.locks[kind];
                                        return (
                                            <button
                                                key={kind}
                                                title={`Lock ${kind}`}
                                                onClick={() => setLayerLock(layer.id, kind, !active)}
                                                style={{
                                                    background: active ? 'hsl(var(--accent-primary))' : 'transparent',
                                                    border: '1px solid hsl(var(--border-light))',
                                                    color: '#fff', borderRadius: 3, padding: '2px 4px', cursor: 'pointer',
                                                    fontSize: 10,
                                                }}>
                                                {kind === 'all' ? <Lock size={10} /> : kind === 'transparency' ? '◇' : kind === 'image' ? '🖌' : <Unlock size={10} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {activeLayerId === layer.id && (
                            <div style={{ display: 'flex', gap: 4, paddingLeft: 28, marginTop: 4 }} onClick={(e) => e.stopPropagation()}>
                                {COLOR_TAGS.map(t => (
                                    <button
                                        key={t.id}
                                        title={t.label}
                                        onClick={() => setLayerColorTag(layer.id, t.id)}
                                        style={{
                                            width: 12, height: 12,
                                            border: layer.colorTag === t.id ? '2px solid white' : '1px solid hsl(var(--border-light))',
                                            backgroundColor: t.color === 'transparent' ? 'hsl(var(--bg-input))' : t.color,
                                            borderRadius: '50%',
                                            cursor: 'pointer',
                                        }} />
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {layers.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'hsl(var(--text-muted))', fontSize: '12px' }}>
                        No layers.
                    </div>
                )}
            </div>

            {/* Context Menu */}
            {
                contextMenu && (
                    <div style={{
                        position: 'fixed',
                        top: contextMenu.y,
                        left: contextMenu.x,
                        backgroundColor: 'hsl(var(--bg-panel))',
                        border: '1px solid hsl(var(--border-light))',
                        borderRadius: '4px',
                        boxShadow: 'var(--shadow-lg)',
                        padding: '4px 0',
                        zIndex: 1000,
                        minWidth: '140px'
                    }} onClick={(e) => e.stopPropagation()}>
                        {[
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
                                    padding: '6px 12px', background: 'none', border: 'none',
                                    color: 'hsl(var(--text-main))', cursor: 'pointer', fontSize: '13px',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(var(--accent-primary))'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                )}
        </div>
    );
}
