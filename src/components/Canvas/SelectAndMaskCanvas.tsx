/**
 * SelectAndMaskCanvas — preview surface for the Select and Mask workspace.
 *
 * Composites the active layer (or visible-layer composite) against the
 * refined selection alpha, then draws the result on top of the chosen
 * background per the Photoshop View Mode dropdown. Pure compositor lives in
 * `src/utils/selectAndMaskCompositor.ts`.
 */
import { useEffect, useRef } from 'react';
import {
    renderSelectAndMaskToImageData,
    type SelectAndMaskViewMode,
} from '../../utils/selectAndMaskCompositor';

interface Props {
    width: number;
    height: number;
    mask: Uint8ClampedArray | null;
    source: ImageData | null;
    underlay?: ImageData | null;
    viewMode: SelectAndMaskViewMode;
    previewWidth?: number;
    previewHeight?: number;
}

export function SelectAndMaskCanvas({
    width, height, mask, source, underlay, viewMode, previewWidth = 280, previewHeight = 180,
}: Props) {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (width <= 0 || height <= 0) return;
        const img = renderSelectAndMaskToImageData(width, height, mask, source, underlay ?? null, viewMode);
        const tmp = document.createElement('canvas');
        tmp.width = width; tmp.height = height;
        const tctx = tmp.getContext('2d');
        if (!tctx) return;
        tctx.putImageData(img, 0, 0);
        const scale = Math.min(canvas.width / width, canvas.height / height);
        const dw = Math.max(1, Math.round(width * scale));
        const dh = Math.max(1, Math.round(height * scale));
        const dx = Math.round((canvas.width - dw) / 2);
        const dy = Math.round((canvas.height - dh) / 2);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tmp, dx, dy, dw, dh);
    }, [width, height, mask, source, underlay, viewMode]);

    return (
        <canvas
            ref={ref}
            width={previewWidth}
            height={previewHeight}
            data-testid="select-and-mask-canvas"
            data-view-mode={viewMode}
            style={{ background: '#000', border: '1px solid #444', borderRadius: 3, width: previewWidth, height: previewHeight }}
        />
    );
}
