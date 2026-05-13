import { useMemo, useState } from 'react';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import { useEditorStore } from '../../store/editorStore';
import { exportAsJpeg, exportAsPng, stripImageExtension, type JpegBaseline } from '../../utils/exportImage';
import { JPEGOptionsDialog } from './JPEGOptionsDialog';

export type SaveAsFormat = 'pwbdoc' | 'jpeg' | 'png';

const FORMAT_LABEL: Record<SaveAsFormat, string> = {
    pwbdoc: 'Photoshop Document (.pwbdoc)',
    jpeg: 'JPEG (.jpg)',
    png: 'PNG (.png)',
};

const FORMAT_EXT: Record<SaveAsFormat, string> = {
    pwbdoc: '.pwbdoc',
    jpeg: '.jpg',
    png: '.png',
};

interface Props {
    isOpen: boolean;
    initialName: string;
    onClose: () => void;
}

export function SaveAsDialog({ isOpen, initialName, onClose }: Props) {
    const layers = useEditorStore(s => s.layers);
    const width = useEditorStore(s => s.width);
    const height = useEditorStore(s => s.height);
    const saveFile = useEditorStore(s => s.saveFile);
    const addToast = useEditorStore(s => s.addToast);
    const setDocumentName = useEditorStore(s => s.setDocumentName);
    const markDocumentClean = useEditorStore(s => s.markDocumentClean);

    const [name, setName] = useState(() => stripImageExtension(initialName) || 'Untitled');
    const [format, setFormat] = useState<SaveAsFormat>('pwbdoc');
    const [jpegOptionsOpen, setJpegOptionsOpen] = useState(false);

    const dialogRef = useDialogA11y(isOpen && !jpegOptionsOpen, onClose);

    const trimmedName = name.trim();
    const filenamePreview = useMemo(() => `${stripImageExtension(trimmedName)}${FORMAT_EXT[format]}`, [trimmedName, format]);
    const canSave = trimmedName.length > 0 && layers.length > 0;

    if (!isOpen) return null;

    async function performSave(jpegQuality?: number, jpegBaseline?: JpegBaseline): Promise<void> {
        const baseName = stripImageExtension(trimmedName);
        if (format === 'pwbdoc') {
            try {
                await saveFile(baseName);
                addToast(`Saved "${baseName}.pwbdoc"`, 'success');
            } catch {
                addToast('Save failed', 'error');
                return;
            }
        } else if (format === 'jpeg') {
            const filename = `${baseName}.jpg`;
            const ok = await exportAsJpeg({
                layers,
                width,
                height,
                filename,
                quality: jpegQuality ?? 12,
                baseline: jpegBaseline ?? 'optimized',
            });
            if (!ok) { addToast('Save failed', 'error'); return; }
            setDocumentName(filename);
            markDocumentClean();
            addToast(`Saved "${filename}"`, 'success');
        } else {
            const filename = `${baseName}.png`;
            const ok = await exportAsPng({ layers, width, height, filename });
            if (!ok) { addToast('Save failed', 'error'); return; }
            setDocumentName(filename);
            markDocumentClean();
            addToast(`Saved "${filename}"`, 'success');
        }
        onClose();
    }

    function handleSaveClick() {
        if (!canSave) return;
        if (format === 'jpeg') {
            setJpegOptionsOpen(true);
            return;
        }
        void performSave();
    }

    function handleKey(e: React.KeyboardEvent<HTMLDivElement>) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSaveClick();
        }
    }

    return (
        <>
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div
                    ref={dialogRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="save-as-title"
                    tabIndex={-1}
                    data-testid="save-as-dialog"
                    onKeyDown={handleKey}
                    style={{
                        background: '#2a2a2a',
                        border: '1px solid #444',
                        borderRadius: '6px',
                        padding: '16px',
                        color: 'white',
                        fontSize: '12px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        minWidth: '380px',
                    }}
                >
                    <div id="save-as-title" style={{ fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>Save As</div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '60px', color: '#bbb' }}>Name</span>
                            <input
                                data-testid="save-as-name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                autoFocus
                                style={{ flex: 1, background: '#333', border: '1px solid #555', borderRadius: '3px', color: 'white', padding: '4px 8px', fontSize: '12px' }}
                            />
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '60px', color: '#bbb' }}>Format</span>
                            <select
                                data-testid="save-as-format"
                                value={format}
                                onChange={e => setFormat(e.target.value as SaveAsFormat)}
                                style={{ flex: 1, background: '#333', border: '1px solid #555', borderRadius: '3px', color: 'white', padding: '4px 8px', fontSize: '12px' }}
                            >
                                <option value="pwbdoc">{FORMAT_LABEL.pwbdoc}</option>
                                <option value="jpeg">{FORMAT_LABEL.jpeg}</option>
                                <option value="png">{FORMAT_LABEL.png}</option>
                            </select>
                        </label>
                        <div data-testid="save-as-filename-preview" style={{ color: '#888', fontSize: '11px', paddingLeft: '68px' }}>
                            Will save as: {filenamePreview}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button onClick={onClose} style={{ padding: '5px 14px', background: 'transparent', border: '1px solid #555', borderRadius: '3px', color: 'white', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                        <button
                            data-testid="save-as-save-btn"
                            onClick={handleSaveClick}
                            disabled={!canSave}
                            style={{
                                padding: '5px 14px',
                                background: canSave ? '#0090ff' : '#555',
                                border: 'none',
                                borderRadius: '3px',
                                color: 'white',
                                cursor: canSave ? 'pointer' : 'not-allowed',
                                fontSize: '12px',
                                opacity: canSave ? 1 : 0.6,
                            }}
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>

            <JPEGOptionsDialog
                isOpen={jpegOptionsOpen}
                onCancel={() => setJpegOptionsOpen(false)}
                onConfirm={(quality, baseline) => {
                    setJpegOptionsOpen(false);
                    void performSave(quality, baseline);
                }}
            />
        </>
    );
}
