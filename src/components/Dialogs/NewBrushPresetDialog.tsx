import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import { drawBrushTipPreview, type BrushTipData } from '../../utils/brushTips';

const overlay: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1200,
};

const card: React.CSSProperties = {
    background: 'hsl(var(--bg-panel))',
    border: '1px solid hsl(var(--border-light))',
    borderRadius: 4,
    color: 'hsl(var(--text-main))',
    padding: 16,
    minWidth: 320,
    fontSize: 12,
    boxShadow: 'var(--shadow-menu)',
};

const inputStyle: React.CSSProperties = {
    background: 'hsl(var(--bg-input))',
    border: '1px solid hsl(var(--border-light))',
    color: 'hsl(var(--text-main))',
    padding: '4px 8px',
    borderRadius: 2,
    fontSize: 12,
    width: '100%',
};

const buttonStyle: React.CSSProperties = {
    padding: '4px 14px',
    background: 'hsl(var(--bg-input))',
    color: 'hsl(var(--text-main))',
    border: '1px solid hsl(var(--border-light))',
    borderRadius: 2,
    cursor: 'pointer',
    fontSize: 12,
};

const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: 'hsl(var(--accent-primary))',
    border: '1px solid hsl(var(--accent-primary))',
    color: '#fff',
};

interface Props {
    isOpen: boolean;
    defaultName?: string;
    previewTip?: BrushTipData;
    onCancel: () => void;
    onCommit: (params: { name: string; captureSize: boolean; includeToolSettings: boolean; captureColor: boolean }) => void;
}

function PreviewSwatch({ previewTip }: { previewTip?: BrushTipData }) {
    const settings = useEditorStore(s => s.brushSettings);
    const color = useEditorStore(s => s.primaryColor);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !previewTip) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBrushTipPreview(ctx, previewTip, 8, 8, canvas.width - 16, canvas.height - 16, '#222222');
    }, [previewTip]);
    if (previewTip) {
        return (
            <div
                data-testid="new-brush-preset-preview"
                style={{
                    width: 64,
                    height: 64,
                    background: 'hsl(var(--bg-input))',
                    border: '1px solid hsl(var(--border-light))',
                    borderRadius: 2,
                }}
            >
                <canvas ref={canvasRef} width={64} height={64} style={{ display: 'block' }} />
            </div>
        );
    }
    return (
        <div
            data-testid="new-brush-preset-preview"
            style={{
                width: 64,
                height: 64,
                background: 'hsl(var(--bg-input))',
                border: '1px solid hsl(var(--border-light))',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <div
                style={{
                    width: Math.min(48, Math.max(6, settings.size)),
                    height: Math.min(48, Math.max(6, settings.size)),
                    borderRadius: '50%',
                    background: color,
                    opacity: settings.opacity ?? 1,
                    boxShadow: `0 0 ${Math.max(0, (1 - (settings.hardness ?? 1)) * 6)}px ${color}`,
                }}
            />
        </div>
    );
}

export function NewBrushPresetDialog({ isOpen, defaultName = 'New Brush Preset', previewTip, onCancel, onCommit }: Props) {
    if (!isOpen) return null;
    // Key remounts the inner content per-open so fields reset to defaults.
    return (
        <NewBrushPresetDialogContent
            key={`${defaultName}:${previewTip?.alpha ?? 'round'}`}
            defaultName={defaultName}
            previewTip={previewTip}
            onCancel={onCancel}
            onCommit={onCommit}
        />
    );
}

function NewBrushPresetDialogContent({ defaultName, previewTip, onCancel, onCommit }: Omit<Props, 'isOpen'> & { defaultName: string }) {
    const [name, setName] = useState(defaultName);
    const [captureSize, setCaptureSize] = useState(true);
    const [includeToolSettings, setIncludeToolSettings] = useState(true);
    const [captureColor, setCaptureColor] = useState(false);
    const dialogRef = useDialogA11y(true, onCancel);

    function commit() {
        const trimmed = name.trim();
        if (!trimmed) return;
        onCommit({ name: trimmed, captureSize, includeToolSettings, captureColor });
    }

    return (
        <div style={overlay} role="dialog" aria-modal="true" data-testid="new-brush-preset-dialog">
            <div ref={dialogRef} style={card}>
                <div style={{ fontWeight: 600, marginBottom: 10 }}>New Brush Preset</div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                    <PreviewSwatch previewTip={previewTip} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>Name</span>
                            <input
                                data-testid="new-brush-preset-name"
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') commit();
                                    if (e.key === 'Escape') onCancel();
                                }}
                                autoFocus
                                style={inputStyle}
                            />
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <input
                                data-testid="new-brush-preset-capture-size"
                                type="checkbox"
                                checked={captureSize}
                                onChange={e => setCaptureSize(e.target.checked)}
                            />
                            Capture Brush Size in Preset
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <input
                                data-testid="new-brush-preset-include-tool-settings"
                                type="checkbox"
                                checked={includeToolSettings}
                                onChange={e => setIncludeToolSettings(e.target.checked)}
                            />
                            Include Tool Settings
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <input
                                data-testid="new-brush-preset-capture-color"
                                type="checkbox"
                                checked={captureColor}
                                onChange={e => setCaptureColor(e.target.checked)}
                            />
                            Capture Color in Preset
                        </label>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button type="button" data-testid="new-brush-preset-cancel" style={buttonStyle} onClick={onCancel}>Cancel</button>
                    <button type="button" data-testid="new-brush-preset-ok" style={primaryButtonStyle} onClick={commit}>OK</button>
                </div>
            </div>
        </div>
    );
}
