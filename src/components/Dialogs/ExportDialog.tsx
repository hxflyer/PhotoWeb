/**
 * ExportDialog — export the composited document as PNG/JPEG/WebP/GIF.
 */
import { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { Canvas2DCompositor } from '../../compositor/Canvas2DCompositor';
import { useDialogA11y } from '../../hooks/useDialogA11y';

type ExportFormat = 'png' | 'jpeg' | 'webp' | 'gif';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

function formatMime(fmt: ExportFormat): string {
    if (fmt === 'jpeg') return 'image/jpeg';
    if (fmt === 'webp') return 'image/webp';
    if (fmt === 'gif') return 'image/gif';
    return 'image/png';
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function buildExportCanvas(
    layers: ReturnType<typeof useEditorStore.getState>['layers'],
    width: number,
    height: number,
): HTMLCanvasElement | null {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const compositor = new Canvas2DCompositor();
        const viewport = { width, height, zoom: 1, pan: { x: 0, y: 0 } };
        compositor.beginFrame(canvas);
        compositor.render({ target: canvas, layers, activeLayerId: null, viewport });
        compositor.present();
        return canvas;
    } catch {
        return null;
    }
}

function flattenOnto(src: HTMLCanvasElement, color: string): HTMLCanvasElement {
    const flat = document.createElement('canvas');
    flat.width = src.width;
    flat.height = src.height;
    const ctx = flat.getContext('2d');
    if (!ctx) return src;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, src.width, src.height);
    ctx.drawImage(src, 0, 0);
    return flat;
}

export function ExportDialog({ isOpen, onClose }: Props) {
    const { layers, width, height, documentName } = useEditorStore();
    const [format, setFormat] = useState<ExportFormat>('png');
    const [quality, setQuality] = useState(90);
    const [sizeEstimate, setSizeEstimate] = useState('');
    const [flattenOnColor, setFlattenOnColor] = useState(true);
    const [flattenColor, setFlattenColor] = useState('#ffffff');
    const [pngTransparency, setPngTransparency] = useState(true);
    const [pngBackground, setPngBackground] = useState('#ffffff');
    const [filename, setFilename] = useState<string>('export');
    const dialogRef = useDialogA11y(isOpen, onClose);
    const sizeReqIdRef = useRef(0);

    // Default filename to the current document name when the dialog opens.
    useEffect(() => {
        if (isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFilename(documentName?.trim() || 'export');
        }
    }, [isOpen, documentName]);

    // Debounced real-size measurement: re-encode the composite at the current
    // format/quality/transparency settings and report the actual blob size.
    useEffect(() => {
        if (!isOpen) return;
        const reqId = ++sizeReqIdRef.current;
        setSizeEstimate('…'); // eslint-disable-line react-hooks/set-state-in-effect
        const timer = window.setTimeout(() => {
            let canvas = buildExportCanvas(layers, width, height);
            if (!canvas) {
                if (sizeReqIdRef.current === reqId) setSizeEstimate('—');
                return;
            }
            if (format === 'jpeg' && flattenOnColor) canvas = flattenOnto(canvas, flattenColor);
            if (format === 'png' && !pngTransparency) canvas = flattenOnto(canvas, pngBackground);
            const mime = formatMime(format);
            const q = (format === 'jpeg' || format === 'webp') ? quality / 100 : undefined;
            try {
                canvas.toBlob((blob) => {
                    if (sizeReqIdRef.current !== reqId) return; // stale
                    if (!blob) { setSizeEstimate('—'); return; }
                    setSizeEstimate(formatBytes(blob.size));
                }, mime, q);
            } catch {
                if (sizeReqIdRef.current === reqId) setSizeEstimate('—');
            }
        }, 250);
        return () => window.clearTimeout(timer);
    }, [format, quality, width, height, isOpen, layers, flattenOnColor, flattenColor, pngTransparency, pngBackground]);

    function reportExportError(message: string): void {
        useEditorStore.getState().reportError(
            'export',
            message,
            'error',
        );
    }

    function doExport() {
        let canvas: HTMLCanvasElement;
        try {
            canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const compositor = new Canvas2DCompositor();
            const viewport = { width, height, zoom: 1, pan: { x: 0, y: 0 } };
            compositor.beginFrame(canvas);
            compositor.render({ target: canvas, layers, activeLayerId: null, viewport });
            compositor.present();
        } catch {
            reportExportError(
                `Export failed: could not compose the document for ${format.toUpperCase()}.`,
            );
            return;
        }

        // JPEG cannot store alpha; compose onto a flat background color so
        // transparent regions do not encode as black.
        if (format === 'jpeg' && flattenOnColor) {
            try {
                const flat = document.createElement('canvas');
                flat.width = width;
                flat.height = height;
                const fctx = flat.getContext('2d');
                if (fctx) {
                    fctx.fillStyle = flattenColor;
                    fctx.fillRect(0, 0, width, height);
                    fctx.drawImage(canvas, 0, 0);
                    canvas = flat;
                }
            } catch {
                reportExportError('Export failed: could not flatten on background color.');
                return;
            }
        }

        // PNG: when "Transparency" is off, composite over a solid background
        // color so transparent regions encode as that color instead of alpha.
        if (format === 'png' && !pngTransparency) {
            try {
                const flat = document.createElement('canvas');
                flat.width = width;
                flat.height = height;
                const fctx = flat.getContext('2d');
                if (fctx) {
                    fctx.fillStyle = pngBackground;
                    fctx.fillRect(0, 0, width, height);
                    fctx.drawImage(canvas, 0, 0);
                    canvas = flat;
                }
            } catch {
                reportExportError('Export failed: could not flatten on background color.');
                return;
            }
        }

        const mime = formatMime(format);
        const q = (format === 'jpeg' || format === 'webp') ? quality / 100 : undefined;
        try {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reportExportError(
                        `Export failed: ${format.toUpperCase()} is not supported by this browser, or the image is too large.`,
                    );
                    return;
                }
                try {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    const safeBase = (filename.trim() || 'export').replace(/\.[a-zA-Z0-9]{1,5}$/, '');
                    a.download = `${safeBase}.${format === 'jpeg' ? 'jpg' : format}`;
                    a.click();
                    URL.revokeObjectURL(url);
                    useEditorStore.getState().clearLastErrorChannel?.();
                    onClose();
                } catch {
                    reportExportError('Export failed: the browser rejected the download.');
                }
            }, mime, q);
        } catch {
            reportExportError(
                `Export failed: ${format.toUpperCase()} could not be encoded.`,
            );
        }
    }

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="export-dialog-title"
                tabIndex={-1}
                data-testid="export-dialog"
                style={{
                    background: '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: '6px',
                    padding: '16px',
                    minWidth: '300px',
                    color: 'white',
                    fontSize: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
            >
                <div id="export-dialog-title" style={{ fontWeight: 600, marginBottom: '12px', fontSize: '13px' }}>Export As</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                    {/* Format selector */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '80px' }}>Format</span>
                        <select
                            value={format}
                            onChange={e => setFormat(e.target.value as ExportFormat)}
                            data-testid="export-format-select"
                            style={{ flex: 1, background: '#333', border: '1px solid #555', borderRadius: '3px', color: 'white', padding: '4px 8px', fontSize: '12px' }}
                        >
                            <option value="png">PNG</option>
                            <option value="jpeg">JPEG</option>
                            <option value="webp">WebP</option>
                            <option value="gif">GIF</option>
                        </select>
                    </label>

                    {/* Quality slider (JPEG/WebP only) */}
                    {(format === 'jpeg' || format === 'webp') && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '80px' }}>Quality</span>
                            <input
                                type="range" min={1} max={100} value={quality}
                                onChange={e => setQuality(Number(e.target.value))}
                                style={{ flex: 1 }}
                            />
                            <span style={{ width: '32px', textAlign: 'right' }}>{quality}%</span>
                        </label>
                    )}

                    {/* PNG transparency toggle (PNG has alpha; when off, flatten on color) */}
                    {format === 'png' && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '80px' }}>Transparency</span>
                            <input
                                type="checkbox"
                                checked={pngTransparency}
                                onChange={e => setPngTransparency(e.target.checked)}
                                data-testid="export-png-transparency"
                            />
                            <input
                                type="color"
                                value={pngBackground}
                                onChange={e => setPngBackground(e.target.value)}
                                disabled={pngTransparency}
                                data-testid="export-png-background"
                                style={{ width: '40px', height: '24px', border: '1px solid #555', background: 'transparent', cursor: pngTransparency ? 'not-allowed' : 'pointer' }}
                            />
                            <span style={{ opacity: 0.7 }}>background</span>
                        </label>
                    )}

                    {/* Flatten on background color (JPEG only — no alpha channel) */}
                    {format === 'jpeg' && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '80px' }}>Flatten on</span>
                            <input
                                type="checkbox"
                                checked={flattenOnColor}
                                onChange={e => setFlattenOnColor(e.target.checked)}
                                data-testid="export-flatten-toggle"
                            />
                            <input
                                type="color"
                                value={flattenColor}
                                onChange={e => setFlattenColor(e.target.value)}
                                disabled={!flattenOnColor}
                                data-testid="export-flatten-color"
                                style={{ width: '40px', height: '24px', border: '1px solid #555', background: 'transparent', cursor: flattenOnColor ? 'pointer' : 'not-allowed' }}
                            />
                            <span style={{ opacity: 0.7 }}>color</span>
                        </label>
                    )}

                    {/* Filename */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '80px' }}>Filename</span>
                        <input
                            type="text"
                            value={filename}
                            onChange={e => setFilename(e.target.value)}
                            data-testid="export-filename"
                            style={{ flex: 1, background: '#333', border: '1px solid #555', borderRadius: '3px', color: 'white', padding: '4px 8px', fontSize: '12px' }}
                        />
                        <span style={{ opacity: 0.6 }}>.{format === 'jpeg' ? 'jpg' : format}</span>
                    </label>

                    {/* File size (actual debounced toBlob measurement) */}
                    <div data-testid="export-size" style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7 }}>
                        <span style={{ width: '80px' }}>File Size</span>
                        <span data-testid="export-size-value">{sizeEstimate}</span>
                    </div>

                    {/* Dimensions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7 }}>
                        <span style={{ width: '80px' }}>Dimensions</span>
                        <span>{width} × {height} px</span>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button onClick={onClose} style={{ padding: '4px 12px', background: 'transparent', border: '1px solid #555', borderRadius: '3px', color: 'white', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                    <button
                        onClick={doExport}
                        data-testid="export-download-btn"
                        style={{ padding: '4px 12px', background: '#0090ff', border: 'none', borderRadius: '3px', color: 'white', cursor: 'pointer', fontSize: '12px' }}
                    >
                        Export
                    </button>
                </div>
            </div>
        </div>
    );
}
