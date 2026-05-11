/**
 * ChannelsPanel — RGB / R / G / B rows. Selecting a single channel routes the
 * compositor through a greyscale extraction; "RGB" restores the composite view.
 */
import { Eye, EyeOff, Trash2, Copy } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import type { ActiveChannel } from '../../store/types';

interface ChannelDef {
    id: ActiveChannel;
    label: string;
    shortcut: string;
}

const CHANNELS: ChannelDef[] = [
    { id: 'rgb', label: 'RGB', shortcut: '⌘2' },
    { id: 'r',   label: 'Red', shortcut: '⌘3' },
    { id: 'g',   label: 'Green', shortcut: '⌘4' },
    { id: 'b',   label: 'Blue',  shortcut: '⌘5' },
];

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

// Channel thumbnail — composites visible layers and extracts the named channel
// as greyscale (for RGB it draws the composite as-is).
function ChannelThumbnail({ channel, size = 36 }: { channel: ActiveChannel; size?: number }) {
    const layers = useEditorStore(s => s.layers);
    const ref = (el: HTMLCanvasElement | null) => {
        if (!el) return;
        const ctx = el.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, size, size);
        // Checker bg
        const tile = 6;
        for (let y = 0; y < size; y += tile) {
            for (let x = 0; x < size; x += tile) {
                ctx.fillStyle = ((x / tile + y / tile) % 2 === 0) ? '#fff' : '#bbb';
                ctx.fillRect(x, y, tile, tile);
            }
        }
        // Composite all visible layers into a temp at canvas size, then scale-draw to thumbnail
        const first = layers.find(l => l.visible && l.canvas);
        if (!first) return;
        const lw = first.canvas.width;
        const lh = first.canvas.height;
        const composed = document.createElement('canvas');
        composed.width = lw; composed.height = lh;
        const cctx = composed.getContext('2d')!;
        layers.forEach(l => {
            if (l.visible && l.canvas) {
                cctx.globalAlpha = l.opacity ?? 1;
                cctx.drawImage(l.canvas, 0, 0);
            }
        });
        cctx.globalAlpha = 1;
        if (channel !== 'rgb') {
            const img = cctx.getImageData(0, 0, lw, lh);
            const d = img.data;
            const off = channel === 'r' ? 0 : channel === 'g' ? 1 : 2;
            for (let i = 0; i < d.length; i += 4) {
                const v = d[i + off];
                d[i] = v; d[i + 1] = v; d[i + 2] = v;
            }
            cctx.putImageData(img, 0, 0);
        }
        const s = Math.min(size / lw, size / lh);
        const dw = lw * s; const dh = lh * s;
        ctx.drawImage(composed, (size - dw) / 2, (size - dh) / 2, dw, dh);
    };
    return (
        <canvas
            ref={ref}
            width={size} height={size}
            style={{ width: size, height: size, border: '1px solid hsl(var(--border-light))', flexShrink: 0 }}
        />
    );
}

export function ChannelsPanel() {
    const activeChannel = useEditorStore(s => s.activeChannel);
    const setActiveChannel = useEditorStore.getState().setActiveChannel;
    const channelVisibility = useEditorStore(s => s.channelVisibility);
    const toggleChannelVisibility = useEditorStore.getState().toggleChannelVisibility;
    const visibility = {
        rgb: channelVisibility.r && channelVisibility.g && channelVisibility.b,
        r: channelVisibility.r,
        g: channelVisibility.g,
        b: channelVisibility.b,
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'hsl(var(--bg-panel))' }}>
            {/* Channel rows */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {CHANNELS.map(ch => {
                    const isActive = activeChannel === ch.id;
                    const visible = visibility[ch.id];
                    return (
                        <div
                            key={ch.id}
                            onClick={() => setActiveChannel(ch.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '4px 8px',
                                backgroundColor: isActive ? 'hsl(var(--accent-primary))' : 'transparent',
                                cursor: 'pointer',
                                userSelect: 'none',
                                minHeight: 44,
                                borderBottom: '1px solid hsl(var(--border-mid))',
                            }}
                        >
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (ch.id === 'rgb') {
                                        // Toggle all three together to match the composite-view behavior.
                                        const allOn = channelVisibility.r && channelVisibility.g && channelVisibility.b;
                                        const next = !allOn;
                                        useEditorStore.getState().setChannelVisibility('r', next);
                                        useEditorStore.getState().setChannelVisibility('g', next);
                                        useEditorStore.getState().setChannelVisibility('b', next);
                                    } else {
                                        toggleChannelVisibility(ch.id);
                                    }
                                }}
                                title="Channel visibility"
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                                    color: isActive ? '#fff' : 'hsl(var(--text-muted))',
                                    display: 'flex', flexShrink: 0,
                                }}
                            >
                                {visible ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                            <ChannelThumbnail channel={ch.id} />
                            <span style={{
                                flex: 1, fontSize: 12,
                                color: isActive ? '#fff' : 'hsl(var(--text-main))',
                            }}>{ch.label}</span>
                            <span style={{
                                fontSize: 11,
                                color: isActive ? 'rgba(255,255,255,0.7)' : 'hsl(var(--text-muted))',
                                fontFamily: 'var(--font-mono, monospace)',
                            }}>{ch.shortcut}</span>
                        </div>
                    );
                })}
            </div>

            {/* Bottom toolbar — only Duplicate + Delete per request */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                padding: '4px 8px', gap: 4,
                borderTop: '1px solid hsl(var(--border-light))',
                backgroundColor: 'hsl(var(--bg-header))',
                flexShrink: 0,
            }}>
                <button
                    title="Duplicate Channel (built-in channels can't be duplicated yet)"
                    disabled
                    style={{ ...HEAD_BTN, opacity: 0.4 }}
                ><Copy size={14} /></button>
                <button
                    title="Delete Channel (built-in channels can't be deleted)"
                    disabled
                    style={{ ...HEAD_BTN, opacity: 0.4 }}
                ><Trash2 size={14} /></button>
            </div>
        </div>
    );
}
