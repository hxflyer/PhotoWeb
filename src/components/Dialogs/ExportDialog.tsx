/**
 * ExportDialog — export the composited document as PNG/JPEG/WebP/GIF.
 */
import { useState, useEffect } from 'react';
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

export function ExportDialog({ isOpen, onClose }: Props) {
    const { layers, width, height } = useEditorStore();
    const [format, setFormat] = useState<ExportFormat>('png');
    const [quality, setQuality] = useState(90);
    const [sizeEstimate, setSizeEstimate] = useState('');
    const [flattenOnColor, setFlattenOnColor] = useState(true);
    const [flattenColor, setFlattenColor] = useState('#ffffff');
    const dialogRef = useDialogA11y(isOpen, onClose);

    useEffect(() => {
        if (!isOpen) return;
        const pixels = width * height;
        const estimates: Record<ExportFormat, number> = {
            png: pixels * 0.5,
            jpeg: pixels * (quality / 100) * 0.08,
            webp: pixels * (quality / 100) * 0.05,
            gif: pixels * 0.15,
        };
        const bytes = estimates[format];
        if (bytes < 1024) setSizeEstimate(`${bytes.toFixed(0)} B`); // eslint-disable-line react-hooks/set-state-in-effect
        else if (bytes < 1024 * 1024) setSizeEstimate(`${(bytes / 1024).toFixed(1)} KB`); // eslint-disable-line react-hooks/set-state-in-effect
        else setSizeEstimate(`${(bytes / 1024 / 1024).toFixed(2)} MB`); // eslint-disable-line react-hooks/set-state-in-effect
    }, [format, quality, width, height, isOpen]);

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
                    a.download = `export.${format}`;
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

                    {/* Size estimate */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7 }}>
                        <span style={{ width: '80px' }}>Est. size</span>
                        <span>{sizeEstimate}</span>
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
