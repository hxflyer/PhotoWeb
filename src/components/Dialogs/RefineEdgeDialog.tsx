/**
 * RefineEdgeDialog — Select and Mask workspace controls.
 *
 * Live preview: snapshots the selection on open, then re-runs the refine
 * math against the snapshot as sliders change (bypassing history). Cancel
 * restores the snapshot. OK funnels every output through
 * `applyRefineEdgeOutput` so the refined selection plus any layer / mask /
 * document changes are committed inside a single undoable history entry.
 */
import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { rasterizeSelectionOperations } from '../../utils/selectionUtils';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import { computeRefinedSelectionOperation } from '../../utils/refineEdgePreview';
import type { RefineEdgeOutputTarget, SelectionOperation } from '../../store/types';
import { SelectAndMaskCanvas } from '../Canvas/SelectAndMaskCanvas';
import {
    compositeLayersBelow,
    type SelectAndMaskViewMode,
} from '../../utils/selectAndMaskCompositor';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

type ViewMode = SelectAndMaskViewMode;
type OutputTarget = RefineEdgeOutputTarget;

export function RefineEdgeDialog({ isOpen, onClose }: Props) {
    const applyRefineEdgeOutput = useEditorStore(s => s.applyRefineEdgeOutput);
    const initialPrefs = useEditorStore.getState().selectionDialogPrefs.refineEdge;

    const [radius, setRadius] = useState(0);
    const [smartRadius, setSmartRadius] = useState(false);
    const [smooth, setSmooth] = useState(0);
    const [feather, setFeather] = useState(0);
    const [contrast, setContrast] = useState(0);
    const [shiftEdge, setShiftEdge] = useState(0);
    const [viewMode, setViewMode] = useState<ViewMode>('on-white');
    const [output, setOutput] = useState<OutputTarget>('selection');
    const [remember, setRemember] = useState(initialPrefs.remember);
    const [previewSource, setPreviewSource] = useState<ImageData | null>(null);
    const [previewUnderlay, setPreviewUnderlay] = useState<ImageData | null>(null);
    const [previewMask, setPreviewMask] = useState<Uint8ClampedArray | null>(null);
    const [previewDims, setPreviewDims] = useState({ width: 0, height: 0 });
    const dialogRef = useDialogA11y(isOpen, onClose);

    // Live preview: snapshot the original selection on open and reset on close.
    const originalOpsRef = useRef<SelectionOperation[] | null>(null);
    useEffect(() => {
        if (!isOpen) {
            originalOpsRef.current = null;
            return;
        }
        const state = useEditorStore.getState();
        originalOpsRef.current = state.selection.operations.map(op => ({ ...op }));
        const stored = state.selectionDialogPrefs.refineEdge;
        if (stored.remember) {
            setRadius(stored.radius);
            setSmooth(stored.smooth);
            setFeather(stored.feather);
            setContrast(stored.contrast);
            setShiftEdge(stored.shiftEdge);
            setSmartRadius(stored.smartRadius);
        } else {
            setRadius(0);
            setSmooth(0);
            setFeather(0);
            setContrast(0);
            setShiftEdge(0);
            setSmartRadius(false);
        }
        setRemember(stored.remember);
    }, [isOpen]);

    // Recompute the preview mask whenever any slider changes.
    useEffect(() => {
        if (!isOpen || !originalOpsRef.current) return;
        const state = useEditorStore.getState();
        const { width, height } = state;
        const layer = state.layers.find(l => l.id === state.activeLayerId);
        const layerData = layer ? layer.ctx.getImageData(0, 0, width, height) : null;
        const refined = computeRefinedSelectionOperation(
            originalOpsRef.current,
            { radius, smooth, feather, contrast, shiftEdge, smartRadius },
            width,
            height,
            layerData,
        );
        // Bypass history during live preview.
        useEditorStore.setState(s => ({
            selection: {
                ...s.selection,
                operations: refined ? [refined] : originalOpsRef.current ?? [],
                hasSelection: refined ? true : (originalOpsRef.current?.length ?? 0) > 0,
            },
        }));
        const refinedMask = refined?.mask?.data
            ?? rasterizeSelectionOperations(originalOpsRef.current ?? [], width, height);
        setPreviewMask(refinedMask);
        setPreviewSource(layerData);
        setPreviewUnderlay(compositeLayersBelow(state.layers, state.activeLayerId, width, height));
        setPreviewDims({ width, height });
    }, [isOpen, radius, smooth, feather, contrast, shiftEdge, smartRadius]);

    function restoreOriginal() {
        if (!originalOpsRef.current) return;
        useEditorStore.setState(s => ({
            selection: {
                ...s.selection,
                operations: originalOpsRef.current!,
                hasSelection: originalOpsRef.current!.length > 0,
            },
        }));
    }

    function handleCancel() {
        restoreOriginal();
        onClose();
    }

    function persistPrefs() {
        useEditorStore.getState().setSelectionDialogPref('refineEdge', {
            remember,
            radius,
            smooth,
            feather,
            contrast,
            shiftEdge,
            smartRadius,
        });
    }

    function handleApply() {
        restoreOriginal();
        persistPrefs();
        applyRefineEdgeOutput({ radius, smooth, feather, contrast, shiftEdge, smartRadius }, output);
        onClose();
    }

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="refine-edge-title"
                tabIndex={-1}
                data-testid="refine-edge-dialog"
                style={{
                    background: '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: '6px',
                    padding: '16px',
                    minWidth: '360px',
                    color: 'white',
                    fontSize: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
            >
                <div id="refine-edge-title" style={{ fontWeight: 600, marginBottom: '12px', fontSize: '13px' }}>Select and Mask</div>

                {/* View Mode */}
                <div style={{ marginBottom: '10px' }}>
                    <div style={{ marginBottom: '4px', opacity: 0.7 }}>View Mode</div>
                    <select
                        value={viewMode}
                        onChange={e => setViewMode(e.target.value as ViewMode)}
                        data-testid="refine-edge-view-mode"
                        style={{ width: '100%', background: '#333', border: '1px solid #555', borderRadius: '3px', color: 'white', padding: '4px 8px', fontSize: '12px' }}
                    >
                        <option value="onion-skin" style={{ background: '#333' }}>Onion Skin</option>
                        <option value="marching-ants" style={{ background: '#333' }}>Marching Ants</option>
                        <option value="overlay" style={{ background: '#333' }}>Overlay</option>
                        <option value="on-black" style={{ background: '#333' }}>On Black</option>
                        <option value="on-white" style={{ background: '#333' }}>On White</option>
                        <option value="black-and-white" style={{ background: '#333' }}>Black &amp; White</option>
                        <option value="on-layers" style={{ background: '#333' }}>On Layers</option>
                    </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                    <SelectAndMaskCanvas
                        width={previewDims.width}
                        height={previewDims.height}
                        mask={previewMask}
                        source={previewSource}
                        underlay={previewUnderlay}
                        viewMode={viewMode}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
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
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '80px', fontSize: '11px' }} />
                        <input
                            type="checkbox"
                            checked={smartRadius}
                            onChange={e => setSmartRadius(e.target.checked)}
                            data-testid="smart-radius-toggle"
                        />
                        <span style={{ fontSize: '11px' }}>Smart Radius</span>
                    </label>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <input
                        type="checkbox"
                        checked={remember}
                        onChange={e => setRemember(e.target.checked)}
                        data-testid="refine-edge-remember"
                    />
                    <span style={{ fontSize: '11px' }}>Remember Settings</span>
                </label>

                {/* Output section */}
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ marginBottom: '4px', opacity: 0.7, fontSize: '11px' }}>Output To</div>
                    <select
                        value={output}
                        onChange={e => setOutput(e.target.value as OutputTarget)}
                        data-testid="refine-edge-output"
                        style={{ width: '100%', background: '#333', border: '1px solid #555', borderRadius: '3px', color: 'white', padding: '4px 8px', fontSize: '12px' }}
                    >
                        <option value="selection" style={{ background: '#333' }}>Selection</option>
                        <option value="layer-mask" style={{ background: '#333' }}>Layer Mask</option>
                        <option value="new-layer" style={{ background: '#333' }}>New Layer</option>
                        <option value="new-layer-with-mask" style={{ background: '#333' }}>New Layer with Layer Mask</option>
                        <option value="new-document" style={{ background: '#333' }}>New Document</option>
                        <option value="new-document-with-mask" style={{ background: '#333' }}>New Document with Layer Mask</option>
                    </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={handleCancel} style={{ padding: '4px 12px', background: 'transparent', border: '1px solid #555', borderRadius: '3px', color: 'white', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                    <button
                        onClick={handleApply}
                        data-testid="refine-edge-ok"
                        style={{ padding: '4px 12px', background: '#0090ff', border: 'none', borderRadius: '3px', color: 'white', cursor: 'pointer', fontSize: '12px' }}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}
