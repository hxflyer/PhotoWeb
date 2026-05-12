import { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { getFilter } from '../../filters/registry';
import type { FilterApplyContext } from '../../filters/Filter';
import { useDialogA11y } from '../../hooks/useDialogA11y';

interface FilterDialogProps {
    isOpen: boolean;
    filterId: string;
    sourceImage: ImageData | null;
    initialParams?: Record<string, unknown>;
    onConfirm: (params: Record<string, unknown>) => void;
    onClose: () => void;
}

export function FilterDialog({ isOpen, filterId, sourceImage, initialParams, onConfirm, onClose }: FilterDialogProps) {
    const filter = getFilter(filterId);
    const [params, setParams] = useState<Record<string, unknown>>(
        initialParams ?? filter?.defaultParams ?? {}
    );
    const previewRef = useRef<HTMLCanvasElement>(null);
    const dialogRef = useDialogA11y(isOpen, onClose);
    const [previewEnabled, setPreviewEnabled] = useState(true);

    const renderPreview = useCallback(() => {
        if (!filter || !sourceImage || !previewRef.current) return;
        const canvas = previewRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (!previewEnabled) {
            canvas.width = sourceImage.width;
            canvas.height = sourceImage.height;
            ctx.putImageData(sourceImage, 0, 0);
            return;
        }

        const applyCtx: FilterApplyContext = {
            image: sourceImage,
            width: sourceImage.width,
            height: sourceImage.height,
            selectionMask: null,
            dirtyRect: null,
        };
        try {
            const result = filter.apply(params, applyCtx);
            canvas.width = result.width;
            canvas.height = result.height;
            ctx.putImageData(result, 0, 0);
        } catch {
            // preview failure is non-fatal
        }
    }, [filter, sourceImage, params, previewEnabled]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (isOpen) setParams(initialParams ?? filter?.defaultParams ?? {});
    }, [isOpen, filterId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (isOpen) renderPreview();
    }, [isOpen, renderPreview]);

    // Photoshop's Alt/Opt+P toggles the Preview checkbox while a filter dialog is open.
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.altKey && (e.key === 'p' || e.key === 'P')) {
                e.preventDefault();
                setPreviewEnabled(v => !v);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen]);

    if (!isOpen || !filter) return null;

    const handleConfirm = () => {
        onConfirm(params);
        onClose();
    };

    const handleParamChange = (next: Record<string, unknown>) => {
        setParams(next);
    };

    const handleReset = () => {
        setParams({ ...(filter.defaultParams as Record<string, unknown>) });
    };

    return (
        <div
            data-testid="filter-dialog"
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.62)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1100,
                backdropFilter: 'blur(2px)',
            }}
            onClick={onClose}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="filter-dialog-title"
                tabIndex={-1}
                style={{
                    width: 720,
                    maxHeight: '84vh',
                    background: 'linear-gradient(#565656, #4b4b4b)',
                    border: '1px solid #202020',
                    borderRadius: 14,
                    boxShadow: '0 18px 46px rgba(0,0,0,0.52), inset 0 1px rgba(255,255,255,0.18)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '10px 16px',
                    borderBottom: '1px solid #242424',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'linear-gradient(#454545, #3b3b3b)',
                }}>
                    <div style={{ width: 24 }} />
                    <h3 id="filter-dialog-title" style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#e4e4e4', letterSpacing: 0.2 }}>
                        {filter.label}
                    </h3>
                    <button
                        aria-label="Close"
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 4 }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body: controls + right-side button column */}
                <div style={{ display: 'flex', minHeight: 320, overflow: 'hidden', padding: 20, gap: 22 }}>
                    <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', color: '#efefef', fontSize: 14, fontWeight: 500 }}>
                        {filter.renderUI
                            ? filter.renderUI(params, handleParamChange)
                            : <span style={{ color: 'hsl(var(--text-muted))' }}>No options</span>
                        }
                    </div>
                    <div style={{ flex: '0 0 150px', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'stretch' }}>
                        <button
                            data-testid="filter-confirm"
                            onClick={handleConfirm}
                            style={{ padding: '8px 16px', background: 'transparent', border: '2px solid #eeeeee', color: '#f7f7f7', borderRadius: 20, cursor: 'pointer', fontSize: 16, fontWeight: 700 }}
                        >
                            OK
                        </button>
                        <button
                            onClick={onClose}
                            style={{ padding: '8px 16px', background: 'transparent', border: '2px solid #777', color: '#f0f0f0', borderRadius: 20, cursor: 'pointer', fontSize: 16, fontWeight: 700 }}
                        >
                            Cancel
                        </button>
                        <button
                            data-testid="filter-reset"
                            onClick={handleReset}
                            style={{ padding: '8px 16px', background: 'transparent', border: '2px solid #777', color: '#f0f0f0', borderRadius: 20, cursor: 'pointer', fontSize: 16, fontWeight: 700 }}
                        >
                            Reset
                        </button>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#efefef', fontSize: 13 }}>
                            <input
                                data-testid="filter-preview-checkbox"
                                type="checkbox"
                                checked={previewEnabled}
                                onChange={e => setPreviewEnabled(e.target.checked)}
                            />
                            <span>Preview</span>
                        </label>
                        <div style={{ marginTop: 4, color: '#d8d8d8', fontSize: 11, fontWeight: 500 }}>
                            Preview sample
                        </div>
                        <div style={{ height: 110, background: '#171717', border: '1px solid #6a6a6a', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <canvas
                                ref={previewRef}
                                data-testid="filter-preview-canvas"
                                style={{ maxWidth: '100%', maxHeight: '100%', imageRendering: 'auto' }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
