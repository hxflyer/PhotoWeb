import { useState } from 'react';
import { LayersPanel } from './LayersPanel';
import { ChannelsPanel } from './ChannelsPanel';
import { PathsPanel } from './PathsPanel';
import { HistoryPanel } from './HistoryPanel';
import { ColorPanel } from './ColorPanel';
import { SwatchesPanel } from './SwatchesPanel';
import { CharacterPanel } from './CharacterPanel';
import { ParagraphPanel } from './ParagraphPanel';
import { useEditorStore } from '../../store/editorStore';

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

const tabStyle = (active: boolean): React.CSSProperties => ({
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
});

export function RightPanelDock() {
    const [topTab, setTopTab] = useState<'color' | 'swatches' | 'adjustments'>('color');
    const [showTop, setShowTop] = useState(true);
    const [textTab, setTextTab] = useState<'character' | 'paragraph'>('character');
    const [showText, setShowText] = useState(true);
    const [bottomTab, setBottomTab] = useState<'layers' | 'channels' | 'paths' | 'history'>('layers');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

            {/* ── Top panel group: Color / Swatches / Adjustments ── */}
            <div style={{
                flex: '0 0 auto',
                borderBottom: '1px solid hsl(var(--border-light))',
                display: 'flex', flexDirection: 'column',
                maxHeight: showTop ? 220 : 28,
                overflow: 'hidden',
                transition: 'max-height 0.15s',
            }}>
                {/* Tab bar */}
                <div style={{
                    display: 'flex', alignItems: 'center',
                    backgroundColor: 'hsl(var(--bg-header))',
                    borderBottom: '1px solid hsl(var(--border-light))',
                    height: 28,
                    flexShrink: 0,
                }}>
                    {(['color', 'swatches', 'adjustments'] as const).map(t => (
                        <button key={t} style={tabStyle(topTab === t && showTop)} onClick={() => { setTopTab(t); setShowTop(true); }}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                    <div style={{ flex: 1 }} />
                    <button
                        onClick={() => setShowTop(o => !o)}
                        style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer', padding: '0 8px', fontSize: 12 }}
                    >
                        {showTop ? '▴' : '▾'}
                    </button>
                </div>

                {/* Panel content */}
                {showTop && (
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {topTab === 'color' && <ColorPanel />}
                        {topTab === 'swatches' && <SwatchesPanel />}
                        {topTab === 'adjustments' && <AdjustmentsPanel />}
                    </div>
                )}
            </div>

            {/* ── Middle panel group: Character / Paragraph ── */}
            <div style={{
                flex: '0 0 auto',
                borderBottom: '1px solid hsl(var(--border-light))',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: showText ? 330 : 28,
                overflow: 'hidden',
                transition: 'max-height 0.15s',
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center',
                    backgroundColor: 'hsl(var(--bg-header))',
                    borderBottom: '1px solid hsl(var(--border-light))',
                    height: 28,
                    flexShrink: 0,
                }}>
                    {(['character', 'paragraph'] as const).map(t => (
                        <button key={t} style={tabStyle(textTab === t && showText)} onClick={() => { setTextTab(t); setShowText(true); }}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                    <div style={{ flex: 1 }} />
                    <button
                        onClick={() => setShowText(o => !o)}
                        style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer', padding: '0 8px', fontSize: 12 }}
                    >
                        {showText ? '▴' : '▾'}
                    </button>
                </div>

                {showText && (
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {textTab === 'character' && <CharacterPanel />}
                        {textTab === 'paragraph' && <ParagraphPanel />}
                    </div>
                )}
            </div>

            {/* ── Bottom panel group: Layers / Channels / Paths / History ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Tab bar */}
                <div style={{
                    display: 'flex', alignItems: 'center',
                    backgroundColor: 'hsl(var(--bg-header))',
                    borderBottom: '1px solid hsl(var(--border-light))',
                    height: 28,
                    flexShrink: 0,
                }}>
                    {(['layers', 'channels', 'paths', 'history'] as const).map(t => (
                        <button key={t} style={tabStyle(bottomTab === t)} onClick={() => setBottomTab(t)}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                    <div style={{ flex: 1 }} />
                </div>

                {/* Panel content */}
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {bottomTab === 'layers' && <LayersPanel />}
                    {bottomTab === 'channels' && <ChannelsPanel />}
                    {bottomTab === 'paths' && <PathsPanel />}
                    {bottomTab === 'history' && (
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            <HistoryPanel />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
