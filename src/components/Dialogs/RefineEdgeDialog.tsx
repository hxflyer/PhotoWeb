/**
 * RefineEdgeDialog — Select and Mask workspace controls.
 * Simplified: applies dilate/erode to the selection mask on commit.
 */
import { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { rasterizeSelectionOperations } from '../../utils/selectionUtils';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

type ViewMode = 'on-white' | 'on-black' | 'on-transparent' | 'overlay';
type OutputTarget = 'selection' | 'layer-mask' | 'new-layer-with-mask';

export function RefineEdgeDialog({ isOpen, onClose }: Props) {
    const { refineEdge } = useEditorStore();
    const [radius, setRadius] = useState(0);
    const [smooth, setSmooth] = useState(0);
    const [feather, setFeather] = useState(0);
    const [contrast, setContrast] = useState(0);
    const [shiftEdge, setShiftEdge] = useState(0);
    const [viewMode, setViewMode] = useState<ViewMode>('on-white');
    const [output, setOutput] = useState<OutputTarget>('selection');

    function handleApply() {
        // Always refine the selection first so the output reflects the refined edges.
        refineEdge({ radius, smooth, feather, contrast, shiftEdge });

        if (output === 'selection') {
            onClose();
            return;
        }

        const state = useEditorStore.getState();
        const { width, height } = state;
        const refinedMaskData = rasterizeSelectionOperations(state.selection.operations, width, height);

        if (output === 'layer-mask') {
            const id = state.activeLayerId;
            if (!id) { onClose(); return; }
            const layer = state.layers.find(l => l.id === id);
            if (!layer) { onClose(); return; }
            // Add (or replace) the layer mask using the refined alpha.
            if (layer.mask) state.removeLayerMask(id);
            state.addLayerMask(id, 'hide-all');
            const refreshed = useEditorStore.getState().layers.find(l => l.id === id);
            if (refreshed?.mask) {
                const mctx = refreshed.mask.ctx;
                const img = mctx.createImageData(width, height);
                for (let i = 0; i < refinedMaskData.length; i++) {
                    const v = refinedMaskData[i];
                    img.data[i * 4] = v;
                    img.data[i * 4 + 1] = v;
                    img.data[i * 4 + 2] = v;
                    img.data[i * 4 + 3] = 255;
                }
                mctx.putImageData(img, 0, 0);
                refreshed.markDirty(null);
                useEditorStore.setState(s => ({ layers: [...s.layers] }));
            }
            onClose();
            return;
        }

        // new-layer-with-mask: clone the active layer, attach the refined alpha
        // as a mask, and make the clone active.
        if (state.activeLayerId) {
            state.duplicateLayer(state.activeLayerId);
            const after = useEditorStore.getState();
            const dupId = after.activeLayerId;
            if (dupId) {
                if (after.layers.find(l => l.id === dupId)?.mask) after.removeLayerMask(dupId);
                after.addLayerMask(dupId, 'hide-all');
                const dup = useEditorStore.getState().layers.find(l => l.id === dupId);
                if (dup?.mask) {
                    const mctx = dup.mask.ctx;
                    const img = mctx.createImageData(width, height);
                    for (let i = 0; i < refinedMaskData.length; i++) {
                        const v = refinedMaskData[i];
                        img.data[i * 4] = v;
                        img.data[i * 4 + 1] = v;
                        img.data[i * 4 + 2] = v;
                        img.data[i * 4 + 3] = 255;
                    }
                    mctx.putImageData(img, 0, 0);
                    dup.markDirty(null);
                    useEditorStore.setState(s => ({ layers: [...s.layers] }));
                }
            }
        }
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
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ marginBottom: '4px', opacity: 0.7, fontSize: '11px' }}>Output To</div>
                    <select
                        value={output}
                        onChange={e => setOutput(e.target.value as OutputTarget)}
                        style={{ width: '100%', background: '#333', border: '1px solid #555', borderRadius: '3px', color: 'white', padding: '4px 8px', fontSize: '12px' }}
                    >
                        <option value="selection" style={{ background: '#333' }}>Selection</option>
                        <option value="layer-mask" style={{ background: '#333' }}>Layer Mask</option>
                        <option value="new-layer-with-mask" style={{ background: '#333' }}>New Layer With Mask</option>
                    </select>
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
