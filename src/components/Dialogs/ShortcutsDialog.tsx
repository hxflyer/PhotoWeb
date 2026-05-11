interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const SHORTCUT_GROUPS: { title: string; items: { keys: string; label: string }[] }[] = [
    {
        title: 'File',
        items: [
            { keys: '⌘N', label: 'New Document' },
            { keys: '⌘O', label: 'Open' },
            { keys: '⌘S', label: 'Save' },
            { keys: '⌘⇧S', label: 'Save As' },
            { keys: '⌘⇧⌥E', label: 'Export…' },
        ],
    },
    {
        title: 'Edit',
        items: [
            { keys: '⌘Z', label: 'Undo' },
            { keys: '⌘⇧Z / ⌘Y', label: 'Redo' },
            { keys: '⌘T', label: 'Free Transform' },
            { keys: '⌘⇧T', label: 'Warp' },
            { keys: '⌘F', label: 'Repeat Last Filter' },
        ],
    },
    {
        title: 'Selection',
        items: [
            { keys: '⌘A', label: 'Select All' },
            { keys: '⌘D', label: 'Deselect' },
            { keys: '⌘I', label: 'Inverse' },
            { keys: 'Q', label: 'Quick Mask Mode' },
        ],
    },
    {
        title: 'View',
        items: [
            { keys: '⌘+ / ⌘-', label: 'Zoom In / Out' },
            { keys: '⌘0', label: 'Fit on Screen' },
            { keys: '⌘R', label: 'Toggle Rulers' },
            { keys: "⌘'", label: 'Toggle Grid' },
            { keys: '⌘⇧;', label: 'Toggle Snap' },
        ],
    },
    {
        title: 'Tools',
        items: [
            { keys: 'V', label: 'Move' },
            { keys: 'B / Shift+B', label: 'Brush / Pencil' },
            { keys: 'E', label: 'Eraser' },
            { keys: 'G / Shift+G', label: 'Paint Bucket / Gradient' },
            { keys: 'M / Shift+M', label: 'Rect / Ellipse Marquee' },
            { keys: 'L / Shift+L', label: 'Lasso / Polygonal Lasso' },
            { keys: 'W / Shift+W', label: 'Quick Selection / Magic Wand' },
            { keys: 'C', label: 'Crop' },
            { keys: 'T / Shift+T', label: 'Type Horizontal / Vertical' },
            { keys: 'P / Shift+P', label: 'Pen / Freeform Pen' },
            { keys: 'A / Shift+A', label: 'Direct / Path Selection' },
            { keys: 'U / Shift+U', label: 'Shape tools (cycle)' },
            { keys: 'O / Shift+O', label: 'Dodge / Burn / Sponge' },
            { keys: 'S', label: 'Clone Stamp' },
            { keys: 'I', label: 'Eyedropper' },
            { keys: 'H / Z', label: 'Hand / Zoom' },
        ],
    },
    {
        title: 'Brush',
        items: [
            { keys: '[ / ]', label: 'Decrease / Increase Brush Size' },
            { keys: '⇧[ / ⇧]', label: 'Decrease / Increase Hardness' },
            { keys: 'X', label: 'Swap FG/BG' },
            { keys: 'D', label: 'Reset Colors' },
        ],
    },
];

export function ShortcutsDialog({ isOpen, onClose }: Props) {
    if (!isOpen) return null;
    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{
                background: '#2a2a2a', border: '1px solid #444', borderRadius: 6,
                padding: 16, color: 'white', fontSize: 12, minWidth: 480, maxWidth: 600, maxHeight: '80vh', overflowY: 'auto',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>Keyboard Shortcuts</div>
                    <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #555', color: 'white', borderRadius: 3, padding: '2px 8px', cursor: 'pointer' }}>Close</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {SHORTCUT_GROUPS.map(group => (
                        <div key={group.title}>
                            <div style={{ fontWeight: 600, marginBottom: 4, opacity: 0.85 }}>{group.title}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {group.items.map(item => (
                                    <div key={item.keys + item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                        <span style={{ opacity: 0.9 }}>{item.label}</span>
                                        <span style={{ fontFamily: 'var(--font-mono, monospace)', opacity: 0.7 }}>{item.keys}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
