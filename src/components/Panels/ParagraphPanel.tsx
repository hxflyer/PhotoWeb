/**
 * ParagraphPanel — mirrors Photoshop's 段落 (Paragraph) panel.
 * Alignment, justification, indents, paragraph spacing, hyphenation toggle.
 */
import { useSyncExternalStore } from 'react';
import { subscribeTypeTool, getTypeVersion, getEditingStyle, updateEditingStyle, typeToolState } from '../../tools/type';
import { applyCharacterPanelEdit, commitCoalescedTypeEdit } from '../../tools/typeCommands';
import { useEditorStore } from '../../store/editorStore';
import type { TextStyle } from '../Canvas/TextEditOverlay';
import justifyLastLeftIcon from '../../assets/icons/paragraph-justify-last-left.svg';
import justifyLastCenterIcon from '../../assets/icons/paragraph-justify-last-center.svg';
import justifyLastRightIcon from '../../assets/icons/paragraph-justify-last-right.svg';
import justifyAllIcon from '../../assets/icons/paragraph-justify-all.svg';

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
    fontSize: 13, lineHeight: 1, padding: 0,
});
const labelStyle: React.CSSProperties = { fontSize: 11, color: 'hsl(var(--text-muted))', minWidth: 16 };

const ALIGN_BTNS: { id: TextStyle['textAlign']; glyph: string; title: string }[] = [
    { id: 'left',    glyph: '⫶≡', title: 'Left align' },
    { id: 'center',  glyph: '≡',  title: 'Center align' },
    { id: 'right',   glyph: '≡⫶', title: 'Right align' },
];

const JUSTIFY_BTNS: { id: 'last-left' | 'last-center' | 'last-right' | 'all'; icon: string; title: string }[] = [
    { id: 'last-left',   icon: justifyLastLeftIcon,   title: 'Justify last left' },
    { id: 'last-center', icon: justifyLastCenterIcon, title: 'Justify last center' },
    { id: 'last-right',  icon: justifyLastRightIcon,  title: 'Justify last right' },
    { id: 'all',         icon: justifyAllIcon,        title: 'Justify all' },
];

function NumField({ value, onChange, onCommit, width = 60 }: { value: number; onChange: (v: number) => void; onCommit?: () => void; width?: number }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <input
                type="number" value={value}
                onChange={e => onChange(Number(e.target.value) || 0)}
                onMouseUp={() => onCommit?.()}
                onBlur={() => onCommit?.()}
                style={{ ...inputStyle, width }}
            />
            <span style={{ fontSize: 10, color: 'hsl(var(--text-muted))' }}>点</span>
        </div>
    );
}

export function ParagraphPanel() {
    useSyncExternalStore(subscribeTypeTool, getTypeVersion);
    const s: TextStyle = getEditingStyle();
    function update(patch: Partial<TextStyle>, label = 'Edit Paragraph Style'): void {
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

    return (
        <div style={{ padding: 8, fontSize: 11, color: 'hsl(var(--text-main))', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Alignment buttons */}
            <div style={{ display: 'flex', gap: 2 }}>
                {ALIGN_BTNS.map(b => (
                    <button
                        key={b.id}
                        title={b.title}
                        style={toggleStyle(s.textAlign === b.id)}
                        onClick={() => { update({ textAlign: b.id }, 'Edit Text Alignment'); commitEdit(); }}
                    >{b.glyph}</button>
                ))}
                <div style={{ width: 6 }} />
                {JUSTIFY_BTNS.map(b => (
                    <button
                        key={b.id}
                        title={b.title}
                        aria-label={b.title}
                        data-testid={`paragraph-${b.id}`}
                        style={toggleStyle(s.textAlign === 'justify')}
                        onClick={() => { update({ textAlign: 'justify' }, 'Edit Text Alignment'); commitEdit(); }}
                    >
                        <img src={b.icon} alt="" width={14} height={14} style={{ filter: s.textAlign === 'justify' ? 'invert(1) brightness(2)' : 'none' }} />
                    </button>
                ))}
            </div>

            {/* Indent left + right */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', gap: 6, alignItems: 'center' }}>
                <span style={labelStyle} title="Indent left margin">→|</span>
                <NumField value={s.indentLeft}  onChange={v => update({ indentLeft: v }, 'Edit Left Indent')} onCommit={commitEdit} />
                <span style={labelStyle} title="Indent right margin">|←</span>
                <NumField value={s.indentRight} onChange={v => update({ indentRight: v }, 'Edit Right Indent')} onCommit={commitEdit} />
            </div>

            {/* First-line indent */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 6, alignItems: 'center' }}>
                <span style={labelStyle} title="First line indent">↳</span>
                <NumField value={s.indentFirst} onChange={v => update({ indentFirst: v }, 'Edit First Line Indent')} onCommit={commitEdit} />
            </div>

            {/* Space before / after */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', gap: 6, alignItems: 'center' }}>
                <span style={labelStyle} title="Space before paragraph">↑¶</span>
                <NumField value={s.spaceBefore} onChange={v => update({ spaceBefore: v }, 'Edit Space Before Paragraph')} onCommit={commitEdit} />
                <span style={labelStyle} title="Space after paragraph">↓¶</span>
                <NumField value={s.spaceAfter}  onChange={v => update({ spaceAfter: v }, 'Edit Space After Paragraph')} onCommit={commitEdit} />
            </div>

            {/* Hyphenate */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                    type="checkbox"
                    checked={s.hyphenate}
                    onChange={e => { update({ hyphenate: e.target.checked }, 'Toggle Hyphenate'); commitEdit(); }}
                    style={{ accentColor: 'hsl(var(--accent-primary))' }}
                />
                Hyphenate
            </label>

            <div style={{ height: 1, background: 'hsl(var(--border-light))', margin: '4px 0' }} />

            {/* Bullets / numbering header (visual only — list features deferred) */}
            <div style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>List</div>
            <div style={{ display: 'flex', gap: 2 }}>
                <button title="Bullets" style={toggleStyle(false)} disabled>•≡</button>
                <button title="Numbered" style={toggleStyle(false)} disabled>1.≡</button>
            </div>
        </div>
    );
}
