/**
 * RefineEdgeDialog — Select and Mask workspace controls.
 * Simplified: applies dilate/erode to the selection mask on commit.
 */
import { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

type ViewMode = 'on-white' | 'on-black' | 'on-transparent' | 'overlay';

export function RefineEdgeDialog({ isOpen, onClose }: Props) {
    const { expandSelection, contractSelection, setSelectionFeather } = useEditorStore();
    const [radius, setRadius] = useState(0);
    const [smooth, setSmooth] = useState(0);
    const [feather, setFeather] = useState(0);
    const [contrast, setContrast] = useState(0);
    const [shiftEdge, setShiftEdge] = useState(0);
    const [viewMode, setViewMode] = useState<ViewMode>('on-white');

    function handleApply() {
        if (feather > 0) setSelectionFeather(feather);
        if (shiftEdge > 0) expandSelection(Math.round(shiftEdge * 0.5));
        else if (shiftEdge < 0) contractSelection(Math.round(-shiftEdge * 0.5));
        onClose();
    }

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div
                data-testid="refine-edge-dialog"
                style={{
                    background: '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: '6px',
                    padding: '16px',
                    minWidth: '320px',
                    color: 'white',
                    fontSize: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
            >
                <div style={{ fontWeight: 600, marginBottom: '12px', fontSize: '13px' }}>Select and Mask</div>

                {/* View Mode */}
                <div style={{ marginBottom: '10px' }}>
                    <div style={{ marginBottom: '4px', opacity: 0.7 }}>View Mode</div>
                    <select
                        value={viewMode}
                        onChange={e => setViewMode(e.target.value as ViewMode)}
                        style={{ width: '100%', background: '#333', border: '1px solid #555', borderRadius: '3px', color: 'white', padding: '4px 8px', fontSize: '12px' }}
                    >
                        <option value="on-white" style={{ background: '#333' }}>On White</option>
                        <option value="on-black" style={{ background: '#333' }}>On Black</option>
                        <option value="on-transparent" style={{ background: '#333' }}>On Transparent</option>
                        <option value="overlay" style={{ background: '#333' }}>Overlay</option>
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    {([
                        ['Radius', radius, setRadius, 0, 250] as [string, number, (v: number) => void, number, number],
                        ['Smooth', smooth, setSmooth, 0, 100],
                        ['Feather', feather, setFeather, 0, 250],
                        ['Contrast', contrast, setContrast, 0, 100],
                        ['Shift Edge', shiftEdge, setShiftEdge, -100, 100],
                    ]).map(([label, val, setter, min, max]) => (
                        <label key={label as string} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '80px', fontSize: '11px' }}>{label as string}</span>
                            <input
                                type="range"
                                min={min as number} max={max as number}
                                value={val as number}
                                onChange={e => (setter as (v: number) => void)(Number(e.target.value))}
                                style={{ flex: 1 }}
                            />
                            <span style={{ width: '32px', textAlign: 'right', fontSize: '11px' }}>{val as number}</span>
                        </label>
                    ))}
                </div>

                {/* Output section */}
                <div style={{ marginBottom: '12px', fontSize: '11px', opacity: 0.7 }}>
                    Output: New Layer With Mask
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={onClose} style={{ padding: '4px 12px', background: 'transparent', border: '1px solid #555', borderRadius: '3px', color: 'white', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                    <button
                        onClick={handleApply}
                        style={{ padding: '4px 12px', background: '#0090ff', border: 'none', borderRadius: '3px', color: 'white', cursor: 'pointer', fontSize: '12px' }}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}
