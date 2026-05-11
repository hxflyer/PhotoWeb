/**
 * CharacterPanel — mirrors Photoshop's 字符 (Character) panel.
 * Edits the active editing-text style (or the default text style when no edit
 * session is open). Updates flow live to the on-canvas overlay.
 */
import { useSyncExternalStore } from 'react';
import {
    subscribeTypeTool, getTypeVersion, getEditingStyle, updateEditingStyle, defaultTextStyle,
    typeToolState,
} from '../../tools/type';
import {
    applyCharacterPanelEdit, commitCoalescedTypeEdit,
} from '../../tools/typeCommands';
import { useEditorStore } from '../../store/editorStore';
import type { TextStyle } from '../Canvas/TextEditOverlay';
import { FontPicker } from './FontPicker';
import {
    AllCapsIcon, AlternateGlyphIcon, AntiAliasIcon, BaselineShiftIcon, ContextualAlternatesIcon,
    FauxBoldIcon, FauxItalicIcon, FontSizeIcon, FractionsIcon, HorizontalScaleIcon,
    KerningIcon, LeadingIcon, LigatureIcon, OrdinalsIcon, SmallCapsIcon,
    StrikethroughTextIcon, StylisticAlternatesIcon, SubscriptIcon, SuperscriptIcon,
    SwashIcon, TextColorIcon, TitlingAlternatesIcon, TrackingIcon, UnderlineTextIcon,
    VerticalScaleIcon,
} from '../icons/PhotowebIcons';

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
    color: 'hsl(var(--text-muted))',
    minWidth: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
};

const disabledFeatureStyle: React.CSSProperties = {
    opacity: 0.58,
    cursor: 'not-allowed',
};

function NumField({ value, onChange, onCommit, suffix, width = 60, min, max }: {
    value: number; onChange: (v: number) => void; onCommit?: () => void;
    suffix?: string; width?: number; min?: number; max?: number;
}) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <input
                type="number" value={value} min={min} max={max}
                onChange={e => onChange(Number(e.target.value) || 0)}
                onMouseUp={() => onCommit?.()}
                onBlur={() => onCommit?.()}
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
    // Subscribe to the active layer id so the FontPicker can mirror the store's
    // value via the shared `layerId` prop (single source of truth across panels).
    const activeLayerId = useEditorStore(st => st.activeLayerId);
    const activeLayerKind = useEditorStore(st => {
        const l = st.layers.find(ly => ly.id === st.activeLayerId);
        return l?.kind ?? null;
    });
    const sharedLayerId = activeLayerKind === 'type' ? activeLayerId ?? undefined : undefined;

    // While the contenteditable overlay is active, edits flow live through
    // updateEditingStyle (no per-keystroke history). Otherwise route through
    // applyCharacterPanelEdit so each Character panel change to the selected
    // type layer is a single undoable command (coalesced across slider drags).
    function update(patch: Partial<TextStyle>, label = 'Edit Type Style'): void {
        if (typeToolState.editing) {
            updateEditingStyle(patch);
            return;
        }
        const state = useEditorStore.getState();
        const activeLayer = state.layers.find(l => l.id === state.activeLayerId);
        if (activeLayer?.kind === 'type' && activeLayer.typeData) {
            applyCharacterPanelEdit(label, patch);
            return;
        }
        updateEditingStyle(patch);
    }
    const commitEdit = () => commitCoalescedTypeEdit();
    const styleNow = styleLabel(s);

    return (
        <div style={{ padding: 8, fontSize: 11, color: 'hsl(var(--text-main))', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Font family + style */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 4 }}>
                <FontPicker
                    testIdPrefix="character-font-picker"
                    layerId={sharedLayerId}
                    value={s.fontFamily}
                    onChange={next => update({ fontFamily: next }, 'Edit Font Family')}
                    onCommit={commitEdit}
                />
                <select
                    value={styleNow}
                    onChange={e => {
                        const cfg = FONT_STYLES.find(f => f.label === e.target.value)!;
                        update({ fontWeight: cfg.weight, fontStyle: cfg.italic ? 'italic' : 'normal' }, 'Edit Font Style');
                        commitEdit();
                    }}
                    style={inputStyle}
                >
                    {FONT_STYLES.map(f => <option key={f.label} value={f.label}>{f.label}</option>)}
                </select>
            </div>

            {/* Size (T) + Leading (auto) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', gap: 4, alignItems: 'center' }}>
                <span style={labelIconStyle} title="Font size"><FontSizeIcon size={14} /></span>
                <NumField value={s.fontSize} onChange={v => update({ fontSize: Math.max(1, v) }, 'Edit Font Size')} onCommit={commitEdit} suffix="pt" min={1} max={500} />
                <span style={labelIconStyle} title="Leading"><LeadingIcon size={14} /></span>
                <select
                    value={s.lineHeight}
                    onChange={e => { update({ lineHeight: Number(e.target.value) }, 'Edit Leading'); commitEdit(); }}
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
                <span style={labelIconStyle} title="Kerning"><KerningIcon size={18} /></span>
                <select value="metrics" disabled title="Kerning is currently metrics/auto only" style={{ ...inputStyle, width: 60, opacity: 0.65 }}>
                    <option value="metrics">Metrics</option>
                </select>
                <span style={labelIconStyle} title="Tracking"><TrackingIcon size={18} /></span>
                <NumField value={s.letterSpacing} onChange={v => update({ letterSpacing: v }, 'Edit Tracking')} onCommit={commitEdit} width={60} />
            </div>

            {/* Vertical scaling + Horizontal scaling */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', gap: 4, alignItems: 'center' }}>
                <span style={labelIconStyle} title="Vertical scaling"><VerticalScaleIcon size={14} /></span>
                <NumField value={Math.round(s.scaleY * 100)} onChange={v => update({ scaleY: Math.max(0.01, v / 100) }, 'Edit Vertical Scale')} onCommit={commitEdit} suffix="%" min={1} max={1000} />
                <span style={labelIconStyle} title="Horizontal scaling"><HorizontalScaleIcon size={14} /></span>
                <NumField value={Math.round(s.scaleX * 100)} onChange={v => update({ scaleX: Math.max(0.01, v / 100) }, 'Edit Horizontal Scale')} onCommit={commitEdit} suffix="%" min={1} max={1000} />
            </div>

            {/* Baseline shift + Color */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: 4, alignItems: 'center' }}>
                <span style={labelIconStyle} title="Baseline shift"><BaselineShiftIcon size={14} /></span>
                <NumField value={s.baselineShift} onChange={v => update({ baselineShift: v }, 'Edit Baseline Shift')} onCommit={commitEdit} suffix="pt" />
                <span style={labelIconStyle} title="Text color"><TextColorIcon size={18} /></span>
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
                <button title="Faux Bold"        style={toggleStyle(s.fauxBold)}      onClick={() => { update({ fauxBold: !s.fauxBold }, 'Toggle Faux Bold'); commitEdit(); }}><FauxBoldIcon size={18} /></button>
                <button title="Faux Italic"      style={toggleStyle(s.fauxItalic)}    onClick={() => { update({ fauxItalic: !s.fauxItalic }, 'Toggle Faux Italic'); commitEdit(); }}><FauxItalicIcon size={18} /></button>
                <button title="All Caps"         style={toggleStyle(s.allCaps)}       onClick={() => { update({ allCaps: !s.allCaps, smallCaps: false }, 'Toggle All Caps'); commitEdit(); }}><AllCapsIcon size={18} /></button>
                <button title="Small Caps"       style={toggleStyle(s.smallCaps)}     onClick={() => { update({ smallCaps: !s.smallCaps, allCaps: false }, 'Toggle Small Caps'); commitEdit(); }}><SmallCapsIcon size={18} /></button>
                <button title="Superscript"      style={toggleStyle(s.superscript)}   onClick={() => { update({ superscript: !s.superscript, subscript: false }, 'Toggle Superscript'); commitEdit(); }}><SuperscriptIcon size={18} /></button>
                <button title="Subscript"        style={toggleStyle(s.subscript)}     onClick={() => { update({ subscript: !s.subscript, superscript: false }, 'Toggle Subscript'); commitEdit(); }}><SubscriptIcon size={18} /></button>
                <button title="Underline"        style={toggleStyle(s.underline)}     onClick={() => { update({ underline: !s.underline }, 'Toggle Underline'); commitEdit(); }}><UnderlineTextIcon size={18} /></button>
                <button title="Strikethrough"    style={toggleStyle(s.strikethrough)} onClick={() => { update({ strikethrough: !s.strikethrough }, 'Toggle Strikethrough'); commitEdit(); }}><StrikethroughTextIcon size={18} /></button>
            </div>

            {/* OpenType feature row mirrors Photoshop's character panel controls. */}
            <div style={{ display: 'flex', gap: 2 }}>
                <button title="Standard Ligatures" style={{ ...toggleStyle(false), ...disabledFeatureStyle }} disabled><LigatureIcon size={18} /></button>
                <button title="Discretionary Ligatures" style={{ ...toggleStyle(false), ...disabledFeatureStyle }} disabled><AlternateGlyphIcon size={18} /></button>
                <button title="Contextual Alternates" style={{ ...toggleStyle(false), ...disabledFeatureStyle }} disabled><ContextualAlternatesIcon size={18} /></button>
                <button title="Swash" style={{ ...toggleStyle(false), ...disabledFeatureStyle }} disabled><SwashIcon size={18} /></button>
                <button title="Stylistic Alternates" style={{ ...toggleStyle(false), ...disabledFeatureStyle }} disabled><StylisticAlternatesIcon size={18} /></button>
                <button title="Titling Alternates" style={{ ...toggleStyle(false), ...disabledFeatureStyle }} disabled><TitlingAlternatesIcon size={18} /></button>
                <button title="Ordinals" style={{ ...toggleStyle(false), ...disabledFeatureStyle }} disabled><OrdinalsIcon size={18} /></button>
                <button title="Fractions" style={{ ...toggleStyle(false), ...disabledFeatureStyle }} disabled><FractionsIcon size={18} /></button>
            </div>

            {/* Language + anti-aliasing strip, matching Photoshop's lower row. */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 90px', gap: 4, alignItems: 'center' }}>
                <select title="Language" defaultValue="English" disabled style={{ ...inputStyle, opacity: 0.72 }}>
                    <option value="English">English</option>
                </select>
                <span style={labelIconStyle} title="Anti-aliasing"><AntiAliasIcon size={18} /></span>
                <select
                    title="Anti-aliasing method"
                    value={s.antiAlias ?? 'crisp'}
                    onChange={e => update({ antiAlias: e.target.value as TextStyle['antiAlias'] }, 'Edit Anti-Aliasing')}
                    style={inputStyle}
                >
                    <option value="none">None</option>
                    <option value="sharp">Sharp</option>
                    <option value="crisp">Crisp</option>
                    <option value="strong">Strong</option>
                    <option value="smooth">Smooth</option>
                </select>
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
