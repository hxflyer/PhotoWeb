import { useEffect, useRef, useState } from 'react';
import { Menu, ChevronUp, ChevronDown } from 'lucide-react';
import { LayersPanel } from './LayersPanel';
import { ChannelsPanel } from './ChannelsPanel';
import { PathsPanel } from './PathsPanel';
import { HistoryPanel } from './HistoryPanel';
import { ColorPanel } from './ColorPanel';
import { SwatchesPanel } from './SwatchesPanel';
import { CharacterPanel } from './CharacterPanel';
import { ParagraphPanel } from './ParagraphPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { BrushPresetsPanel } from './BrushPresetsPanel';
import { PatternPresetsPanel } from './PatternPresetsPanel';
import { StylesPanel } from './StylesPanel';
import { NavigatorPanel } from './NavigatorPanel';
import { InfoPanel } from './InfoPanel';
import { useEditorStore } from '../../store/editorStore';
import type { PanelGroupId, PanelId } from '../../store/types';

const ADJUSTMENTS: { id: string; label: string; short: string }[] = [
    { id: 'brightness-contrast', label: 'Brightness/Contrast', short: 'B/C' },
    { id: 'levels', label: 'Levels', short: 'Lev' },
    { id: 'curves', label: 'Curves', short: 'Cur' },
    { id: 'exposure', label: 'Exposure', short: 'Exp' },
    { id: 'vibrance', label: 'Vibrance', short: 'Vib' },
    { id: 'hue-saturation', label: 'Hue/Saturation', short: 'H/S' },
    { id: 'color-balance', label: 'Color Balance', short: 'CB' },
    { id: 'black-and-white', label: 'Black & White', short: 'B&W' },
    { id: 'photo-filter', label: 'Photo Filter', short: 'PF' },
    { id: 'channel-mixer', label: 'Channel Mixer', short: 'CM' },
    { id: 'invert', label: 'Invert', short: 'Inv' },
    { id: 'posterize', label: 'Posterize', short: 'Pos' },
    { id: 'threshold', label: 'Threshold', short: 'Thr' },
    { id: 'gradient-map', label: 'Gradient Map', short: 'GM' },
];

function AdjustmentsPanel() {
    const { addAdjustmentLayer } = useEditorStore();
    return (
        <div style={{ padding: '6px 4px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 10, color: 'hsl(var(--text-muted))', padding: '0 4px 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Adjustments
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2 }}>
                {ADJUSTMENTS.map(adj => (
                    <button
                        key={adj.id}
                        title={`Add ${adj.label} adjustment layer`}
                        onClick={() => addAdjustmentLayer(adj.id, {})}
                        style={{
                            background: 'hsl(var(--bg-input))',
                            border: '1px solid hsl(var(--border-light))',
                            color: 'hsl(var(--text-muted))',
                            borderRadius: 2,
                            padding: '4px 2px',
                            cursor: 'pointer',
                            fontSize: 9,
                            textAlign: 'center',
                            lineHeight: 1.2,
                        }}
                    >
                        {adj.short}
                    </button>
                ))}
            </div>
            <div style={{ marginTop: 6, fontSize: 10, color: 'hsl(var(--text-muted))', padding: '0 4px' }}>
                Click to add adjustment layer. Applies non-destructively.
            </div>
        </div>
    );
}

const TAB_LABELS: Record<string, string> = {
    navigator: 'Navigator',
    info: 'Info',
    color: 'Color',
    swatches: 'Swatches',
    adjustments: 'Adjustments',
    character: 'Character',
    paragraph: 'Paragraph',
    layers: 'Layers',
    channels: 'Channels',
    paths: 'Paths',
    history: 'History',
    properties: 'Properties',
    'brush-presets': 'Brushes',
    'pattern-presets': 'Pattern Presets',
    styles: 'Styles',
};

const tabStyle = (active: boolean, dragging: boolean): React.CSSProperties => ({
    padding: '4px 10px',
    fontSize: 11,
    cursor: 'default',
    color: active ? 'hsl(var(--text-main))' : 'hsl(var(--text-muted))',
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    borderBottom: active ? '2px solid hsl(var(--accent-primary))' : '2px solid transparent',
    backgroundColor: 'transparent',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    opacity: dragging ? 0.4 : 1,
});

interface PanelGroupChromeProps {
    groupId: PanelGroupId;
    tabs: readonly string[];
    activeTab: string;
    onPickTab: (tab: string) => void;
    /** Renders the body when not collapsed. */
    children: React.ReactNode;
}

/**
 * Tabs row + collapse chevron + menu icon, with drag-to-reorder, right-click
 * → Close / Close Tab Group, and Esc-dismissed menu. Owns the small menu
 * state itself so the parent doesn't have to thread three copies.
 */
function PanelGroupChrome({ groupId, tabs, activeTab, onPickTab, children }: PanelGroupChromeProps) {
    const tabOrder = useEditorStore(s => s.panelTabOrder[groupId]);
    const setPanelTabOrder = useEditorStore(s => s.setPanelTabOrder);
    const collapsed = useEditorStore(s => !!s.panelGroupCollapsed[groupId]);
    const setPanelGroupCollapsed = useEditorStore(s => s.setPanelGroupCollapsed);
    const togglePanelVisibility = useEditorStore(s => s.togglePanelVisibility);

    // Apply the stored order if any; new tabs (toggled on later) drift to the
    // end, matching Photoshop's sticky-but-append-new behavior.
    const orderedTabs = (() => {
        if (!tabOrder) return [...tabs];
        const known = tabOrder.filter(t => tabs.includes(t));
        const fresh = tabs.filter(t => !tabOrder.includes(t));
        return [...known, ...fresh];
    })();

    const [dragId, setDragId] = useState<string | null>(null);
    const [dropIndex, setDropIndex] = useState<number | null>(null);
    const [menu, setMenu] = useState<{ x: number; y: number; tab: string } | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!menu) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { e.preventDefault(); setMenu(null); }
        };
        const onDown = (e: MouseEvent) => {
            if (!menuRef.current) return;
            if (menuRef.current.contains(e.target as Node)) return;
            setMenu(null);
        };
        document.addEventListener('keydown', onKey, true);
        document.addEventListener('mousedown', onDown, true);
        return () => {
            document.removeEventListener('keydown', onKey, true);
            document.removeEventListener('mousedown', onDown, true);
        };
    }, [menu]);

    function handleDragStart(e: React.DragEvent<HTMLButtonElement>, tabId: string) {
        setDragId(tabId);
        e.dataTransfer.effectAllowed = 'move';
        // Required for Firefox to fire drag events.
        e.dataTransfer.setData('text/plain', tabId);
    }

    function handleDragOver(e: React.DragEvent<HTMLButtonElement>, idx: number) {
        if (!dragId) return;
        // Only allow within-group reorder; cross-group drag is out of scope.
        const fromIdx = orderedTabs.indexOf(dragId);
        if (fromIdx < 0) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        // Insertion bar position: before idx (or after if hovering right half).
        const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        const target = e.clientX > midX ? idx + 1 : idx;
        setDropIndex(target);
    }

    function handleDrop() {
        if (!dragId || dropIndex == null) {
            setDragId(null);
            setDropIndex(null);
            return;
        }
        const fromIdx = orderedTabs.indexOf(dragId);
        if (fromIdx < 0) { setDragId(null); setDropIndex(null); return; }
        const next = [...orderedTabs];
        next.splice(fromIdx, 1);
        const insertAt = dropIndex > fromIdx ? dropIndex - 1 : dropIndex;
        next.splice(insertAt, 0, dragId);
        if (next.join() !== orderedTabs.join()) {
            setPanelTabOrder(groupId, next);
        }
        setDragId(null);
        setDropIndex(null);
    }

    function handleDragEnd() {
        setDragId(null);
        setDropIndex(null);
    }

    function openTabContextMenu(e: React.MouseEvent, tabId: string) {
        e.preventDefault();
        setMenu({ x: e.clientX, y: e.clientY, tab: tabId });
    }

    function openHeaderMenu(e: React.MouseEvent) {
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setMenu({ x: rect.right, y: rect.bottom, tab: activeTab });
    }

    function closePanel(tab: string) {
        togglePanelVisibility(tab as PanelId);
        setMenu(null);
    }

    function closeTabGroup() {
        for (const t of orderedTabs) {
            togglePanelVisibility(t as PanelId);
        }
        setMenu(null);
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: collapsed ? '0 0 28px' : '1 1 auto', minHeight: 28, overflow: 'hidden' }}>
            <div
                data-testid={`panel-group-tabs-${groupId}`}
                style={{
                    display: 'flex', alignItems: 'center',
                    backgroundColor: 'hsl(var(--bg-header))',
                    borderBottom: '1px solid hsl(var(--border-light))',
                    height: 28,
                    flexShrink: 0,
                    position: 'relative',
                }}
            >
                {orderedTabs.map((t, idx) => (
                    <button
                        key={t}
                        draggable
                        onDragStart={(e) => handleDragStart(e, t)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={handleDrop}
                        onDragEnd={handleDragEnd}
                        onContextMenu={(e) => openTabContextMenu(e, t)}
                        onClick={() => { if (!collapsed) onPickTab(t); else { onPickTab(t); setPanelGroupCollapsed(groupId, false); } }}
                        data-testid={`panel-tab-${t}`}
                        style={tabStyle(activeTab === t && !collapsed, dragId === t)}
                    >
                        {TAB_LABELS[t] ?? t}
                    </button>
                ))}
                {/* Insertion bar shown during drag-to-reorder. */}
                {dragId && dropIndex != null && (
                    <DropIndicator orderedTabs={orderedTabs} dropIndex={dropIndex} />
                )}
                <div style={{ flex: 1 }} />
                <button
                    data-testid={`panel-group-collapse-${groupId}`}
                    aria-label={collapsed ? 'Expand panel group' : 'Collapse panel group'}
                    onClick={() => setPanelGroupCollapsed(groupId, !collapsed)}
                    style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center' }}
                >
                    {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                </button>
                <button
                    data-testid={`panel-group-menu-${groupId}`}
                    aria-label="Panel group menu"
                    onClick={openHeaderMenu}
                    style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer', padding: '0 8px 0 4px', display: 'flex', alignItems: 'center' }}
                >
                    <Menu size={13} />
                </button>
            </div>
            {!collapsed && (
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {children}
                </div>
            )}
            {menu && (
                <div
                    ref={menuRef}
                    data-testid={`panel-group-context-menu-${groupId}`}
                    role="menu"
                    style={{
                        position: 'fixed',
                        left: menu.x, top: menu.y,
                        background: 'hsl(var(--bg-header))',
                        border: '1px solid hsl(var(--border-light))',
                        boxShadow: 'var(--shadow-menu)',
                        minWidth: 160,
                        padding: '3px 0',
                        zIndex: 9100,
                        fontSize: 12,
                        color: 'hsl(var(--text-main))',
                    }}
                >
                    <div role="menuitem"
                        data-testid={`panel-menu-close-${groupId}`}
                        onMouseDown={(e) => { e.stopPropagation(); closePanel(menu.tab); }}
                        style={menuItemStyle}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'hsl(var(--accent-primary))'; (e.currentTarget as HTMLDivElement).style.color = 'white'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; (e.currentTarget as HTMLDivElement).style.color = 'hsl(var(--text-main))'; }}
                    >
                        Close
                    </div>
                    <div role="menuitem"
                        data-testid={`panel-menu-close-tab-group-${groupId}`}
                        onMouseDown={(e) => { e.stopPropagation(); closeTabGroup(); }}
                        style={menuItemStyle}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'hsl(var(--accent-primary))'; (e.currentTarget as HTMLDivElement).style.color = 'white'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; (e.currentTarget as HTMLDivElement).style.color = 'hsl(var(--text-main))'; }}
                    >
                        Close Tab Group
                    </div>
                </div>
            )}
        </div>
    );
}

const menuItemStyle: React.CSSProperties = {
    padding: '4px 16px',
    cursor: 'default',
    whiteSpace: 'nowrap',
};

function DropIndicator({ orderedTabs, dropIndex }: { orderedTabs: readonly string[]; dropIndex: number }) {
    // Use measurement on the rendered tab buttons so the bar lands on the
    // actual layout, regardless of label widths.
    const ref = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const parent = el.parentElement;
        if (!parent) return;
        const tabEls = Array.from(parent.querySelectorAll<HTMLButtonElement>('[data-testid^="panel-tab-"]'));
        if (!tabEls.length) return;
        let x: number;
        if (dropIndex <= 0) {
            x = tabEls[0].offsetLeft - 1;
        } else if (dropIndex >= tabEls.length) {
            const last = tabEls[tabEls.length - 1];
            x = last.offsetLeft + last.offsetWidth - 1;
        } else {
            x = tabEls[dropIndex].offsetLeft - 1;
        }
        el.style.left = `${x}px`;
    }, [orderedTabs, dropIndex]);
    return (
        <div
            ref={ref}
            data-testid="panel-tab-drop-indicator"
            style={{ position: 'absolute', top: 0, bottom: 0, width: 2, background: 'hsl(var(--accent-primary))', pointerEvents: 'none' }}
        />
    );
}

export function RightPanelDock() {
    const panelVisibility = useEditorStore(s => s.panelVisibility);
    const [topTab, setTopTab] = useState<string>('navigator');
    const [textTab, setTextTab] = useState<string>('character');
    const [bottomTab, setBottomTab] = useState<string>('layers');

    const topVisibleTabs = (['navigator', 'info', 'color', 'swatches', 'adjustments'] as const).filter(t => panelVisibility[t]);
    const textVisibleTabs = (['character', 'paragraph'] as const).filter(t => panelVisibility[t]);
    const bottomVisibleTabs = (['layers', 'channels', 'paths', 'history', 'properties', 'brush-presets', 'pattern-presets', 'styles'] as const).filter(t => panelVisibility[t]);
    const activeTopTab = topVisibleTabs.includes(topTab as never) ? topTab : topVisibleTabs[0];
    const activeTextTab = textVisibleTabs.includes(textTab as never) ? textTab : textVisibleTabs[0];
    const activeBottomTab = bottomVisibleTabs.includes(bottomTab as never) ? bottomTab : bottomVisibleTabs[0];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {topVisibleTabs.length > 0 && (
                <PanelGroupChrome
                    groupId="top"
                    tabs={topVisibleTabs}
                    activeTab={activeTopTab ?? topVisibleTabs[0]}
                    onPickTab={setTopTab}
                >
                    {activeTopTab === 'navigator' && <NavigatorPanel />}
                    {activeTopTab === 'info' && <InfoPanel />}
                    {activeTopTab === 'color' && <ColorPanel />}
                    {activeTopTab === 'swatches' && <SwatchesPanel />}
                    {activeTopTab === 'adjustments' && <AdjustmentsPanel />}
                </PanelGroupChrome>
            )}

            {textVisibleTabs.length > 0 && (
                <PanelGroupChrome
                    groupId="middle"
                    tabs={textVisibleTabs}
                    activeTab={activeTextTab ?? textVisibleTabs[0]}
                    onPickTab={setTextTab}
                >
                    {activeTextTab === 'character' && <CharacterPanel />}
                    {activeTextTab === 'paragraph' && <ParagraphPanel />}
                </PanelGroupChrome>
            )}

            {bottomVisibleTabs.length > 0 && (
                <PanelGroupChrome
                    groupId="bottom"
                    tabs={bottomVisibleTabs}
                    activeTab={activeBottomTab ?? bottomVisibleTabs[0]}
                    onPickTab={setBottomTab}
                >
                    {activeBottomTab === 'layers' && <LayersPanel />}
                    {activeBottomTab === 'channels' && <ChannelsPanel />}
                    {activeBottomTab === 'paths' && <PathsPanel />}
                    {activeBottomTab === 'history' && <HistoryPanel />}
                    {activeBottomTab === 'properties' && <PropertiesPanel />}
                    {activeBottomTab === 'brush-presets' && <BrushPresetsPanel />}
                    {activeBottomTab === 'pattern-presets' && <PatternPresetsPanel />}
                    {activeBottomTab === 'styles' && <StylesPanel />}
                </PanelGroupChrome>
            )}
        </div>
    );
}
