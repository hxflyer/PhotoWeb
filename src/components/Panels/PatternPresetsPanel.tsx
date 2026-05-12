/**
 * PatternPresetsPanel — list of saved pattern presets with tile thumbnails.
 * Click to set as active pattern, trailing menu for Rename / Delete,
 * "Define Pattern" footer captures the current selection or active layer.
 */
import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { decodePatternPreset, getPatternTile } from '../../store/toolsSlice';
import type { PatternPreset } from '../../store/types';
import { DefinePatternDialog } from '../Dialogs/DefinePatternDialog';

interface ContextMenuState {
    presetId: string;
    x: number;
    y: number;
}

function PatternThumbnail({ preset }: { preset: PatternPreset }) {
    const ref = useRef<HTMLCanvasElement | null>(null);
    useEffect(() => {
        const c = ref.current;
        if (!c) return;
        const ctx = c.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, c.width, c.height);
        const drawTiled = (t: HTMLCanvasElement) => {
            const tw = Math.max(1, t.width);
            const th = Math.max(1, t.height);
            for (let y = 0; y < c.height; y += th) {
                for (let x = 0; x < c.width; x += tw) {
                    ctx.drawImage(t, x, y);
                }
            }
        };
        const tile = getPatternTile(preset.id);
        if (tile) {
            drawTiled(tile);
        } else {
            decodePatternPreset(preset).then(drawTiled).catch(() => {});
        }
    }, [preset.id, preset.dataUrl, preset.width, preset.height]);
    return <canvas ref={ref} width={36} height={36} style={{ display: 'block' }} />;
}

function captureActiveAsPattern(name: string): void {
    const store = useEditorStore.getState();
    const layer = store.layers.find(l => l.id === store.activeLayerId);
    if (!layer) return;
    store.definePattern(name, layer.canvas);
}

export function PatternPresetsPanel() {
    const patternPresets = useEditorStore(s => s.patternPresets);
    const activePatternId = useEditorStore(s => s.activePatternId);
    const setActivePatternId = useEditorStore(s => s.setActivePatternId);
    const removePatternPreset = useEditorStore(s => s.removePatternPreset);
    const renamePatternPreset = useEditorStore(s => s.renamePatternPreset);
    const [menu, setMenu] = useState<ContextMenuState | null>(null);
    const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
    const [definePatternOpen, setDefinePatternOpen] = useState(false);

    useEffect(() => {
        if (!menu) return;
        const close = () => setMenu(null);
        window.addEventListener('mousedown', close);
        return () => window.removeEventListener('mousedown', close);
    }, [menu]);

    const onDefinePattern = () => {
        setDefinePatternOpen(true);
    };

    const beginRename = (preset: PatternPreset) => {
        setEditing({ id: preset.id, value: preset.name });
        setMenu(null);
    };

    const commitRename = () => {
        if (!editing) return;
        const trimmed = editing.value.trim();
        if (trimmed) renamePatternPreset(editing.id, trimmed);
        setEditing(null);
    };

    return (
        <div
            data-testid="pattern-presets-panel"
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
                Pattern Presets
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 4 }}>
                {patternPresets.length === 0 && (
                    <div style={{ color: 'hsl(var(--text-muted))', padding: '8px 6px' }}>
                        No pattern presets. Click Define Pattern to capture the active layer.
                    </div>
                )}
                {patternPresets.map(preset => {
                    const isEditing = editing?.id === preset.id;
                    const isActive = activePatternId === preset.id;
                    return (
                        <div
                            key={preset.id}
                            data-testid={`pattern-preset-row-${preset.id}`}
                            onClick={() => setActivePatternId(preset.id)}
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
                                background: isActive ? 'hsl(var(--bg-input))' : 'transparent',
                            }}
                        >
                            <div
                                data-testid={`pattern-preset-thumb-${preset.id}`}
                                style={{
                                    width: 36,
                                    height: 36,
                                    background: 'hsl(var(--bg-input))',
                                    border: isActive
                                        ? '1px solid hsl(var(--accent-primary))'
                                        : '1px solid hsl(var(--border-light))',
                                    flexShrink: 0,
                                }}
                            >
                                <PatternThumbnail preset={preset} />
                            </div>
                            {isEditing ? (
                                <input
                                    data-testid={`pattern-preset-rename-input-${preset.id}`}
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
                                    data-testid={`pattern-preset-name-${preset.id}`}
                                    style={{ flex: 1, color: 'hsl(var(--text-main))' }}
                                >
                                    {preset.name}
                                </div>
                            )}
                            <button
                                data-testid={`pattern-preset-menu-${preset.id}`}
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
                    data-testid="pattern-presets-define"
                    onClick={onDefinePattern}
                    style={{
                        background: 'hsl(var(--bg-input))',
                        border: '1px solid hsl(var(--border-light))',
                        color: 'hsl(var(--text-main))',
                        cursor: 'pointer',
                        fontSize: 11,
                        padding: '2px 8px',
                    }}
                >
                    Define Pattern
                </button>
            </div>
            {menu && (
                <div
                    data-testid="pattern-preset-context-menu"
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
                        const preset = patternPresets.find(p => p.id === menu.presetId);
                        if (!preset) return null;
                        return (
                            <>
                                <div
                                    data-testid="pattern-preset-menu-rename"
                                    onClick={() => beginRename(preset)}
                                    style={{ padding: '4px 8px', cursor: 'pointer', color: 'hsl(var(--text-main))' }}
                                >
                                    Rename Preset
                                </div>
                                <div
                                    data-testid="pattern-preset-menu-delete"
                                    onClick={() => { removePatternPreset(preset.id); setMenu(null); }}
                                    style={{ padding: '4px 8px', cursor: 'pointer', color: 'hsl(var(--text-main))' }}
                                >
                                    Delete Preset
                                </div>
                            </>
                        );
                    })()}
                </div>
            )}
            <DefinePatternDialog
                isOpen={definePatternOpen}
                onCancel={() => setDefinePatternOpen(false)}
                onCommit={({ name }) => {
                    captureActiveAsPattern(name);
                    setDefinePatternOpen(false);
                }}
            />
        </div>
    );
}
