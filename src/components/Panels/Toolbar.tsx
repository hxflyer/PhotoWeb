import {
    MousePointer2, Brush, Eraser, Image as ImageIcon,
    PaintBucket, Pentagon, Stamp, Crop, Square, Circle,
    Wand2, Pencil, Move,
    PenTool, PenLine, MousePointer, Pipette, Type, Hand, ZoomIn,
    Hexagon, Minus, Star, Lasso, ChevronRight, Repeat2,
} from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { loadImage } from '../../utils/imageLoader';
import { useRef, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ToolId, SelectionMode } from '../../store/types';
import {
    DefaultColorsIcon, QuickMaskIcon, ToolbarBurnIcon, ToolbarDodgeIcon,
    ToolbarGradientIcon, ToolbarMarqueeIcon, ToolbarQuickSelectionIcon,
    ToolbarSpongeIcon,
} from '../icons/PhotowebIcons';

interface ToolDef {
    id: ToolId;
    icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
    label: string;
    shortcut?: string;
    selectionMode?: SelectionMode;
}

// Tool groups exactly matching Photoshop's toolbar order
const TOOL_GROUPS: { primary: ToolDef; subs?: ToolDef[] }[] = [
    {
        primary: { id: 'move', icon: Move, label: 'Move Tool', shortcut: 'V' },
    },
    {
        primary: { id: 'marquee-rect', icon: ToolbarMarqueeIcon, label: 'Rectangular Marquee Tool', shortcut: 'M' },
        subs: [
            { id: 'marquee-ellipse', icon: Circle, label: 'Elliptical Marquee Tool', shortcut: 'M' },
        ],
    },
    {
        primary: { id: 'lasso', icon: Lasso, label: 'Lasso Tool', shortcut: 'L' },
        subs: [
            { id: 'lasso-poly', icon: Pentagon, label: 'Polygonal Lasso Tool', shortcut: 'L' },
        ],
    },
    {
        primary: { id: 'quick-selection', icon: ToolbarQuickSelectionIcon, label: 'Quick Selection Tool', shortcut: 'W' },
        subs: [
            { id: 'magic-wand', icon: Wand2, label: 'Magic Wand Tool', shortcut: 'W' },
        ],
    },
    {
        primary: { id: 'crop', icon: Crop, label: 'Crop Tool', shortcut: 'C' },
    },
    {
        primary: { id: 'eyedropper', icon: Pipette, label: 'Eyedropper Tool', shortcut: 'I' },
    },
    {
        primary: { id: 'brush', icon: Brush, label: 'Brush Tool', shortcut: 'B' },
        subs: [
            { id: 'pencil', icon: Pencil, label: 'Pencil Tool', shortcut: 'B' },
        ],
    },
    {
        primary: { id: 'clone-stamp', icon: Stamp, label: 'Clone Stamp Tool', shortcut: 'S' },
    },
    {
        primary: { id: 'eraser', icon: Eraser, label: 'Eraser Tool', shortcut: 'E' },
    },
    {
        primary: { id: 'fill', icon: PaintBucket, label: 'Paint Bucket Tool', shortcut: 'G' },
        subs: [
            { id: 'gradient', icon: ToolbarGradientIcon, label: 'Gradient Tool', shortcut: 'G' },
        ],
    },
    {
        primary: { id: 'dodge', icon: ToolbarDodgeIcon, label: 'Dodge Tool', shortcut: 'O' },
        subs: [
            { id: 'burn', icon: ToolbarBurnIcon, label: 'Burn Tool', shortcut: 'O' },
            { id: 'sponge', icon: ToolbarSpongeIcon, label: 'Sponge Tool', shortcut: 'O' },
        ],
    },
    {
        primary: { id: 'pen', icon: PenTool, label: 'Pen Tool', shortcut: 'P' },
        subs: [
            { id: 'freeform-pen', icon: PenLine, label: 'Freeform Pen Tool', shortcut: 'P' },
        ],
    },
    {
        primary: { id: 'type-horizontal', icon: Type, label: 'Horizontal Type Tool', shortcut: 'T' },
        subs: [
            { id: 'type-vertical', icon: Type, label: 'Vertical Type Tool', shortcut: 'T' },
        ],
    },
    {
        primary: { id: 'path-selection', icon: MousePointer, label: 'Path Selection Tool', shortcut: 'A' },
        subs: [
            { id: 'direct-selection', icon: MousePointer2, label: 'Direct Selection Tool', shortcut: 'A' },
        ],
    },
    {
        primary: { id: 'shape-rectangle', icon: Square, label: 'Rectangle Tool', shortcut: 'U' },
        subs: [
            { id: 'shape-rounded-rectangle', icon: Square, label: 'Rounded Rectangle Tool', shortcut: 'U' },
            { id: 'shape-ellipse', icon: Circle, label: 'Ellipse Tool', shortcut: 'U' },
            { id: 'shape-polygon', icon: Hexagon, label: 'Polygon Tool', shortcut: 'U' },
            { id: 'shape-line', icon: Minus, label: 'Line Tool', shortcut: 'U' },
            { id: 'shape-custom', icon: Star, label: 'Custom Shape Tool', shortcut: 'U' },
        ],
    },
    {
        primary: { id: 'hand', icon: Hand, label: 'Hand Tool', shortcut: 'H' },
        subs: [
            { id: 'zoom', icon: ZoomIn, label: 'Zoom Tool', shortcut: 'Z' },
        ],
    },
];

// Groups where PS draws a separator BEFORE them (by group index, 0-based)
const SEP_BEFORE = new Set([2, 4, 5, 6, 11, 14, 15]);

const BTN = 36;

export function Toolbar() {
    const activeTool = useEditorStore(s => s.activeTool);
    const setTool = useEditorStore(s => s.setTool);
    const setSelectionMode = useEditorStore(s => s.setSelectionMode);
    const setPolyPoints = useEditorStore(s => s.setPolyPoints);
    const primaryColor = useEditorStore(s => s.primaryColor);
    const secondaryColor = useEditorStore(s => s.secondaryColor);
    const swapColors = useEditorStore(s => s.swapColors);
    const resetColors = useEditorStore(s => s.resetColors);
    const quickMaskMode = useEditorStore(s => s.quickMaskMode);
    const setQuickMaskMode = useEditorStore(s => s.setQuickMaskMode);
    const openColorPicker = useEditorStore(s => s.openColorPicker);
    const addLayerFromImage = useEditorStore(s => s.addLayerFromImage);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [flyout, setFlyout] = useState<number | null>(null);
    const [flyoutPos, setFlyoutPos] = useState<{ left: number; top: number } | null>(null);
    // Track last-used tool per group
    const [groupActive, setGroupActive] = useState<Record<number, ToolId>>({});

    const openFlyout = useCallback((gi: number, btnEl: HTMLElement) => {
        const rect = btnEl.getBoundingClientRect();
        setFlyoutPos({ left: rect.right + 2, top: rect.top });
        setFlyout(gi);
    }, []);

    const closeFlyout = useCallback(() => {
        setFlyout(null);
        setFlyoutPos(null);
    }, []);

    // Close flyout on outside click
    useEffect(() => {
        if (flyout === null) return;
        const handler = () => closeFlyout();
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [flyout, closeFlyout]);

    const selectTool = useCallback((tool: ToolDef) => {
        setTool(tool.id);
        if (tool.selectionMode) {
            setSelectionMode(tool.selectionMode);
            if (tool.selectionMode === 'lasso-poly') setPolyPoints([]);
        }
    }, [setTool, setSelectionMode, setPolyPoints]);

    const isGroupActive = (gi: number) => {
        const group = TOOL_GROUPS[gi];
        const all = [group.primary, ...(group.subs ?? [])];
        return all.some(t => t.id === activeTool);
    };

    const getDisplayTool = (gi: number): ToolDef => {
        const group = TOOL_GROUPS[gi];
        const all = [group.primary, ...(group.subs ?? [])];
        // Show the currently active tool in this group, or the last used, or primary
        const active = all.find(t => t.id === activeTool);
        if (active) return active;
        const lastId = groupActive[gi];
        if (lastId) { const t = all.find(x => x.id === lastId); if (t) return t; }
        return group.primary;
    };

    const handleGroupClick = (gi: number, e: React.MouseEvent) => {
        const display = getDisplayTool(gi);
        if (isGroupActive(gi)) {
            // Already active: open flyout to switch sub-tool
            if (TOOL_GROUPS[gi].subs?.length) {
                e.stopPropagation();
                if (flyout === gi) closeFlyout();
                else openFlyout(gi, e.currentTarget as HTMLElement);
            }
        } else {
            selectTool(display);
            setGroupActive(prev => ({ ...prev, [gi]: display.id }));
            closeFlyout();
        }
    };

    const handleSubClick = (gi: number, tool: ToolDef, e: React.MouseEvent) => {
        e.stopPropagation();
        selectTool(tool);
        setGroupActive(prev => ({ ...prev, [gi]: tool.id }));
        closeFlyout();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try { const img = await loadImage(file); addLayerFromImage(img, file.name); }
            catch { /* ignore */ }
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const toolBtn = (active: boolean): React.CSSProperties => ({
        width: BTN, height: BTN,
        border: 'none',
        borderRadius: 3,
        backgroundColor: active ? 'hsl(var(--accent-primary))' : 'transparent',
        color: active ? '#fff' : 'hsl(var(--text-muted))',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
        flexShrink: 0,
    });

    return (
        <>
            {/* ── Import image ── */}
            <button
                title="Import Image as Top Layer"
                onClick={() => fileInputRef.current?.click()}
                style={{ ...toolBtn(false), marginBottom: 4 }}
            >
                <ImageIcon size={16} />
            </button>
            <div style={{ width: 28, height: 1, background: 'hsl(var(--border-mid))', marginBottom: 4 }} />

            {/* ── Tool groups ── */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, flex: 1 }}
                onClick={() => setFlyout(null)}
            >
                {TOOL_GROUPS.map((group, gi) => {
                    const display = getDisplayTool(gi);
                    const active = isGroupActive(gi);
                    const hasSubs = !!group.subs?.length;
                    const Icon = display.icon;

                    return (
                        <div key={gi} style={{ position: 'relative', width: BTN }}>
                            {SEP_BEFORE.has(gi) && (
                                <div style={{ width: 28, height: 1, background: 'hsl(var(--border-mid))', margin: '3px auto' }} />
                            )}

                            <button
                                title={`${display.label}${display.shortcut ? ` (${display.shortcut})` : ''}`}
                                style={toolBtn(active)}
                                onClick={(e) => handleGroupClick(gi, e)}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    if (hasSubs) {
                                        if (flyout === gi) closeFlyout();
                                        else openFlyout(gi, e.currentTarget as HTMLElement);
                                    }
                                }}
                            >
                                {display.id === 'type-vertical'
                                    ? <Type size={16} style={{ transform: 'rotate(90deg)' }} />
                                    : <Icon size={16} />}
                                {/* Triangle indicator for groups with sub-tools */}
                                {hasSubs && (
                                    <ChevronRight
                                        size={7}
                                        strokeWidth={2.4}
                                        style={{
                                        position: 'absolute', bottom: 2, right: 3,
                                        opacity: 0.7,
                                        color: active ? 'rgba(255,255,255,0.8)' : 'hsl(var(--text-muted))',
                                    }}
                                    />
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* ── Spacer ── */}
            <div style={{ flex: 1 }} />
            <div style={{ width: 28, height: 1, background: 'hsl(var(--border-mid))', margin: '4px 0' }} />

            {/* ── Quick Mask mode button (Q) ── */}
            <button
                title={`${quickMaskMode ? 'Exit' : 'Enter'} Quick Mask Mode (Q)`}
                onClick={() => setQuickMaskMode(!quickMaskMode)}
                style={{
                    ...toolBtn(quickMaskMode),
                    border: quickMaskMode ? '1px solid hsl(var(--accent-primary))' : '1px solid hsl(var(--border-mid))',
                }}
            >
                <QuickMaskIcon size={16} />
            </button>

            {/* ── FG/BG color squares ── */}
            <div style={{ position: 'relative', width: 38, height: 38, margin: '6px auto 4px' }}>
                {/* Reset to black/white (D) */}
                <button
                    title="Default Colors (D)"
                    onClick={resetColors}
                    style={{
                        position: 'absolute', bottom: -2, left: -2,
                        width: 14, height: 14, padding: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'transparent', border: 'none',
                        color: 'hsl(var(--text-muted))',
                        cursor: 'pointer',
                    }}
                >
                    <DefaultColorsIcon size={13} strokeWidth={1.8} />
                </button>
                {/* Swap arrow (X) */}
                <button
                    title="Swap Colors (X)"
                    onClick={swapColors}
                    style={{
                        position: 'absolute', top: 0, right: 0,
                        width: 14, height: 14, padding: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'transparent', border: 'none',
                        color: 'hsl(var(--text-main))',
                        cursor: 'pointer',
                    }}
                >
                    <Repeat2 size={13} strokeWidth={2.1} />
                </button>
                {/* Background color swatch */}
                <div
                    title="Background Color"
                    onClick={() => openColorPicker('secondary')}
                    style={{
                        position: 'absolute', bottom: 4, right: 4,
                        width: 22, height: 22,
                        backgroundColor: secondaryColor,
                        border: '1px solid rgba(0,0,0,0.8)',
                        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)',
                        cursor: 'pointer',
                    }}
                />
                {/* Foreground color swatch */}
                <div
                    title="Foreground Color"
                    onClick={() => openColorPicker('primary')}
                    style={{
                        position: 'absolute', top: 4, left: 4,
                        width: 22, height: 22,
                        backgroundColor: primaryColor,
                        border: '1px solid rgba(0,0,0,0.8)',
                        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)',
                        cursor: 'pointer',
                        zIndex: 2,
                    }}
                />
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

            {/* Portal flyout — rendered at document.body to escape overflow/stacking constraints */}
            {flyout !== null && flyoutPos && createPortal(
                <div
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: 'fixed',
                        left: flyoutPos.left,
                        top: flyoutPos.top,
                        backgroundColor: 'hsl(var(--bg-header))',
                        border: '1px solid hsl(var(--border-light))',
                        boxShadow: 'var(--shadow-menu)',
                        zIndex: 9000,
                        minWidth: 220,
                        padding: '3px 0',
                    }}
                >
                    {(() => {
                        const group = TOOL_GROUPS[flyout];
                        if (!group) return null;
                        return [group.primary, ...(group.subs ?? [])].map(t => {
                            const TIcon = t.icon;
                            const isActive = t.id === activeTool;
                            return (
                                <div
                                    key={t.id}
                                    onClick={(e) => handleSubClick(flyout, t, e)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '5px 12px',
                                        cursor: 'default',
                                        fontSize: 12,
                                        color: isActive ? 'white' : 'hsl(var(--text-main))',
                                        backgroundColor: isActive ? 'hsl(var(--accent-primary))' : 'transparent',
                                    }}
                                    onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'hsl(var(--bg-hover))'; }}
                                    onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                >
                                    {t.id === 'type-vertical'
                                        ? <Type size={14} style={{ transform: 'rotate(90deg)' }} />
                                        : <TIcon size={14} />}
                                    <span style={{ flex: 1 }}>{t.label}</span>
                                    {t.shortcut && <span style={{ opacity: 0.6, fontSize: 11 }}>{t.shortcut}</span>}
                                </div>
                            );
                        });
                    })()}
                </div>,
                document.body
            )}
        </>
    );
}
