/**
 * BrushPresetsPanel — list of saved brush presets with thumbnail previews.
 * Click to apply, right-click for Rename / Delete / Duplicate, drag to reorder,
 * "New Preset" footer captures the current brushSettings.
 */
import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { getBrushTip } from '../../tools/brush';
import type { BrushPreset } from '../../store/types';

interface ContextMenuState {
    presetId: string;
    x: number;
    y: number;
}

function BrushPresetThumbnail({ preset }: { preset: BrushPreset }) {
    const ref = useRef<HTMLCanvasElement | null>(null);
    useEffect(() => {
        const c = ref.current;
        if (!c) return;
        const ctx = c.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, c.width, c.height);
        const { size, hardness, opacity } = preset.settings;
        const drawSize = Math.min(Math.max(2, size), c.width - 4);
        const tip = getBrushTip({ size: drawSize, hardness, color: '#222222' });
        const px = (c.width - tip.width) / 2;
        const py = (c.height - tip.height) / 2;
        ctx.globalAlpha = Math.max(0.05, Math.min(1, opacity));
        ctx.drawImage(tip, px, py);
        ctx.globalAlpha = 1;
    }, [preset.id, preset.settings.size, preset.settings.hardness, preset.settings.opacity]);
    return <canvas ref={ref} width={36} height={36} style={{ display: 'block' }} />;
}

export function BrushPresetsPanel() {
    const brushPresets = useEditorStore(s => s.brushPresets);
    const applyBrushPreset = useEditorStore(s => s.applyBrushPreset);
    const saveBrushPreset = useEditorStore(s => s.saveBrushPreset);
    const removeBrushPreset = useEditorStore(s => s.removeBrushPreset);
    const renameBrushPreset = useEditorStore(s => s.renameBrushPreset);
    const duplicateBrushPreset = useEditorStore(s => s.duplicateBrushPreset);
    const reorderBrushPreset = useEditorStore(s => s.reorderBrushPreset);
    const [menu, setMenu] = useState<ContextMenuState | null>(null);
    const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
    const [dragIdx, setDragIdx] = useState<number | null>(null);

    useEffect(() => {
        if (!menu) return;
        const close = () => setMenu(null);
        window.addEventListener('mousedown', close);
        return () => window.removeEventListener('mousedown', close);
    }, [menu]);

    const onAddPreset = () => {
        const name = window.prompt('New Preset name', 'New Brush Preset');
        if (name) saveBrushPreset(name);
    };

    const beginRename = (preset: BrushPreset) => {
        setEditing({ id: preset.id, value: preset.name });
        setMenu(null);
    };

    const commitRename = () => {
        if (!editing) return;
        const trimmed = editing.value.trim();
        if (trimmed) renameBrushPreset(editing.id, trimmed);
        setEditing(null);
    };

    return (
        <div
            data-testid="brush-presets-panel"
            style={{ display: 'flex', flexDirection: 'column', height: '100%', fontSize: 11 }}
        >
            <div style={{
                padding: '6px 8px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'hsl(var(--text-main))',
                borderBottom: '1px solid hsl(var(--border-light))',
            }}>
                Brush Presets
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 4 }}>
                {brushPresets.length === 0 && (
                    <div style={{ color: 'hsl(var(--text-muted))', padding: '8px 6px' }}>
                        No brush presets. Click New Preset to capture the current brush.
                    </div>
                )}
                {brushPresets.map((preset, idx) => {
                    const isEditing = editing?.id === preset.id;
                    return (
                        <div
                            key={preset.id}
                            data-testid={`brush-preset-row-${preset.id}`}
                            draggable={!isEditing}
                            onDragStart={() => setDragIdx(idx)}
                            onDragOver={e => { e.preventDefault(); }}
                            onDrop={() => {
                                if (dragIdx !== null && dragIdx !== idx) {
                                    reorderBrushPreset(dragIdx, idx);
                                }
                                setDragIdx(null);
                            }}
                            onDragEnd={() => setDragIdx(null)}
                            onClick={() => applyBrushPreset(preset.id)}
                            onContextMenu={e => {
                                e.preventDefault();
                                setMenu({ presetId: preset.id, x: e.clientX, y: e.clientY });
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '4px 6px',
                                cursor: 'pointer',
                                borderRadius: 2,
                                background: dragIdx === idx ? 'hsl(var(--bg-input))' : 'transparent',
                            }}
                        >
                            <div
                                data-testid={`brush-preset-thumb-${preset.id}`}
                                style={{
                                    width: 36,
                                    height: 36,
                                    background: 'hsl(var(--bg-input))',
                                    border: '1px solid hsl(var(--border-light))',
                                    flexShrink: 0,
                                }}
                            >
                                <BrushPresetThumbnail preset={preset} />
                            </div>
                            {isEditing ? (
                                <input
                                    data-testid={`brush-preset-rename-input-${preset.id}`}
                                    autoFocus
                                    value={editing.value}
                                    onChange={e => setEditing({ id: preset.id, value: e.target.value })}
                                    onBlur={commitRename}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') commitRename();
                                        else if (e.key === 'Escape') setEditing(null);
                                    }}
                                    onClick={e => e.stopPropagation()}
                                    style={{
                                        flex: 1,
                                        background: 'hsl(var(--bg-input))',
                                        border: '1px solid hsl(var(--border-light))',
                                        color: 'hsl(var(--text-main))',
                                        padding: '2px 4px',
                                        fontSize: 11,
                                    }}
                                />
                            ) : (
                                <div
                                    data-testid={`brush-preset-name-${preset.id}`}
                                    style={{ flex: 1, color: 'hsl(var(--text-main))' }}
                                >
                                    {preset.name}
                                </div>
                            )}
                            <button
                                data-testid={`brush-preset-menu-${preset.id}`}
                                onClick={e => {
                                    e.stopPropagation();
                                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                    setMenu({ presetId: preset.id, x: rect.right, y: rect.bottom });
                                }}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'hsl(var(--text-muted))',
                                    cursor: 'pointer',
                                    padding: '0 4px',
                                }}
                            >
                                ⋯
                            </button>
                        </div>
                    );
                })}
            </div>
            <div style={{
                padding: '4px 6px',
                borderTop: '1px solid hsl(var(--border-light))',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 4,
            }}>
                <button
                    data-testid="brush-presets-new"
                    onClick={onAddPreset}
                    style={{
                        background: 'hsl(var(--bg-input))',
                        border: '1px solid hsl(var(--border-light))',
                        color: 'hsl(var(--text-main))',
                        cursor: 'pointer',
                        fontSize: 11,
                        padding: '2px 8px',
                    }}
                >
                    New Preset
                </button>
            </div>
            {menu && (
                <div
                    data-testid="brush-preset-context-menu"
                    onMouseDown={e => e.stopPropagation()}
                    style={{
                        position: 'fixed',
                        left: menu.x,
                        top: menu.y,
                        background: 'hsl(var(--bg-panel))',
                        border: '1px solid hsl(var(--border-light))',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                        zIndex: 50,
                        minWidth: 120,
                    }}
                >
                    {(() => {
                        const preset = brushPresets.find(p => p.id === menu.presetId);
                        if (!preset) return null;
                        return (
                            <>
                                <div
                                    data-testid="brush-preset-menu-rename"
                                    onClick={() => beginRename(preset)}
                                    style={{ padding: '4px 8px', cursor: 'pointer', color: 'hsl(var(--text-main))' }}
                                >
                                    Rename Preset
                                </div>
                                <div
                                    data-testid="brush-preset-menu-duplicate"
                                    onClick={() => { duplicateBrushPreset(preset.id); setMenu(null); }}
                                    style={{ padding: '4px 8px', cursor: 'pointer', color: 'hsl(var(--text-main))' }}
                                >
                                    Duplicate Preset
                                </div>
                                <div
                                    data-testid="brush-preset-menu-delete"
                                    onClick={() => { removeBrushPreset(preset.id); setMenu(null); }}
                                    style={{ padding: '4px 8px', cursor: 'pointer', color: 'hsl(var(--text-main))' }}
                                >
                                    Delete Preset
                                </div>
                            </>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}
