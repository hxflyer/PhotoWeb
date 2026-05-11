import { useEffect, useMemo, useRef, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import {
    applyColorRangeSelectionWithMode,
    buildColorRangeMask,
    type ColorRangeMode,
    type ColorRangeSample,
} from '../../tools/colorRange';
import { useDialogA11y } from '../../hooks/useDialogA11y';

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
    minWidth: 620,
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

const PREVIEW_W = 300;
const PREVIEW_H = 200;

function compositeForPreview(): ImageData | null {
    const s = useEditorStore.getState();
    const { width, height, layers } = s;
    if (width <= 0 || height <= 0) return null;
    const c = document.createElement('canvas');
    c.width = width; c.height = height;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    for (const layer of layers) {
        if (!layer.visible || layer.kind === 'group') continue;
        ctx.globalAlpha = layer.opacity * layer.fill;
        ctx.globalCompositeOperation = layer.blendMode;
        ctx.drawImage(layer.canvas, 0, 0);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    return ctx.getImageData(0, 0, width, height);
}

export function ColorRangeDialog() {
    const isOpen = useEditorStore(s => s.dialogs.isColorRangeDialogOpen);
    const primaryColor = useEditorStore(s => s.primaryColor);
    const close = useEditorStore.getState().closeColorRangeDialog;
    const [mode, setMode] = useState<ColorRangeMode>('replace');
    const [color, setColor] = useState(primaryColor);
    const [fuzziness, setFuzziness] = useState(40);
    const [samples, setSamples] = useState<ColorRangeSample[]>([{ color: primaryColor, mode: 'add' }]);
    const dialogRef = useDialogA11y(isOpen, close);
    const previewRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (isOpen) {
            setMode('replace');
            setColor(primaryColor);
            setFuzziness(40);
            setSamples([{ color: primaryColor, mode: 'add' }]);
        }
    }, [isOpen, primaryColor]);

    // On-canvas eyedropper sampling. While the dialog is open, clicking on the
    // document canvas samples the composite pixel and appends a sample.
    // Shift = Add, Alt = Subtract; no modifier = Replace samples with one.
    useEffect(() => {
        if (!isOpen) return;
        const handler = (ev: MouseEvent) => {
            const target = ev.target as Element | null;
            const doc = target?.closest('[data-photoweb-document]') as HTMLElement | null;
            if (!doc) return;
            const state = useEditorStore.getState();
            const rect = doc.getBoundingClientRect();
            const zoom = state.zoom || 1;
            const x = Math.floor((ev.clientX - rect.left) / zoom);
            const y = Math.floor((ev.clientY - rect.top) / zoom);
            if (x < 0 || y < 0 || x >= state.width || y >= state.height) return;
            const img = compositeForPreview();
            if (!img) return;
            const idx = (y * img.width + x) * 4;
            const r = img.data[idx];
            const g = img.data[idx + 1];
            const b = img.data[idx + 2];
            const hex = `#${[r, g, b].map(n => n.toString(16).padStart(2, '0')).join('')}`;
            ev.preventDefault();
            ev.stopPropagation();
            setColor(hex);
            if (ev.shiftKey && !ev.altKey) {
                setSamples(prev => [...prev, { color: hex, mode: 'add' }]);
            } else if (ev.altKey && !ev.shiftKey) {
                setSamples(prev => [...prev, { color: hex, mode: 'sub' }]);
            } else {
                setSamples([{ color: hex, mode: 'add' }]);
            }
        };
        // Capture phase so we intercept before the Viewport sees the click.
        window.addEventListener('mousedown', handler, true);
        return () => window.removeEventListener('mousedown', handler, true);
    }, [isOpen]);

    const summary = useMemo(() => {
        const add = samples.filter(sample => sample.mode === 'add').length;
        const sub = samples.length - add;
        return `${add} add sample${add === 1 ? '' : 's'}${sub ? `, ${sub} subtract sample${sub === 1 ? '' : 's'}` : ''}`;
    }, [samples]);

    // Live preview: render the mask the current samples + fuzziness would
    // produce, scaled into the 300x200 preview canvas as white-on-black.
    useEffect(() => {
        if (!isOpen) return;
        const canvas = previewRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const image = compositeForPreview();
        if (!image) return;
        const mask = buildColorRangeMask(image, { samples, fuzziness });
        const maskImage = ctx.createImageData(image.width, image.height);
        for (let i = 0; i < mask.data.length; i++) {
            const v = mask.data[i];
            maskImage.data[i * 4] = v;
            maskImage.data[i * 4 + 1] = v;
            maskImage.data[i * 4 + 2] = v;
            maskImage.data[i * 4 + 3] = 255;
        }
        const tmp = document.createElement('canvas');
        tmp.width = image.width; tmp.height = image.height;
        const tctx = tmp.getContext('2d');
        if (!tctx) return;
        tctx.putImageData(maskImage, 0, 0);
        // Fit-to-preview while preserving aspect.
        const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
        const dw = Math.max(1, Math.round(image.width * scale));
        const dh = Math.max(1, Math.round(image.height * scale));
        const dx = Math.round((canvas.width - dw) / 2);
        const dy = Math.round((canvas.height - dh) / 2);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tmp, dx, dy, dw, dh);
    }, [isOpen, samples, fuzziness]);

    if (!isOpen) return null;

    function addSample(sampleMode: ColorRangeSample['mode']) {
        setSamples(current => [...current, { color, mode: sampleMode }]);
    }

    function resolveSampleModeFromModifiers(e: React.MouseEvent | React.KeyboardEvent): ColorRangeSample['mode'] | 'replace' {
        const shift = (e as { shiftKey?: boolean }).shiftKey;
        const alt = (e as { altKey?: boolean }).altKey;
        if (shift && !alt) return 'add';
        if (alt && !shift) return 'sub';
        if (shift && alt) return 'add';
        return 'replace';
    }

    function handleEyedropper(e: React.MouseEvent<HTMLButtonElement>) {
        // Shift = Add to Sample, Alt = Subtract from Sample, Shift+Alt = Intersect.
        // When the explicit dialog Mode is still "replace", modifier keys can
        // also flip the dialog Mode so the user gets the Photoshop muscle-memory
        // behavior. If the user already picked an explicit Mode, leave it.
        const incoming = resolveSampleModeFromModifiers(e);
        if (mode === 'replace') {
            if (e.shiftKey && e.altKey) setMode('intersect');
            else if (e.shiftKey) setMode('add');
            else if (e.altKey) setMode('sub');
        }
        if (incoming === 'replace') {
            setSamples([{ color, mode: 'add' }]);
        } else {
            setSamples(current => [...current, { color, mode: incoming }]);
        }
    }

    function apply() {
        applyColorRangeSelectionWithMode(useEditorStore.getState(), { samples, fuzziness }, mode);
        close();
    }

    return (
        <div style={overlay} onClick={close}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="color-range-title"
                tabIndex={-1}
                style={card}
                onClick={e => e.stopPropagation()}
            >
                <div id="color-range-title" style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>Color Range</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
                    <div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }} role="radiogroup" aria-label="Color Range Mode">
                            <span style={{ opacity: 0.75, width: 60 }}>Mode</span>
                            {(['replace', 'add', 'sub', 'intersect'] as ColorRangeMode[]).map(m => (
                                <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                                    <input
                                        type="radio"
                                        name="color-range-mode"
                                        value={m}
                                        checked={mode === m}
                                        onChange={() => setMode(m)}
                                        data-testid={`color-range-mode-${m}`}
                                    />
                                    {m === 'replace' ? 'Replace' : m === 'add' ? 'Add' : m === 'sub' ? 'Sub' : 'Intersect'}
                                </label>
                            ))}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10, alignItems: 'center' }}>
                            <label style={{ opacity: 0.75 }} htmlFor="color-range-color">Sample color</label>
                            <input
                                id="color-range-color"
                                type="color"
                                value={color}
                                onChange={e => setColor(e.target.value)}
                                onClick={(e) => {
                                    // Shift-click on the color input acts like Shift on the eyedropper.
                                    if (mode === 'replace') {
                                        if (e.shiftKey && e.altKey) setMode('intersect');
                                        else if (e.shiftKey) setMode('add');
                                        else if (e.altKey) setMode('sub');
                                    }
                                }}
                                style={{ ...input, padding: 2, height: 28 }}
                                data-testid="color-range-color-input"
                            />

                            <label style={{ opacity: 0.75 }} htmlFor="color-range-fuzziness">Fuzziness</label>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                    id="color-range-fuzziness"
                                    type="range"
                                    min={0}
                                    max={441}
                                    value={fuzziness}
                                    onChange={e => setFuzziness(Number(e.target.value))}
                                    style={{ flex: 1 }}
                                />
                                <input
                                    type="number"
                                    min={0}
                                    max={441}
                                    value={fuzziness}
                                    onChange={e => setFuzziness(Math.max(0, Math.min(441, Number(e.target.value))))}
                                    style={{ ...input, width: 64 }}
                                    data-testid="color-range-fuzziness-input"
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            <button
                                style={btn}
                                onClick={handleEyedropper}
                                title="Shift = Add, Alt = Subtract, Shift+Alt = Intersect"
                                data-testid="color-range-eyedropper"
                            >
                                Eyedropper
                            </button>
                            <button style={btn} onClick={() => addSample('add')} data-testid="color-range-add-sample">Add Sample</button>
                            <button style={btn} onClick={() => addSample('sub')} data-testid="color-range-sub-sample">Subtract Sample</button>
                            <button style={btn} onClick={() => setSamples([{ color, mode: 'add' }])}>Reset Samples</button>
                        </div>
                        <div style={{ marginTop: 10, color: 'rgba(255,255,255,0.7)' }}>{summary}</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <div style={{ fontSize: 11, opacity: 0.75 }}>Selection Preview</div>
                        <canvas
                            ref={previewRef}
                            width={PREVIEW_W}
                            height={PREVIEW_H}
                            data-testid="color-range-preview"
                            style={{ background: '#000', border: '1px solid #444', borderRadius: 3, width: PREVIEW_W, height: PREVIEW_H }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                    <button onClick={close} style={btn}>Cancel</button>
                    <button onClick={apply} disabled={samples.length === 0} style={primaryBtn} data-testid="color-range-ok">OK</button>
                </div>
            </div>
        </div>
    );
}
