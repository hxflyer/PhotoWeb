import { useMemo, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { applyColorRangeSelection, type ColorRangeSample } from '../../tools/colorRange';

const overlay: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
};

const card: React.CSSProperties = {
    background: '#2a2a2a',
    border: '1px solid #444',
    borderRadius: 6,
    padding: 16,
    minWidth: 360,
    color: 'white',
    fontSize: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

const input: React.CSSProperties = {
    background: '#333',
    border: '1px solid #555',
    borderRadius: 3,
    color: 'white',
    padding: '4px 8px',
    fontSize: 12,
};

const btn: React.CSSProperties = {
    padding: '4px 12px',
    background: 'transparent',
    border: '1px solid #555',
    borderRadius: 3,
    color: 'white',
    cursor: 'pointer',
    fontSize: 12,
};

const primaryBtn: React.CSSProperties = { ...btn, background: '#0090ff', border: 'none' };

export function ColorRangeDialog() {
    const isOpen = useEditorStore(s => s.dialogs.isColorRangeDialogOpen);
    const primaryColor = useEditorStore(s => s.primaryColor);
    const close = useEditorStore.getState().closeColorRangeDialog;
    const [color, setColor] = useState(primaryColor);
    const [fuzziness, setFuzziness] = useState(40);
    const [samples, setSamples] = useState<ColorRangeSample[]>([{ color: primaryColor, mode: 'add' }]);
    const summary = useMemo(() => {
        const add = samples.filter(sample => sample.mode === 'add').length;
        const sub = samples.length - add;
        return `${add} add sample${add === 1 ? '' : 's'}${sub ? `, ${sub} subtract sample${sub === 1 ? '' : 's'}` : ''}`;
    }, [samples]);

    if (!isOpen) return null;

    function addSample(mode: ColorRangeSample['mode']) {
        setSamples(current => [...current, { color, mode }]);
    }

    function apply() {
        applyColorRangeSelection(useEditorStore.getState(), { samples, fuzziness });
        close();
    }

    return (
        <div style={overlay} onClick={close}>
            <div style={card} onClick={e => e.stopPropagation()}>
                <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>Color Range</div>
                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10, alignItems: 'center' }}>
                    <label style={{ opacity: 0.75 }}>Sample color</label>
                    <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ ...input, padding: 2, height: 28 }} />

                    <label style={{ opacity: 0.75 }}>Fuzziness</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="range" min={0} max={441} value={fuzziness}
                            onChange={e => setFuzziness(Number(e.target.value))}
                            style={{ flex: 1 }} />
                        <input type="number" min={0} max={441} value={fuzziness}
                            onChange={e => setFuzziness(Math.max(0, Math.min(441, Number(e.target.value))))}
                            style={{ ...input, width: 64 }} />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button style={btn} onClick={() => addSample('add')}>Add Sample</button>
                    <button style={btn} onClick={() => addSample('sub')}>Subtract Sample</button>
                    <button style={btn} onClick={() => setSamples([{ color, mode: 'add' }])}>Replace</button>
                </div>

                <div style={{ marginTop: 10, color: 'rgba(255,255,255,0.7)' }}>{summary}</div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                    <button onClick={close} style={btn}>Cancel</button>
                    <button onClick={apply} disabled={samples.length === 0} style={primaryBtn}>OK</button>
                </div>
            </div>
        </div>
    );
}
