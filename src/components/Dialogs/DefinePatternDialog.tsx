import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useDialogA11y } from '../../hooks/useDialogA11y';

const overlay: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1200,
};

const card: React.CSSProperties = {
    background: 'hsl(var(--bg-panel))',
    border: '1px solid hsl(var(--border-light))',
    borderRadius: 4,
    color: 'hsl(var(--text-main))',
    padding: 16,
    minWidth: 320,
    fontSize: 12,
    boxShadow: 'var(--shadow-menu)',
};

const inputStyle: React.CSSProperties = {
    background: 'hsl(var(--bg-input))',
    border: '1px solid hsl(var(--border-light))',
    color: 'hsl(var(--text-main))',
    padding: '4px 8px',
    borderRadius: 2,
    fontSize: 12,
    width: '100%',
};

const buttonStyle: React.CSSProperties = {
    padding: '4px 14px',
    background: 'hsl(var(--bg-input))',
    color: 'hsl(var(--text-main))',
    border: '1px solid hsl(var(--border-light))',
    borderRadius: 2,
    cursor: 'pointer',
    fontSize: 12,
};

const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: 'hsl(var(--accent-primary))',
    border: '1px solid hsl(var(--accent-primary))',
    color: '#fff',
};

interface Props {
    isOpen: boolean;
    defaultName?: string;
    onCancel: () => void;
    onCommit: (params: { name: string }) => void;
}

function PatternPreview() {
    const ref = useRef<HTMLCanvasElement | null>(null);
    const layers = useEditorStore(s => s.layers);
    const activeLayerId = useEditorStore(s => s.activeLayerId);
    useEffect(() => {
        const c = ref.current;
        if (!c) return;
        const ctx = c.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, c.width, c.height);
        // Checker background.
        const tile = 8;
        for (let y = 0; y < c.height; y += tile) {
            for (let x = 0; x < c.width; x += tile) {
                ctx.fillStyle = ((x / tile + y / tile) % 2 === 0) ? '#fff' : '#bbb';
                ctx.fillRect(x, y, tile, tile);
            }
        }
        const layer = layers.find(l => l.id === activeLayerId);
        if (!layer || layer.kind === 'group') return;
        const lw = layer.canvas.width;
        const lh = layer.canvas.height;
        if (!lw || !lh) return;
        const s = Math.min(c.width / lw, c.height / lh);
        const dw = lw * s;
        const dh = lh * s;
        ctx.drawImage(layer.canvas, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh);
    }, [layers, activeLayerId]);
    return (
        <canvas
            data-testid="define-pattern-preview"
            ref={ref}
            width={64}
            height={64}
            style={{ border: '1px solid hsl(var(--border-light))', borderRadius: 2 }}
        />
    );
}

export function DefinePatternDialog({ isOpen, defaultName = 'New Pattern', onCancel, onCommit }: Props) {
    if (!isOpen) return null;
    return (
        <DefinePatternDialogContent
            key={defaultName}
            defaultName={defaultName}
            onCancel={onCancel}
            onCommit={onCommit}
        />
    );
}

function DefinePatternDialogContent({ defaultName, onCancel, onCommit }: Omit<Props, 'isOpen'> & { defaultName: string }) {
    const [name, setName] = useState(defaultName);
    const dialogRef = useDialogA11y(true, onCancel);

    function commit() {
        const trimmed = name.trim();
        if (!trimmed) return;
        onCommit({ name: trimmed });
    }

    return (
        <div style={overlay} role="dialog" aria-modal="true" data-testid="define-pattern-dialog">
            <div ref={dialogRef} style={card}>
                <div style={{ fontWeight: 600, marginBottom: 10 }}>Pattern Name</div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                    <PatternPreview />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>Name</span>
                            <input
                                data-testid="define-pattern-name"
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') commit();
                                    if (e.key === 'Escape') onCancel();
                                }}
                                autoFocus
                                style={inputStyle}
                            />
                        </label>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button type="button" data-testid="define-pattern-cancel" style={buttonStyle} onClick={onCancel}>Cancel</button>
                    <button type="button" data-testid="define-pattern-ok" style={primaryButtonStyle} onClick={commit}>OK</button>
                </div>
            </div>
        </div>
    );
}
