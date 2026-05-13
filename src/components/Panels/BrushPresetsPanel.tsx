/**
 * BrushPresetsPanel — list of saved brush presets with thumbnail previews.
 * Click to apply, right-click for Rename / Delete / Duplicate, drag to reorder,
 * "New Preset" footer captures the current brushSettings.
 */
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, FilePlus, Folder, FolderPlus, Menu } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { getBrushOptions, getBrushTip } from '../../tools/brush';
import type { BrushPreset } from '../../store/types';
import { NewBrushPresetDialog } from '../Dialogs/NewBrushPresetDialog';
import { drawBrushTipPreview } from '../../utils/brushTips';
import { BrushDynamicsControls } from './BrushDynamicsControls';

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
        if (preset.settings.customTip) {
            drawBrushTipPreview(ctx, preset.settings.customTip, 2, 2, c.width - 4, c.height - 4, preset.color ?? '#222222');
            return;
        }
        const { size, hardness, opacity } = preset.settings;
        const drawSize = Math.min(Math.max(2, size), c.width - 4);
        const tip = getBrushTip({ size: drawSize, hardness, color: '#222222' });
        const px = (c.width - tip.width) / 2;
        const py = (c.height - tip.height) / 2;
        ctx.globalAlpha = Math.max(0.05, Math.min(1, opacity));
        ctx.drawImage(tip, px, py);
        ctx.globalAlpha = 1;
    }, [preset.id, preset.settings.size, preset.settings.hardness, preset.settings.opacity, preset.settings.customTip, preset.color]);
    return <canvas ref={ref} width={36} height={36} style={{ display: 'block' }} />;
}

export function BrushPresetsPanel() {
    const brushPresets = useEditorStore(s => s.brushPresets);
    const brushPresetGroups = useEditorStore(s => s.brushPresetGroups);
    const selectedBrushPresetGroupId = useEditorStore(s => s.selectedBrushPresetGroupId);
    const applyBrushPreset = useEditorStore(s => s.applyBrushPreset);
    const saveBrushPreset = useEditorStore(s => s.saveBrushPreset);
    const createBrushPresetGroup = useEditorStore(s => s.createBrushPresetGroup);
    const setSelectedBrushPresetGroup = useEditorStore(s => s.setSelectedBrushPresetGroup);
    const toggleBrushPresetGroup = useEditorStore(s => s.toggleBrushPresetGroup);
    const removeBrushPreset = useEditorStore(s => s.removeBrushPreset);
    const renameBrushPreset = useEditorStore(s => s.renameBrushPreset);
    const duplicateBrushPreset = useEditorStore(s => s.duplicateBrushPreset);
    const reorderBrushPreset = useEditorStore(s => s.reorderBrushPreset);
    const [menu, setMenu] = useState<ContextMenuState | null>(null);
    const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
    const [dragIdx, setDragIdx] = useState<number | null>(null);
    const [newPresetOpen, setNewPresetOpen] = useState(false);
    const [newGroupOpen, setNewGroupOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('New Group');
    const [panelMenuOpen, setPanelMenuOpen] = useState(false);
    const [panelTab, setPanelTab] = useState<'brushes' | 'settings'>('brushes');

    useEffect(() => {
        if (!menu) return;
        const close = () => setMenu(null);
        window.addEventListener('mousedown', close);
        return () => window.removeEventListener('mousedown', close);
    }, [menu]);

    const onAddPreset = () => {
        setNewPresetOpen(true);
    };

    const onAddGroup = () => {
        setNewGroupName('New Group');
        setNewGroupOpen(true);
    };

    const getMoreBrushes = () => {
        setPanelMenuOpen(false);
        const opened = window.open('https://www.adobe.com/products/photoshop/brushes.html', '_blank', 'noopener');
        useEditorStore.getState().addToast(
            opened ? 'Opened Get More Brushes in a new tab' : 'Popup blocked. Visit adobe.com/products/photoshop/brushes.html',
            opened ? 'success' : 'info',
        );
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'relative',
            }}>
                <span>Brushes</span>
                <button
                    data-testid="brushes-panel-menu"
                    title="Brushes panel menu"
                    onClick={() => setPanelMenuOpen(open => !open)}
                    style={{ background: 'transparent', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer', padding: 2 }}
                >
                    <Menu size={14} />
                </button>
                {panelMenuOpen && (
                    <div
                        data-testid="brushes-panel-menu-popover"
                        onMouseDown={e => e.stopPropagation()}
                        style={{
                            position: 'absolute',
                            right: 8,
                            top: 28,
                            background: 'hsl(var(--bg-panel))',
                            border: '1px solid hsl(var(--border-light))',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                            zIndex: 60,
                            minWidth: 170,
                            textTransform: 'none',
                            letterSpacing: 0,
                            fontWeight: 400,
                        }}
                    >
                        <div
                            data-testid="brushes-get-more"
                            onClick={getMoreBrushes}
                            style={{ padding: '6px 10px', cursor: 'pointer', color: 'hsl(var(--text-main))' }}
                        >
                            Get More Brushes...
                        </div>
                    </div>
                )}
            </div>
            <div
                role="tablist"
                aria-label="Brushes panel tabs"
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid hsl(var(--border-light))' }}
            >
                <button
                    role="tab"
                    aria-selected={panelTab === 'brushes'}
                    data-testid="brushes-panel-tab-brushes"
                    onClick={() => setPanelTab('brushes')}
                    style={{
                        background: panelTab === 'brushes' ? 'hsl(var(--bg-input))' : 'transparent',
                        border: 'none',
                        borderRight: '1px solid hsl(var(--border-light))',
                        color: panelTab === 'brushes' ? 'hsl(var(--text-main))' : 'hsl(var(--text-muted))',
                        cursor: 'pointer',
                        fontSize: 11,
                        padding: '5px 4px',
                    }}
                >
                    Brushes
                </button>
                <button
                    role="tab"
                    aria-selected={panelTab === 'settings'}
                    data-testid="brushes-panel-tab-settings"
                    onClick={() => setPanelTab('settings')}
                    style={{
                        background: panelTab === 'settings' ? 'hsl(var(--bg-input))' : 'transparent',
                        border: 'none',
                        color: panelTab === 'settings' ? 'hsl(var(--text-main))' : 'hsl(var(--text-muted))',
                        cursor: 'pointer',
                        fontSize: 11,
                        padding: '5px 4px',
                    }}
                >
                    Brush Settings
                </button>
            </div>
            {panelTab === 'settings' ? (
                <div style={{ flex: 1, minHeight: 0 }}>
                    <BrushDynamicsControls />
                </div>
            ) : (
                <>
                    <div style={{ flex: 1, overflowY: 'auto', padding: 4 }}>
                {brushPresets.length === 0 && (
                    <div style={{ color: 'hsl(var(--text-muted))', padding: '8px 6px' }}>
                        No brush presets. Click New Preset to capture the current brush.
                    </div>
                )}
                {brushPresetGroups.map(group => {
                    const groupPresets = brushPresets
                        .map((preset, idx) => ({ preset, idx }))
                        .filter(({ preset }) => (preset.groupId ?? 'general') === group.id);
                    return (
                        <div key={group.id}>
                            <div
                                data-testid={`brush-preset-group-${group.id}`}
                                onClick={() => setSelectedBrushPresetGroup(group.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    padding: '4px 6px',
                                    color: 'hsl(var(--text-main))',
                                    background: selectedBrushPresetGroupId === group.id ? 'hsl(var(--bg-input))' : 'transparent',
                                    cursor: 'pointer',
                                }}
                            >
                                <button
                                    data-testid={`brush-preset-group-toggle-${group.id}`}
                                    onClick={e => { e.stopPropagation(); toggleBrushPresetGroup(group.id); }}
                                    style={{ background: 'transparent', border: 'none', color: 'inherit', padding: 0, display: 'flex', cursor: 'pointer' }}
                                >
                                    {group.collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                                </button>
                                <Folder size={13} />
                                <span>{group.name}</span>
                            </div>
                            {!group.collapsed && groupPresets.map(({ preset, idx }) => {
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
                                padding: '4px 6px 4px 22px',
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
                            {preset.includeToolSettings !== false && (
                                <span
                                    data-testid={`brush-preset-tool-indicator-${preset.id}`}
                                    title="Includes Tool Settings"
                                    style={{ fontSize: 10, color: 'hsl(var(--text-muted))' }}
                                >
                                    B
                                </span>
                            )}
                            {preset.includeColor && preset.color && (
                                <span
                                    data-testid={`brush-preset-color-${preset.id}`}
                                    title="Includes Color"
                                    style={{
                                        width: 10,
                                        height: 10,
                                        border: '1px solid hsl(var(--border-light))',
                                        background: preset.color,
                                        display: 'inline-block',
                                    }}
                                />
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
                    data-testid="brush-presets-new-group"
                    title="Create New Group"
                    onClick={onAddGroup}
                    style={{
                        background: 'hsl(var(--bg-input))',
                        border: '1px solid hsl(var(--border-light))',
                        color: 'hsl(var(--text-main))',
                        cursor: 'pointer',
                        fontSize: 11,
                        padding: '2px 6px',
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    <FolderPlus size={13} />
                </button>
                <button
                    data-testid="brush-presets-new"
                    title="Create New Brush"
                    onClick={onAddPreset}
                    style={{
                        background: 'hsl(var(--bg-input))',
                        border: '1px solid hsl(var(--border-light))',
                        color: 'hsl(var(--text-main))',
                        cursor: 'pointer',
                        fontSize: 11,
                        padding: '2px 6px',
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    <FilePlus size={13} />
                </button>
                    </div>
                </>
            )}
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
            {newGroupOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    data-testid="new-brush-group-dialog"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 1200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <div
                        style={{
                            minWidth: 280,
                            background: 'hsl(var(--bg-panel))',
                            border: '1px solid hsl(var(--border-light))',
                            borderRadius: 4,
                            padding: 14,
                            color: 'hsl(var(--text-main))',
                            boxShadow: 'var(--shadow-menu)',
                        }}
                    >
                        <div style={{ fontWeight: 600, marginBottom: 10 }}>Group Name</div>
                        <input
                            data-testid="new-brush-group-name"
                            autoFocus
                            value={newGroupName}
                            onChange={e => setNewGroupName(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Escape') setNewGroupOpen(false);
                                if (e.key === 'Enter' && newGroupName.trim()) {
                                    createBrushPresetGroup(newGroupName.trim());
                                    setNewGroupOpen(false);
                                }
                            }}
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                background: 'hsl(var(--bg-input))',
                                border: '1px solid hsl(var(--border-light))',
                                color: 'hsl(var(--text-main))',
                                padding: '4px 8px',
                                marginBottom: 12,
                            }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button
                                data-testid="new-brush-group-cancel"
                                onClick={() => setNewGroupOpen(false)}
                                style={{ background: 'hsl(var(--bg-input))', border: '1px solid hsl(var(--border-light))', color: 'hsl(var(--text-main))', padding: '4px 12px' }}
                            >
                                Cancel
                            </button>
                            <button
                                data-testid="new-brush-group-ok"
                                onClick={() => {
                                    if (!newGroupName.trim()) return;
                                    createBrushPresetGroup(newGroupName.trim());
                                    setNewGroupOpen(false);
                                }}
                                style={{ background: 'hsl(var(--accent-primary))', border: '1px solid hsl(var(--accent-primary))', color: '#fff', padding: '4px 12px' }}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <NewBrushPresetDialog
                isOpen={newPresetOpen}
                onCancel={() => setNewPresetOpen(false)}
                onCommit={({ name, captureSize, includeToolSettings, captureColor }) => {
                    const options = getBrushOptions();
                    saveBrushPreset(name, {
                        captureSize,
                        includeToolSettings,
                        includeColor: captureColor,
                        smoothing: options.smoothing,
                        spacing: options.spacing,
                        mode: options.mode,
                    });
                    setNewPresetOpen(false);
                }}
            />
        </div>
    );
}
