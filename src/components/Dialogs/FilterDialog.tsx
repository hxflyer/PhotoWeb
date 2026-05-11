import { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { getFilter } from '../../filters/registry';
import type { FilterApplyContext } from '../../filters/Filter';
import { useDialogA11y } from '../../hooks/useDialogA11y';

interface FilterDialogProps {
    isOpen: boolean;
    filterId: string;
    /** Source image to preview against */
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

    const renderPreview = useCallback(() => {
        if (!filter || !sourceImage || !previewRef.current) return;
        const canvas = previewRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

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
    }, [filter, sourceImage, params]);

    useEffect(() => {
        if (isOpen) {
            setParams(initialParams ?? filter?.defaultParams ?? {}); // eslint-disable-line react-hooks/set-state-in-effect
        }
    }, [isOpen, filterId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (isOpen) renderPreview();
    }, [isOpen, renderPreview]);

    if (!isOpen || !filter) return null;

    const handleConfirm = () => {
        onConfirm(params);
        onClose();
    };

    const handleParamChange = (next: Record<string, unknown>) => {
        setParams(next);
    };

    return (
        <div
            data-testid="filter-dialog"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
                    width: '560px',
                    maxHeight: '80vh',
                    backgroundColor: 'hsl(var(--bg-panel))',
                    border: '1px solid hsl(var(--border-light))',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid hsl(var(--border-light))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'hsl(var(--bg-header))',
                }}>
                    <h3 id="filter-dialog-title" style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'hsl(var(--text-main))' }}>
                        {filter.label}
                    </h3>
                    <button
                        aria-label="Close"
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer', padding: '4px', display: 'flex', borderRadius: '4px' }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body: preview + controls */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* Preview */}
                    <div style={{
                        flex: '0 0 280px',
                        backgroundColor: '#111',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        padding: '8px',
                    }}>
                        <canvas
                            ref={previewRef}
                            data-testid="filter-preview-canvas"
                            style={{ maxWidth: '100%', maxHeight: '100%', imageRendering: 'pixelated' }}
                        />
                    </div>

                    {/* Controls */}
                    <div style={{
                        flex: 1,
                        padding: '16px',
                        overflowY: 'auto',
                        color: 'hsl(var(--text-muted))',
                        fontSize: '13px',
                    }}>
                        {filter.renderUI
                            ? filter.renderUI(params, handleParamChange)
                            : <span style={{ color: 'hsl(var(--text-muted))' }}>No options</span>
                        }
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '12px 16px',
                    borderTop: '1px solid hsl(var(--border-light))',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '8px',
                    backgroundColor: 'hsl(var(--bg-header))',
                }}>
                    <button
                        onClick={onClose}
                        style={{ padding: '6px 12px', backgroundColor: 'transparent', border: '1px solid hsl(var(--border-light))', color: 'hsl(var(--text-main))', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                        Cancel
                    </button>
                    <button
                        data-testid="filter-confirm"
                        onClick={handleConfirm}
                        style={{ padding: '6px 12px', backgroundColor: 'hsl(var(--accent-primary))', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}
