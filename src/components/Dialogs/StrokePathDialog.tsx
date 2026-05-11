import { useState } from 'react';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import { useEditorStore } from '../../store/editorStore';
import { strokeActivePath } from '../../tools/pathPaint';

interface Props {
    open: boolean;
    onClose: () => void;
}

export function StrokePathDialog({ open, onClose }: Props) {
    if (!open) return null;
    return <StrokePathDialogBody onClose={onClose} />;
}

function StrokePathDialogBody({ onClose }: { onClose: () => void }) {
    const dialogRef = useDialogA11y(true, onClose);
    const [size, setSize] = useState(() => Math.max(1, Math.round(useEditorStore.getState().brushSettings.size)));
    const [color, setColor] = useState(() => useEditorStore.getState().primaryColor);
    const [opacity, setOpacity] = useState(100);

    const handleOk = () => {
        strokeActivePath({ size, color, opacity: Math.max(0, Math.min(1, opacity / 100)) });
        onClose();
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="stroke-path-title"
                tabIndex={-1}
                data-testid="stroke-path-dialog"
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: 6,
                    padding: 16,
                    minWidth: 280,
                    color: 'white',
                    fontSize: 12,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
            >
                <div id="stroke-path-title" style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>Stroke Path</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ width: 80, fontSize: 11 }}>Size (px)</span>
                    <input
                        type="number"
                        min={1}
                        max={300}
                        value={size}
                        onChange={e => setSize(Math.max(1, Math.min(300, Number(e.target.value))))}
                        data-testid="stroke-path-size-input"
                        style={{ flex: 1, background: '#333', border: '1px solid #555', borderRadius: 3, color: 'white', padding: '4px 8px', fontSize: 12 }}
                    />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ width: 80, fontSize: 11 }}>Color</span>
                    <input
                        type="color"
                        value={color}
                        onChange={e => setColor(e.target.value)}
                        data-testid="stroke-path-color-input"
                        style={{ width: 40, height: 24, padding: 0, border: '1px solid #555', borderRadius: 3, background: '#333' }}
                    />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span style={{ width: 80, fontSize: 11 }}>Opacity (%)</span>
                    <input
                        type="number"
                        min={0}
                        max={100}
                        value={opacity}
                        onChange={e => setOpacity(Math.max(0, Math.min(100, Number(e.target.value))))}
                        data-testid="stroke-path-opacity-input"
                        style={{ flex: 1, background: '#333', border: '1px solid #555', borderRadius: 3, color: 'white', padding: '4px 8px', fontSize: 12 }}
                    />
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={onClose} style={{ padding: '4px 12px', background: 'transparent', border: '1px solid #555', borderRadius: 3, color: 'white', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                    <button
                        onClick={handleOk}
                        data-testid="stroke-path-ok"
                        style={{ padding: '4px 12px', background: '#0090ff', border: 'none', borderRadius: 3, color: 'white', cursor: 'pointer', fontSize: 12 }}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}
