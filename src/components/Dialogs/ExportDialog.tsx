/**
 * ExportDialog — export the composited document as PNG/JPEG/WebP/GIF.
 */
import { useState, useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { Canvas2DCompositor } from '../../compositor/Canvas2DCompositor';

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

    function doExport() {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const compositor = new Canvas2DCompositor();
        const viewport = { width, height, zoom: 1, pan: { x: 0, y: 0 } };
        compositor.beginFrame(canvas);
        compositor.render({ target: canvas, layers, activeLayerId: null, viewport });
        compositor.present();

        const mime = formatMime(format);
        const q = (format === 'jpeg' || format === 'webp') ? quality / 100 : undefined;
        canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `export.${format}`;
            a.click();
            URL.revokeObjectURL(url);
            onClose();
        }, mime, q);
    }

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div
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
                <div style={{ fontWeight: 600, marginBottom: '12px', fontSize: '13px' }}>Export As</div>

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
