import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import { useEditorStore } from '../../store/editorStore';
import { fillActiveLayer, type FillUse } from '../../tools/patterns';

interface FillDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

const overlay: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.48)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1200,
};

const panel: CSSProperties = {
    width: 340,
    background: 'hsl(var(--bg-panel))',
    border: '1px solid hsl(var(--border-light))',
    boxShadow: '0 18px 38px rgba(0,0,0,0.45)',
    color: 'hsl(var(--text-main))',
    padding: 14,
    display: 'grid',
    gap: 10,
};

const row: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '88px 1fr',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
};

const input: CSSProperties = {
    background: 'hsl(var(--bg-input))',
    border: '1px solid hsl(var(--border-light))',
    color: 'hsl(var(--text-main))',
    height: 24,
    padding: '0 6px',
    fontSize: 12,
};

const button: CSSProperties = {
    background: 'hsl(var(--bg-input))',
    border: '1px solid hsl(var(--border-light))',
    color: 'hsl(var(--text-main))',
    padding: '4px 14px',
    cursor: 'pointer',
    fontSize: 12,
};

export function FillDialog({ isOpen, onClose }: FillDialogProps) {
    const dialogRef = useDialogA11y(isOpen, onClose);
    const patternPresets = useEditorStore(s => s.patternPresets);
    const activePatternId = useEditorStore(s => s.activePatternId);
    const [use, setUse] = useState<FillUse>('foreground');
    const [selectedPatternId, setSelectedPatternId] = useState('');
    const [opacity, setOpacity] = useState(100);
    const [preserveTransparency, setPreserveTransparency] = useState(false);

    const patternId = selectedPatternId || activePatternId || patternPresets[0]?.id || '';

    if (!isOpen) return null;

    const commit = () => {
        const ok = fillActiveLayer({
            use,
            patternId: use === 'pattern' ? patternId : null,
            opacity: opacity / 100,
            preserveTransparency,
        });
        useEditorStore.getState().addToast(ok ? 'Fill applied' : 'No layer or pattern available', ok ? 'success' : 'error');
        if (ok) onClose();
    };

    return (
        <div data-testid="fill-dialog" style={overlay} onClick={onClose}>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="fill-dialog-title" tabIndex={-1} style={panel} onClick={e => e.stopPropagation()}>
                <div id="fill-dialog-title" style={{ fontWeight: 600, textAlign: 'center', fontSize: 14 }}>Fill</div>
                <label style={row}>
                    <span>Use</span>
                    <select data-testid="fill-use" value={use} onChange={e => setUse(e.target.value as FillUse)} style={input}>
                        <option value="foreground">Foreground Color</option>
                        <option value="background">Background Color</option>
                        <option value="pattern">Pattern</option>
                    </select>
                </label>
                {use === 'pattern' && (
                    <label style={row}>
                        <span>Pattern</span>
                        <select data-testid="fill-pattern-id" value={patternId} onChange={e => setSelectedPatternId(e.target.value)} style={input}>
                            <option value="">None</option>
                            {patternPresets.map(preset => (
                                <option key={preset.id} value={preset.id}>{preset.name}</option>
                            ))}
                        </select>
                    </label>
                )}
                <label style={row}>
                    <span>Opacity</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                            data-testid="fill-opacity"
                            type="number"
                            min={0}
                            max={100}
                            value={opacity}
                            onChange={e => setOpacity(Math.max(0, Math.min(100, Number(e.target.value))))}
                            style={{ ...input, width: 64 }}
                        />
                        <span>%</span>
                    </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <input
                        data-testid="fill-preserve-transparency"
                        type="checkbox"
                        checked={preserveTransparency}
                        onChange={e => setPreserveTransparency(e.target.checked)}
                    />
                    <span>Preserve Transparency</span>
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                    <button type="button" style={button} onClick={onClose}>Cancel</button>
                    <button type="button" data-testid="fill-ok" style={{ ...button, borderColor: 'hsl(var(--accent-primary))' }} onClick={commit}>OK</button>
                </div>
            </div>
        </div>
    );
}
