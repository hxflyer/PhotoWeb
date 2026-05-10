/**
 * CharacterPanel — mirrors Photoshop's 字符 (Character) panel.
 * Edits the active editing-text style (or the default text style when no edit
 * session is open). Updates flow live to the on-canvas overlay.
 */
import { useSyncExternalStore } from 'react';
import {
    subscribeTypeTool, getTypeVersion, getEditingStyle, updateEditingStyle, defaultTextStyle,
} from '../../tools/type';
import { useEditorStore } from '../../store/editorStore';
import type { TextStyle } from '../Canvas/TextEditOverlay';

const FONT_FAMILIES = [
    'system-ui', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman',
    'Courier New', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Impact',
    'Comic Sans MS', 'Myriad Pro', 'Inter',
];

const FONT_STYLES: { label: string; weight: number; italic: boolean }[] = [
    { label: 'Light',       weight: 300, italic: false },
    { label: 'Regular',     weight: 400, italic: false },
    { label: 'Italic',      weight: 400, italic: true },
    { label: 'Medium',      weight: 500, italic: false },
    { label: 'Semibold',    weight: 600, italic: false },
    { label: 'Bold',        weight: 700, italic: false },
    { label: 'Bold Italic', weight: 700, italic: true },
    { label: 'Black',       weight: 900, italic: false },
];
function styleLabel(s: TextStyle): string {
    return FONT_STYLES.find(f => f.weight === s.fontWeight && (f.italic === (s.fontStyle === 'italic')))?.label ?? 'Regular';
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    fontSize: 11, padding: '2px 4px',
    background: 'hsl(var(--bg-input))',
    color: 'hsl(var(--text-main))',
    border: '1px solid hsl(var(--border-light))',
    borderRadius: 2,
    boxSizing: 'border-box',
};

const toggleStyle = (active: boolean): React.CSSProperties => ({
    width: 28, height: 22,
    background: active ? 'hsl(var(--accent-primary))' : 'hsl(var(--bg-input))',
    color: active ? '#fff' : 'hsl(var(--text-main))',
    border: '1px solid hsl(var(--border-light))',
    borderRadius: 2,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11,
    padding: 0,
});

const labelIconStyle: React.CSSProperties = {
    fontSize: 10, color: 'hsl(var(--text-muted))', minWidth: 18, textAlign: 'left',
};

function NumField({ value, onChange, suffix, width = 60, min, max }: {
    value: number; onChange: (v: number) => void; suffix?: string; width?: number; min?: number; max?: number;
}) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <input
                type="number" value={value} min={min} max={max}
                onChange={e => onChange(Number(e.target.value) || 0)}
                style={{ ...inputStyle, width }}
            />
            {suffix && <span style={{ fontSize: 10, color: 'hsl(var(--text-muted))' }}>{suffix}</span>}
        </div>
    );
}

export function CharacterPanel() {
    // Re-render whenever the type module increments its version (edit/default-style changes).
    useSyncExternalStore(subscribeTypeTool, getTypeVersion);
    const s: TextStyle = getEditingStyle();
    const openColorPicker = useEditorStore.getState().openColorPicker;

    const update = (patch: Partial<TextStyle>) => updateEditingStyle(patch);
    const styleNow = styleLabel(s);

    return (
        <div style={{ padding: 8, fontSize: 11, color: 'hsl(var(--text-main))', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Font family + style */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 4 }}>
                <select
                    value={s.fontFamily}
                    onChange={e => update({ fontFamily: e.target.value })}
                    style={inputStyle}
                >
                    {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <select
                    value={styleNow}
                    onChange={e => {
                        const cfg = FONT_STYLES.find(f => f.label === e.target.value)!;
                        update({ fontWeight: cfg.weight, fontStyle: cfg.italic ? 'italic' : 'normal' });
                    }}
                    style={inputStyle}
                >
                    {FONT_STYLES.map(f => <option key={f.label} value={f.label}>{f.label}</option>)}
                </select>
            </div>

            {/* Size (T) + Leading (auto) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', gap: 4, alignItems: 'center' }}>
                <span style={labelIconStyle} title="Font size">T̲T</span>
                <NumField value={s.fontSize} onChange={v => update({ fontSize: Math.max(1, v) })} suffix="pt" min={1} max={500} />
                <span style={labelIconStyle} title="Leading">A̲A</span>
                <select
                    value={s.lineHeight}
                    onChange={e => update({ lineHeight: Number(e.target.value) })}
                    style={inputStyle}
                >
                    <option value={0}>(Auto)</option>
                    <option value={1}>1.0</option>
                    <option value={1.2}>1.2</option>
                    <option value={1.5}>1.5</option>
                    <option value={2}>2.0</option>
                </select>
            </div>

            {/* Kerning V/A + Tracking VA */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', gap: 4, alignItems: 'center' }}>
                <span style={labelIconStyle} title="Kerning">V/A</span>
                <select value="metrics" disabled title="Kerning is currently metrics/auto only" style={{ ...inputStyle, width: 60, opacity: 0.65 }}>
                    <option value="metrics">Metrics</option>
                </select>
                <span style={labelIconStyle} title="Tracking">VA</span>
                <NumField value={s.letterSpacing} onChange={v => update({ letterSpacing: v })} width={60} />
            </div>

            {/* Vertical scaling + Horizontal scaling */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', gap: 4, alignItems: 'center' }}>
                <span style={labelIconStyle} title="Vertical scaling">↕T</span>
                <NumField value={Math.round(s.scaleY * 100)} onChange={v => update({ scaleY: Math.max(0.01, v / 100) })} suffix="%" min={1} max={1000} />
                <span style={labelIconStyle} title="Horizontal scaling">↔T</span>
                <NumField value={Math.round(s.scaleX * 100)} onChange={v => update({ scaleX: Math.max(0.01, v / 100) })} suffix="%" min={1} max={1000} />
            </div>

            {/* Baseline shift + Color */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: 4, alignItems: 'center' }}>
                <span style={labelIconStyle} title="Baseline shift">A↕</span>
                <NumField value={s.baselineShift} onChange={v => update({ baselineShift: v })} suffix="pt" />
                <span style={labelIconStyle} title="Color">Color:</span>
                <div
                    onClick={() => openColorPicker('type')}
                    title="Click to open color picker"
                    style={{
                        width: 80, height: 22,
                        background: s.color,
                        border: '1px solid hsl(var(--border-light))',
                        cursor: 'pointer',
                    }}
                />
            </div>

            {/* Type variant buttons row 1 */}
            <div style={{ display: 'flex', gap: 2 }}>
                <button title="Faux Bold"        style={toggleStyle(s.fauxBold)}      onClick={() => update({ fauxBold: !s.fauxBold })}><b>T</b></button>
                <button title="Faux Italic"      style={toggleStyle(s.fauxItalic)}    onClick={() => update({ fauxItalic: !s.fauxItalic })}><i>T</i></button>
                <button title="All Caps"         style={toggleStyle(s.allCaps)}       onClick={() => update({ allCaps: !s.allCaps, smallCaps: false })}>TT</button>
                <button title="Small Caps"       style={toggleStyle(s.smallCaps)}     onClick={() => update({ smallCaps: !s.smallCaps, allCaps: false })}>Tt</button>
                <button title="Superscript"      style={toggleStyle(s.superscript)}   onClick={() => update({ superscript: !s.superscript, subscript: false })}>T¹</button>
                <button title="Subscript"        style={toggleStyle(s.subscript)}     onClick={() => update({ subscript: !s.subscript, superscript: false })}>T₁</button>
                <button title="Underline"        style={toggleStyle(s.underline)}     onClick={() => update({ underline: !s.underline })}><u>T</u></button>
                <button title="Strikethrough"    style={toggleStyle(s.strikethrough)} onClick={() => update({ strikethrough: !s.strikethrough })}><s>T</s></button>
            </div>

            {/* Style ligature buttons row (visual placeholders — OpenType features) */}
            <div style={{ display: 'flex', gap: 2 }}>
                {['fi', 'st', '𝒶', 'aa', '½'].map((g, i) => (
                    <button key={i} title="OpenType feature" style={toggleStyle(false)} disabled>{g}</button>
                ))}
            </div>

            {/* Reset */}
            <button
                title="Reset to default text style"
                onClick={() => updateEditingStyle({ ...defaultTextStyle })}
                style={{
                    marginTop: 4, fontSize: 10, padding: '2px 6px',
                    background: 'transparent', color: 'hsl(var(--text-muted))',
                    border: '1px solid hsl(var(--border-light))', borderRadius: 2,
                    cursor: 'pointer', alignSelf: 'flex-end',
                }}
            >Reset</button>
        </div>
    );
}
