import { useEffect, useMemo, useRef, useState } from 'react';
import { getAvailableFonts, refreshAvailableFonts } from '../../utils/fontList';
import { useEditorStore } from '../../store/editorStore';
import type { TypeLayerData } from '../../tools/type';

interface FontPickerProps {
    value: string;
    onChange: (next: string) => void;
    onCommit?: () => void;
    style?: React.CSSProperties;
    placeholder?: string;
    testIdPrefix?: string;
    /**
     * When provided, the picker mirrors the font family of this layer's typeData
     * (subscribed from the store) so multiple FontPicker instances bound to the
     * same layer (Character panel + Properties Type section) stay in sync as a
     * single shared source of truth.
     */
    layerId?: string;
}

const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 2px)',
    left: 0,
    right: 0,
    maxHeight: 240,
    overflowY: 'auto',
    background: 'hsl(var(--bg-panel))',
    border: '1px solid hsl(var(--border-light))',
    borderRadius: 2,
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
    zIndex: 1500,
};

const optionStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 8px',
    fontSize: 12,
    cursor: 'pointer',
    background: active ? 'hsl(var(--accent-primary))' : 'transparent',
    color: active ? '#fff' : 'hsl(var(--text-main))',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
});

export function FontPicker({ value, onChange, onCommit, style, placeholder, testIdPrefix = 'font-picker', layerId }: FontPickerProps) {
    // When a layerId is provided, subscribe the input value to the layer's
    // typeData.style.fontFamily so two FontPicker instances bound to the same
    // layer share a single source of truth and rerender together.
    const storeFont = useEditorStore(s => {
        if (!layerId) return null;
        const layer = s.layers.find(l => l.id === layerId);
        const data = layer?.typeData as TypeLayerData | undefined;
        return data?.style.fontFamily ?? null;
    });
    const effectiveValue = storeFont ?? value;
    // `draft` is what the user has typed since opening the combobox; when null,
    // the input mirrors the controlled `value`. This avoids a setState-in-effect
    // cycle to re-sync after the prop changes upstream (e.g. via undo).
    const [draft, setDraft] = useState<string | null>(null);
    const [open, setOpen] = useState<boolean>(false);
    const [highlight, setHighlight] = useState<number>(0);
    const [fonts, setFonts] = useState<string[]>(() => getAvailableFonts());
    const inputRef = useRef<HTMLInputElement | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        let cancelled = false;
        refreshAvailableFonts().then(list => {
            if (!cancelled) setFonts(list);
        }).catch(() => { /* keep cached list */ });
        return () => { cancelled = true; };
    }, []);

    const query = draft ?? effectiveValue;

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return fonts;
        return fonts.filter(f => f.toLowerCase().includes(q));
    }, [fonts, query]);

    const safeHighlight = highlight >= filtered.length ? 0 : highlight;

    useEffect(() => {
        if (!open) return;
        function onDocMouseDown(e: MouseEvent) {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpen(false);
                setDraft(null);
            }
        }
        document.addEventListener('mousedown', onDocMouseDown);
        return () => document.removeEventListener('mousedown', onDocMouseDown);
    }, [open]);

    function commit(name: string) {
        setDraft(null);
        setOpen(false);
        onChange(name);
        onCommit?.();
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setHighlight(h => Math.min(filtered.length - 1, h + 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setOpen(true);
            setHighlight(h => Math.max(0, h - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const pick = filtered[safeHighlight];
            if (pick) commit(pick);
            else if (query.trim()) commit(query.trim());
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setDraft(null);
            setOpen(false);
            inputRef.current?.blur();
        }
    }

    return (
        <div ref={rootRef} style={{ position: 'relative', ...style }} data-testid={testIdPrefix}>
            <input
                ref={inputRef}
                role="combobox"
                aria-expanded={open}
                aria-autocomplete="list"
                aria-label="Font Family"
                data-testid={`${testIdPrefix}-input`}
                type="text"
                value={query}
                placeholder={placeholder}
                onFocus={() => { setOpen(true); setHighlight(0); }}
                onChange={e => { setDraft(e.target.value); setOpen(true); setHighlight(0); }}
                onKeyDown={handleKeyDown}
                style={{
                    width: '100%',
                    fontSize: 11,
                    padding: '2px 4px',
                    background: 'hsl(var(--bg-input))',
                    color: 'hsl(var(--text-main))',
                    border: '1px solid hsl(var(--border-light))',
                    borderRadius: 2,
                    boxSizing: 'border-box',
                    fontFamily: query || 'inherit',
                }}
            />
            {open && filtered.length > 0 && (
                <div
                    role="listbox"
                    data-testid={`${testIdPrefix}-listbox`}
                    style={dropdownStyle}
                    onMouseDown={e => e.preventDefault()}
                >
                    {filtered.map((font, i) => (
                        <div
                            key={font}
                            role="option"
                            aria-selected={i === safeHighlight}
                            data-testid={`${testIdPrefix}-option-${font}`}
                            style={{ ...optionStyle(i === safeHighlight), fontFamily: font }}
                            onMouseEnter={() => setHighlight(i)}
                            onClick={() => commit(font)}
                        >
                            {font}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
