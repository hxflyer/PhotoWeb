import { useEffect, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useDialogA11y } from '../../hooks/useDialogA11y';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

interface Estimate {
    quotaBytes?: number;
    usageBytes?: number;
    autosaveBytes?: number;
    historyBytes: number;
    layerBytes: number;
}

const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const cardStyle: React.CSSProperties = {
    background: '#2a2a2a', border: '1px solid #444', borderRadius: 6,
    padding: 16, minWidth: 380, color: 'white', fontSize: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

function formatBytes(n: number | undefined): string {
    if (n === undefined || Number.isNaN(n)) return '—';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

async function computeEstimate(): Promise<Estimate> {
    const layers = useEditorStore.getState().layers;
    const layerBytes = layers.reduce((sum, l) => sum + l.canvas.width * l.canvas.height * 4, 0);
    const history = useEditorStore.getState().historyEntries;
    // Best-effort: each pixel-action stores before+after ImageData. Approximate
    // by summing pixel actions' rect sizes (4 bytes/px * 2 buffers).
    let historyBytes = 0;
    for (const entry of history) {
        if (entry.action.kind === 'pixel') {
            const r = entry.action.dirtyRect;
            historyBytes += r.width * r.height * 4 * 2;
        }
    }
    let quotaBytes: number | undefined;
    let usageBytes: number | undefined;
    if (typeof navigator !== 'undefined' && 'storage' in navigator && navigator.storage?.estimate) {
        try {
            const est = await navigator.storage.estimate();
            quotaBytes = est.quota;
            usageBytes = est.usage;
        } catch { /* unsupported */ }
    }
    return { quotaBytes, usageBytes, historyBytes, layerBytes };
}

export function StorageUsageDialog({ isOpen, onClose }: Props) {
    const [est, setEst] = useState<Estimate | null>(null);
    const dialogRef = useDialogA11y(isOpen, onClose);

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        computeEstimate().then(e => { if (!cancelled) setEst(e); });
        return () => { cancelled = true; };
    }, [isOpen]);

    if (!isOpen) return null;

    const percentUsed = est?.quotaBytes && est?.usageBytes
        ? Math.round((est.usageBytes / est.quotaBytes) * 100)
        : null;

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="storage-usage-title" tabIndex={-1} style={cardStyle} onClick={e => e.stopPropagation()}>
                <div id="storage-usage-title" style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>Storage Usage</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                    <Row label="Browser quota" value={formatBytes(est?.quotaBytes)} />
                    <Row label="Browser usage" value={`${formatBytes(est?.usageBytes)}${percentUsed !== null ? ` (${percentUsed}%)` : ''}`} />
                    <div style={{ height: 1, background: '#444', margin: '4px 0' }} />
                    <Row label="Active layers in memory" value={formatBytes(est?.layerBytes)} />
                    <Row label="Undo history in memory" value={formatBytes(est?.historyBytes)} />
                </div>
                <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 12 }}>
                    History stores raw before/after pixel buffers. PNG-encoded compression is on the
                    roadmap; until then large brush strokes on big canvases inflate this number.
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '4px 12px', background: '#0090ff', border: 'none', borderRadius: 3, color: 'white', cursor: 'pointer' }}>Close</button>
                </div>
            </div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ opacity: 0.75 }}>{label}</span>
            <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>{value}</span>
        </div>
    );
}
