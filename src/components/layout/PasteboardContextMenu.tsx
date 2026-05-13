import { useEffect, useRef } from 'react';
import { useEditorStore } from '../../store/editorStore';
import type { PasteboardColor } from '../../store/types';

export interface PasteboardContextMenuState {
    x: number;
    y: number;
}

interface Props {
    state: PasteboardContextMenuState;
    onClose: () => void;
    /** Invoked when the user picks "Select Custom Color…". */
    onPickCustom: () => void;
}

const PRESETS: { id: PasteboardColor; label: string }[] = [
    { id: 'default', label: 'Default' },
    { id: 'black', label: 'Black' },
    { id: 'darkGray', label: 'Dark Gray' },
    { id: 'mediumGray', label: 'Medium Gray' },
    { id: 'lightGray', label: 'Light Gray' },
    { id: 'custom', label: 'Custom' },
];

/**
 * Photoshop's right-click-on-pasteboard color picker. Six presets plus an
 * entry that opens the full Color Picker. Selecting a preset applies it
 * immediately and persists. Esc / outside-click close without changing.
 */
export function PasteboardContextMenu({ state, onClose, onPickCustom }: Props) {
    const active = useEditorStore(s => s.pasteboardColor);
    const setColor = useEditorStore(s => s.setPasteboardColor);
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };
        const onMouseDown = (e: MouseEvent) => {
            if (!ref.current) return;
            if (ref.current.contains(e.target as Node)) return;
            onClose();
        };
        document.addEventListener('keydown', onKey, true);
        document.addEventListener('mousedown', onMouseDown, true);
        return () => {
            document.removeEventListener('keydown', onKey, true);
            document.removeEventListener('mousedown', onMouseDown, true);
        };
    }, [onClose]);

    return (
        <div
            ref={ref}
            data-testid="pasteboard-context-menu"
            role="menu"
            style={{
                position: 'fixed',
                left: state.x,
                top: state.y,
                background: 'hsl(var(--bg-header))',
                border: '1px solid hsl(var(--border-light))',
                boxShadow: 'var(--shadow-menu)',
                minWidth: 180,
                padding: '3px 0',
                zIndex: 9000,
                fontSize: 12,
                color: 'hsl(var(--text-main))',
            }}
        >
            {PRESETS.map(p => (
                <div
                    key={p.id}
                    role="menuitem"
                    data-testid={`pasteboard-preset-${p.id}`}
                    data-active={active === p.id || undefined}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        setColor(p.id);
                        onClose();
                    }}
                    style={{
                        padding: '4px 20px 4px 24px',
                        cursor: 'default',
                        whiteSpace: 'nowrap',
                        position: 'relative',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'hsl(var(--accent-primary))'; (e.currentTarget as HTMLDivElement).style.color = 'white'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; (e.currentTarget as HTMLDivElement).style.color = 'hsl(var(--text-main))'; }}
                >
                    {active === p.id && (
                        <span style={{ position: 'absolute', left: 8, fontSize: 10 }}>✓</span>
                    )}
                    {p.label}
                </div>
            ))}
            <div style={{ height: 1, background: 'hsl(var(--border-mid))', margin: '3px 0' }} />
            <div
                role="menuitem"
                data-testid="pasteboard-pick-custom"
                onMouseDown={(e) => {
                    e.stopPropagation();
                    onPickCustom();
                }}
                style={{
                    padding: '4px 20px 4px 24px',
                    cursor: 'default',
                    whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'hsl(var(--accent-primary))'; (e.currentTarget as HTMLDivElement).style.color = 'white'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; (e.currentTarget as HTMLDivElement).style.color = 'hsl(var(--text-main))'; }}
            >
                Select Custom Color…
            </div>
        </div>
    );
}
