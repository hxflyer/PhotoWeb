import { useEffect, useMemo, useState } from 'react';
import { Layer } from '../../core/Layer';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import { useEditorStore } from '../../store/editorStore';
import { computeFocusAreaMask, focusMaskToSelectionOperation, type FocusAreaBrushStroke } from '../../utils/focusArea';
import { compositeLayersBelow, type SelectAndMaskViewMode } from '../../utils/selectAndMaskCompositor';
import { SelectAndMaskCanvas } from '../Canvas/SelectAndMaskCanvas';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

type BrushMode = 'add' | 'sub';
type OutputTarget = 'selection' | 'layer-mask' | 'new-layer' | 'new-layer-with-mask';

const VIEW_MODES: { value: SelectAndMaskViewMode; label: string }[] = [
    { value: 'on-white', label: 'On White' },
    { value: 'on-black', label: 'On Black' },
    { value: 'overlay', label: 'Overlay' },
    { value: 'on-layers', label: 'On Layers' },
    { value: 'black-and-white', label: 'Black & White' },
];

function writeMaskCanvas(mask: Uint8ClampedArray, width: number, height: number): HTMLCanvasElement | null {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const img = ctx.createImageData(width, height);
    for (let i = 0; i < mask.length; i++) {
        const v = mask[i];
        img.data[i * 4] = v;
        img.data[i * 4 + 1] = v;
        img.data[i * 4 + 2] = v;
        img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
}

export function FocusAreaDialog({ isOpen, onClose }: Props) {
    const dialogRef = useDialogA11y(isOpen, onClose);
    const [range, setRange] = useState(50);
    const [noiseLevel, setNoiseLevel] = useState(0);
    const [softenEdges, setSoftenEdges] = useState(false);
    const [viewMode, setViewMode] = useState<SelectAndMaskViewMode>('on-white');
    const [preview, setPreview] = useState(true);
    const [brushMode, setBrushMode] = useState<BrushMode>('add');
    const [brushSize, setBrushSize] = useState(20);
    const [output, setOutput] = useState<OutputTarget>('selection');
    const [strokes, setStrokes] = useState<FocusAreaBrushStroke[]>([]);

    const { source, underlay, width, height } = useMemo(() => {
        if (!isOpen) return { source: null, underlay: null, width: 0, height: 0 };
        const state = useEditorStore.getState();
        const layer = state.layers.find(l => l.id === state.activeLayerId);
        if (!layer) return { source: null, underlay: null, width: state.width, height: state.height };
        const image = layer.ctx.getImageData(0, 0, state.width, state.height);
        return {
            source: image,
            underlay: compositeLayersBelow(state.layers, state.activeLayerId, state.width, state.height),
            width: state.width,
            height: state.height,
        };
    }, [isOpen]);

    const mask = useMemo(() => (
        source ? computeFocusAreaMask(source, { range, noiseLevel, softenEdges }, strokes) : null
    ), [source, range, noiseLevel, softenEdges, strokes]);

    useEffect(() => {
        if (!isOpen) return;
        setRange(50);
        setNoiseLevel(0);
        setSoftenEdges(false);
        setViewMode('on-white');
        setPreview(true);
        setBrushMode('add');
        setBrushSize(20);
        setOutput('selection');
        setStrokes([]);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();
            if (key === 'f') {
                event.preventDefault();
                setViewMode(current => VIEW_MODES[(VIEW_MODES.findIndex(v => v.value === current) + 1) % VIEW_MODES.length].value);
            } else if (key === 'p') {
                event.preventDefault();
                setPreview(v => !v);
            } else if (key === 'e') {
                event.preventDefault();
                setBrushMode(m => m === 'add' ? 'sub' : 'add');
            } else if (event.key === '[') {
                event.preventDefault();
                setBrushSize(v => Math.max(1, v - 5));
            } else if (event.key === ']') {
                event.preventDefault();
                setBrushSize(v => Math.min(200, v + 5));
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen]);

    if (!isOpen) return null;

    const paintAt = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!source) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * source.width;
        const y = ((event.clientY - rect.top) / rect.height) * source.height;
        setStrokes(prev => [...prev, {
            mode: event.altKey ? (brushMode === 'add' ? 'sub' : 'add') : brushMode,
            x,
            y,
            radius: brushSize / 2,
        }]);
    };

    const applySelection = (target: OutputTarget) => {
        if (!mask) return;
        const state = useEditorStore.getState();
        const op = focusMaskToSelectionOperation(mask, width, height);
        state.setSelectionOperations([op]);
        const layer = state.layers.find(l => l.id === state.activeLayerId);
        if (!layer) return;

        if (target === 'layer-mask') {
            state.addLayerMaskFromSelection(layer.id, 'reveal');
            return;
        }

        if (target === 'new-layer' || target === 'new-layer-with-mask') {
            const fresh = new Layer(width, height, `${layer.name} Focus Area`);
            fresh.ctx.drawImage(layer.canvas, 0, 0);
            if (target === 'new-layer') {
                const img = fresh.ctx.getImageData(0, 0, width, height);
                for (let i = 0; i < mask.length; i++) {
                    img.data[i * 4 + 3] = Math.round((img.data[i * 4 + 3] * mask[i]) / 255);
                }
                fresh.ctx.putImageData(img, 0, 0);
            } else {
                const maskCanvas = writeMaskCanvas(mask, width, height);
                const ctx = maskCanvas?.getContext('2d');
                if (maskCanvas && ctx) fresh.mask = { canvas: maskCanvas, ctx, enabled: true, linked: true };
            }
            fresh.opacity = layer.opacity;
            fresh.fill = layer.fill;
            fresh.blendMode = layer.blendMode;
            fresh.markDirty(null);
            useEditorStore.setState(s => ({
                layers: [...s.layers, fresh],
                activeLayerId: fresh.id,
                selectedLayerIds: [fresh.id],
                layerSelectionAnchorId: fresh.id,
                isDirty: true,
            }));
        }
    };

    const handleOk = () => {
        applySelection(output);
        onClose();
    };

    const handleRefineEdge = () => {
        applySelection('selection');
        onClose();
        useEditorStore.getState().openRefineEdgeDialog();
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="focus-area-title"
                tabIndex={-1}
                data-testid="focus-area-dialog"
                style={{ width: 700, background: '#2b2b2b', color: '#eee', border: '1px solid #555', borderRadius: 6, padding: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.55)', fontSize: 12 }}
            >
                <div id="focus-area-title" style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Focus Area</div>
                <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
                    <div>
                        <div
                            data-testid="focus-area-preview-hitbox"
                            onPointerDown={paintAt}
                            onPointerMove={e => { if (e.buttons === 1) paintAt(e); }}
                            style={{ width: 320, height: 220 }}
                        >
                            <SelectAndMaskCanvas
                                width={width}
                                height={height}
                                source={source}
                                underlay={underlay}
                                mask={preview ? mask : null}
                                viewMode={viewMode}
                                previewWidth={320}
                                previewHeight={220}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <label>
                            <div>View</div>
                            <select data-testid="focus-area-view-mode" value={viewMode} onChange={e => setViewMode(e.target.value as SelectAndMaskViewMode)} style={{ width: '100%' }}>
                                {VIEW_MODES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                            </select>
                        </label>
                        <label>
                            <div>In-Focus Range</div>
                            <input data-testid="focus-area-range" type="range" min={0} max={100} value={range} onChange={e => setRange(Number(e.target.value))} style={{ width: '100%' }} />
                        </label>
                        <label>
                            <div>Image Noise Level</div>
                            <input data-testid="focus-area-noise" type="range" min={0} max={100} value={noiseLevel} onChange={e => setNoiseLevel(Number(e.target.value))} style={{ width: '100%' }} />
                        </label>
                        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input data-testid="focus-area-soften" type="checkbox" checked={softenEdges} onChange={e => setSoftenEdges(e.target.checked)} />
                            <span>Soften Edges</span>
                        </label>
                        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input data-testid="focus-area-preview" type="checkbox" checked={preview} onChange={e => setPreview(e.target.checked)} />
                            <span>Preview</span>
                        </label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button data-testid="focus-area-add-tool" onClick={() => setBrushMode('add')} aria-pressed={brushMode === 'add'}>Add</button>
                            <button data-testid="focus-area-sub-tool" onClick={() => setBrushMode('sub')} aria-pressed={brushMode === 'sub'}>Subtract</button>
                        </div>
                        <label>
                            <div>Brush Size</div>
                            <input data-testid="focus-area-brush-size" type="range" min={1} max={200} value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} style={{ width: '100%' }} />
                        </label>
                        <label>
                            <div>Output To</div>
                            <select data-testid="focus-area-output" value={output} onChange={e => setOutput(e.target.value as OutputTarget)} style={{ width: '100%' }}>
                                <option value="selection">Selection</option>
                                <option value="layer-mask">Layer Mask</option>
                                <option value="new-layer">New Layer</option>
                                <option value="new-layer-with-mask">New Layer with Layer Mask</option>
                            </select>
                        </label>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 14 }}>
                    <button data-testid="focus-area-refine-edge" onClick={handleRefineEdge}>Refine Edge...</button>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={onClose}>Cancel</button>
                        <button data-testid="focus-area-ok" onClick={handleOk}>OK</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
