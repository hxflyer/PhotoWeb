// Batch D — document/image dialog enhancements.
// Item 1: ImageSize resample methods (Automatic / Bicubic Smoother / Bicubic
//          Sharper / Bicubic / Bilinear / Nearest Neighbor) with Resample
//          checkbox.

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import {
    resampleCanvas,
    resampleImageData,
    resolveAutomaticResample,
    type ResampleMethod,
} from '../core/imageTransforms';
import { ImageSizeDialog } from '../components/Dialogs/ImageSizeDialog';
import { CanvasSizeDialog } from '../components/Dialogs/CanvasSizeDialog';
import { runScript } from './simulator';

function makeChecker(w: number, h: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;
    const id = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const on = ((x >> 3) + (y >> 3)) & 1;
            const i = (y * w + x) * 4;
            id.data[i] = on ? 255 : 0;
            id.data[i + 1] = on ? 255 : 0;
            id.data[i + 2] = on ? 255 : 0;
            id.data[i + 3] = 255;
        }
    }
    ctx.putImageData(id, 0, 0);
    return c;
}

describe('Batch D Item 1 — ImageSize resample methods', () => {
    afterEach(() => cleanup());

    it('resolveAutomaticResample picks bicubic-smoother when scaling up and bicubic-sharper when scaling down', () => {
        expect(resolveAutomaticResample('automatic', 100, 100, 200, 200)).toBe('bicubic-smoother');
        expect(resolveAutomaticResample('automatic', 200, 200, 100, 100)).toBe('bicubic-sharper');
        expect(resolveAutomaticResample('automatic', 100, 100, 100, 100)).toBe('bicubic-smoother');
        expect(resolveAutomaticResample('bilinear', 100, 100, 200, 200)).toBe('bilinear');
    });

    it('resampling a 100x100 checker to 200x200 with each method produces deterministic 200x200 output', () => {
        const src = makeChecker(100, 100);
        const methods: Exclude<ResampleMethod, 'automatic'>[] = [
            'nearest', 'bilinear', 'bicubic', 'bicubic-smoother', 'bicubic-sharper',
        ];
        for (const m of methods) {
            const out = resampleCanvas(src, 200, 200, m);
            expect(out.width).toBe(200);
            expect(out.height).toBe(200);
            const ctx = out.getContext('2d')!;
            const px = ctx.getImageData(10, 10, 1, 1).data;
            // All non-zero alpha (we drew opaque pixels)
            expect(px[3]).toBe(255);
        }
    });

    it('Nearest Neighbor on a 2x2 black/white checker upscaled to 4x4 preserves blocks', () => {
        const c = document.createElement('canvas');
        c.width = 2; c.height = 2;
        const ctx = c.getContext('2d')!;
        const id = ctx.createImageData(2, 2);
        // 0,0=black 1,0=white 0,1=white 1,1=black
        const pix = [
            0, 0, 0, 255,
            255, 255, 255, 255,
            255, 255, 255, 255,
            0, 0, 0, 255,
        ];
        for (let i = 0; i < pix.length; i++) id.data[i] = pix[i];
        ctx.putImageData(id, 0, 0);
        const out = resampleImageData(ctx.getImageData(0, 0, 2, 2), 4, 4, 'nearest');
        // Top-left block should be black
        expect(out.data[0]).toBe(0);
        expect(out.data[1]).toBe(0);
        // Top-right block should be white
        const tr = (0 * 4 + 3) * 4;
        expect(out.data[tr]).toBe(255);
    });

    it('Bicubic Smoother and Bicubic Sharper produce different output on the same input', () => {
        const src = makeChecker(50, 50);
        const srcCtx = src.getContext('2d')!;
        const srcData = srcCtx.getImageData(0, 0, 50, 50);
        const smoother = resampleImageData(srcData, 100, 100, 'bicubic-smoother');
        const sharper = resampleImageData(srcData, 100, 100, 'bicubic-sharper');
        let diff = 0;
        for (let i = 0; i < smoother.data.length; i++) {
            diff += Math.abs(smoother.data[i] - sharper.data[i]);
        }
        expect(diff).toBeGreaterThan(0);
    });

    it('ImageSizeDialog confirms with Automatic by default and exposes Resample toggle', async () => {
        let captured: { w: number; h: number; method: ResampleMethod } | null = null;
        const { container } = render(
            <ImageSizeDialog
                isOpen={true}
                currentWidth={100}
                currentHeight={100}
                onConfirm={(w, h, method) => { captured = { w, h, method }; }}
                onClose={() => { /* noop */ }}
            />,
        );
        // Type a new width
        const w = container.querySelector('[data-testid="img-size-w"]') as HTMLInputElement;
        fireEvent.change(w, { target: { value: '200' } });
        await runScript([
            { type: 'click', target: '[data-testid="img-size-ok"]' },
        ], container);
        expect(captured).not.toBeNull();
        expect(captured!.w).toBe(200);
        expect(captured!.h).toBe(200);
        expect(captured!.method).toBe('automatic');
    });

    it('ImageSizeDialog Resample off locks pixel count to current width/height', async () => {
        let captured: { w: number; h: number; method: ResampleMethod } | null = null;
        const { container } = render(
            <ImageSizeDialog
                isOpen={true}
                currentWidth={123}
                currentHeight={45}
                onConfirm={(w, h, method) => { captured = { w, h, method }; }}
                onClose={() => { /* noop */ }}
            />,
        );
        const w = container.querySelector('[data-testid="img-size-w"]') as HTMLInputElement;
        fireEvent.change(w, { target: { value: '999' } });
        // toggle resample off
        const toggle = container.querySelector('[data-testid="img-size-resample-toggle"]') as HTMLInputElement;
        fireEvent.click(toggle);
        await runScript([
            { type: 'click', target: '[data-testid="img-size-ok"]' },
        ], container);
        expect(captured).not.toBeNull();
        expect(captured!.w).toBe(123);
        expect(captured!.h).toBe(45);
    });

    it('ImageSizeDialog renders all six method options', () => {
        const { container } = render(
            <ImageSizeDialog
                isOpen={true}
                currentWidth={100}
                currentHeight={100}
                onConfirm={() => { /* noop */ }}
                onClose={() => { /* noop */ }}
            />,
        );
        const select = container.querySelector('[data-testid="img-size-resample"]') as HTMLSelectElement;
        const opts = Array.from(select.options).map(o => o.value);
        expect(opts).toEqual([
            'automatic',
            'bicubic-smoother',
            'bicubic-sharper',
            'bicubic',
            'bilinear',
            'nearest',
        ]);
    });
});

describe('Batch D Item 2 — CanvasSize Relative + Current/New Size header', () => {
    afterEach(() => cleanup());

    it('renders Current Size and New Size in the header', () => {
        const { container } = render(
            <CanvasSizeDialog
                isOpen={true}
                currentWidth={2048}
                currentHeight={1024}
                onConfirm={() => { /* noop */ }}
                onClose={() => { /* noop */ }}
            />,
        );
        const current = container.querySelector('[data-testid="canvas-size-current"]')!;
        const next = container.querySelector('[data-testid="canvas-size-new"]')!;
        expect(current.textContent).toContain('2048');
        expect(current.textContent).toContain('1024');
        expect(next.textContent).toContain('2048');
        expect(next.textContent).toContain('1024');
    });

    it('updates New Size live as the user types width', () => {
        const { container } = render(
            <CanvasSizeDialog
                isOpen={true}
                currentWidth={500}
                currentHeight={300}
                onConfirm={() => { /* noop */ }}
                onClose={() => { /* noop */ }}
            />,
        );
        const wInput = container.querySelector('[data-testid="canvas-size-w"]') as HTMLInputElement;
        fireEvent.change(wInput, { target: { value: '900' } });
        const next = container.querySelector('[data-testid="canvas-size-new"]')!;
        expect(next.textContent).toContain('900');
        expect(next.textContent).toContain('300');
    });

    it('Relative + Width=50 grows canvas by 50 from its current width', async () => {
        let captured: { w: number; h: number } | null = null;
        const { container } = render(
            <CanvasSizeDialog
                isOpen={true}
                currentWidth={500}
                currentHeight={300}
                onConfirm={(w, h) => { captured = { w, h }; }}
                onClose={() => { /* noop */ }}
            />,
        );
        // toggle relative
        const rel = container.querySelector('[data-testid="canvas-size-relative"]') as HTMLInputElement;
        fireEvent.click(rel);
        // delta +50 on width
        const wInput = container.querySelector('[data-testid="canvas-size-w"]') as HTMLInputElement;
        fireEvent.change(wInput, { target: { value: '50' } });
        // New size readout reflects 550 x 300
        const next = container.querySelector('[data-testid="canvas-size-new"]')!;
        expect(next.textContent).toContain('550');
        expect(next.textContent).toContain('300');
        await runScript([
            { type: 'click', target: '[data-testid="canvas-size-ok"]' },
        ], container);
        expect(captured).not.toBeNull();
        expect(captured!.w).toBe(550);
        expect(captured!.h).toBe(300);
    });

    it('Relative + negative delta shrinks the canvas (clamped to at least 1)', async () => {
        let captured: { w: number; h: number } | null = null;
        const { container } = render(
            <CanvasSizeDialog
                isOpen={true}
                currentWidth={500}
                currentHeight={300}
                onConfirm={(w, h) => { captured = { w, h }; }}
                onClose={() => { /* noop */ }}
            />,
        );
        const rel = container.querySelector('[data-testid="canvas-size-relative"]') as HTMLInputElement;
        fireEvent.click(rel);
        const wInput = container.querySelector('[data-testid="canvas-size-w"]') as HTMLInputElement;
        fireEvent.change(wInput, { target: { value: '-100' } });
        await runScript([
            { type: 'click', target: '[data-testid="canvas-size-ok"]' },
        ], container);
        expect(captured!.w).toBe(400);
        expect(captured!.h).toBe(300);
    });
});
