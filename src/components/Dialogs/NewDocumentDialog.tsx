/**
 * NewDocumentDialog — create a new blank document with preset sizes.
 */
import { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { requestViewportFit } from '../../utils/viewportFit';
import { useDialogA11y } from '../../hooks/useDialogA11y';

interface Preset {
    label: string;
    width: number;
    height: number;
    resolution: number;
}

const PRESETS: Preset[] = [
    { label: 'A4', width: 2480, height: 3508, resolution: 300 },
    { label: 'Letter', width: 2550, height: 3300, resolution: 300 },
    { label: '1920 × 1080', width: 1920, height: 1080, resolution: 72 },
    { label: '1280 × 720', width: 1280, height: 720, resolution: 72 },
    { label: '800 × 600', width: 800, height: 600, resolution: 72 },
    { label: 'Custom', width: 800, height: 600, resolution: 72 },
];

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export function NewDocumentDialog({ isOpen, onClose }: Props) {
    const { newDocument } = useEditorStore();
    const [presetIndex, setPresetIndex] = useState(2);
    const [width, setWidth] = useState(PRESETS[2].width);
    const [height, setHeight] = useState(PRESETS[2].height);
    const [resolution, setResolution] = useState(72);
    const [background, setBackground] = useState<'white' | 'black' | 'transparent'>('white');
    const dialogRef = useDialogA11y(isOpen, onClose);

    function onPresetSelect(idx: number) {
        setPresetIndex(idx);
        const p = PRESETS[idx];
        setWidth(p.width);
        setHeight(p.height);
        setResolution(p.resolution);
    }

    function handleCreate() {
        const bg = background === 'white' ? '#ffffff'
            : background === 'black' ? '#000000'
            : 'transparent';
        // STAB-03: newDocument enforces MAX_DOC_PIXELS internally and pushes a
        // toast on refusal. Only close + fit when the document was actually
        // created.
        const created = newDocument(width, height, bg);
        if (created) {
            requestViewportFit();
            onClose();
        }
    }

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="new-document-title"
                tabIndex={-1}
                data-testid="new-document-dialog"
                style={{
                    background: '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: '6px',
                    padding: '16px',
                    minWidth: '420px',
                    color: 'white',
                    fontSize: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    display: 'flex',
                    gap: '16px',
                }}
            >
                {/* Preset list */}
                <div style={{ width: '140px', borderRight: '1px solid #444', paddingRight: '12px' }}>
                    <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Presets</div>
                    {PRESETS.map((p, i) => (
                        <div
                            key={p.label}
                            onClick={() => onPresetSelect(i)}
                            style={{
                                padding: '5px 8px',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                background: i === presetIndex ? 'rgba(0,144,255,0.2)' : 'transparent',
                                borderLeft: i === presetIndex ? '2px solid #0090ff' : '2px solid transparent',
                                fontSize: '11px',
                            }}
                        >
                            {p.label}
                        </div>
                    ))}
                </div>

                {/* Settings */}
                <div style={{ flex: 1 }}>
                    <div id="new-document-title" style={{ fontWeight: 600, marginBottom: '12px', fontSize: '13px' }}>New Document</div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '80px' }}>Width</span>
                            <input
                                type="number" min={1} max={32000} value={width}
                                onChange={e => { setWidth(Number(e.target.value)); setPresetIndex(5); }}
                                style={{ flex: 1, background: '#333', border: '1px solid #555', borderRadius: '3px', color: 'white', padding: '4px 8px', fontSize: '12px' }}
                            />
                            <span>px</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '80px' }}>Height</span>
                            <input
                                type="number" min={1} max={32000} value={height}
                                onChange={e => { setHeight(Number(e.target.value)); setPresetIndex(5); }}
                                style={{ flex: 1, background: '#333', border: '1px solid #555', borderRadius: '3px', color: 'white', padding: '4px 8px', fontSize: '12px' }}
                            />
                            <span>px</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '80px' }}>Resolution</span>
                            <select
                                value={resolution}
                                onChange={e => setResolution(Number(e.target.value))}
                                style={{ flex: 1, background: '#333', border: '1px solid #555', borderRadius: '3px', color: 'white', padding: '4px 8px', fontSize: '12px' }}
                            >
                                {[72, 96, 150, 300].map(r => (
                                    <option key={r} value={r} style={{ background: '#333' }}>{r} ppi</option>
                                ))}
                            </select>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '80px' }}>Background</span>
                            <select
                                value={background}
                                onChange={e => setBackground(e.target.value as 'white' | 'black' | 'transparent')}
                                style={{ flex: 1, background: '#333', border: '1px solid #555', borderRadius: '3px', color: 'white', padding: '4px 8px', fontSize: '12px' }}
                            >
                                <option value="white" style={{ background: '#333' }}>White</option>
                                <option value="black" style={{ background: '#333' }}>Black</option>
                                <option value="transparent" style={{ background: '#333' }}>Transparent</option>
                            </select>
                        </label>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button onClick={onClose} style={{ padding: '4px 12px', background: 'transparent', border: '1px solid #555', borderRadius: '3px', color: 'white', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                        <button
                            onClick={handleCreate}
                            data-testid="new-document-create-btn"
                            style={{ padding: '4px 12px', background: '#0090ff', border: 'none', borderRadius: '3px', color: 'white', cursor: 'pointer', fontSize: '12px' }}
                        >
                            Create
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
