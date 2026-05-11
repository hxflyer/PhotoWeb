import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import {
    rotateCanvas,
    flipCanvas,
    resampleCanvas,
    resizeCanvasWithAnchor,
    computeTrimRect,
    cropCanvas,
} from '../core/imageTransforms';
import { pixelAt } from './simulator';

function reset() {
    useEditorStore.setState(s => ({ ...s, layers: [], activeLayerId: null }));
    useEditorStore.getState().addLayer();
    useEditorStore.getState().clearHistory();
}

// ── Core helpers ──────────────────────────────────────────────────────────

describe('rotateCanvas', () => {
    it('90° rotation swaps width and height', () => {
        const c = document.createElement('canvas');
        c.width = 100; c.height = 50;
        const result = rotateCanvas(c, 90);
        expect(result.width).toBeCloseTo(50, 0);
        expect(result.height).toBeCloseTo(100, 0);
    });

    it('180° rotation preserves width and height', () => {
        const c = document.createElement('canvas');
        c.width = 80; c.height = 60;
        const result = rotateCanvas(c, 180);
        expect(result.width).toBe(80);
        expect(result.height).toBe(60);
    });

    it('180° rotation moves a corner pixel to the opposite corner', () => {
        const c = document.createElement('canvas');
        c.width = 10; c.height = 10;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, 1, 1); // top-left red
        const result = rotateCanvas(c, 180);
        const px = pixelAt(result, 9, 9); // bottom-right after 180°
        expect(px.r).toBeGreaterThan(200);
    });
});

describe('flipCanvas', () => {
    it('horizontal flip mirrors a pixel to the opposite X', () => {
        const c = document.createElement('canvas');
        c.width = 10; c.height = 10;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = 'blue';
        ctx.fillRect(0, 0, 1, 10); // left column blue
        const result = flipCanvas(c, 'horizontal');
        const rightPx = pixelAt(result, 9, 5);
        expect(rightPx.b).toBeGreaterThan(200);
        const leftPx = pixelAt(result, 0, 5);
        expect(leftPx.b).toBeLessThan(50);
    });

    it('vertical flip mirrors a pixel to the opposite Y', () => {
        const c = document.createElement('canvas');
        c.width = 10; c.height = 10;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = '#00ff00'; // full green (not CSS 'green' which is #008000)
        ctx.fillRect(0, 0, 10, 1); // top row green
        const result = flipCanvas(c, 'vertical');
        const bottomPx = pixelAt(result, 5, 9);
        expect(bottomPx.g).toBeGreaterThan(200);
    });
});

describe('resampleCanvas', () => {
    it('scales to new dimensions', () => {
        const c = document.createElement('canvas');
        c.width = 100; c.height = 80;
        const result = resampleCanvas(c, 50, 40, 'bilinear');
        expect(result.width).toBe(50);
        expect(result.height).toBe(40);
    });
});

describe('computeTrimRect + cropCanvas', () => {
    it('trims transparent borders', () => {
        const c = document.createElement('canvas');
        c.width = 10; c.height = 10;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = 'rgba(255,0,0,1)';
        ctx.fillRect(3, 3, 4, 4); // red square in center

        const rect = computeTrimRect(c, 'transparent', { top: true, right: true, bottom: true, left: true });
        expect(rect.x).toBe(3);
        expect(rect.y).toBe(3);
        expect(rect.width).toBe(4);
        expect(rect.height).toBe(4);

        const cropped = cropCanvas(c, rect);
        expect(cropped.width).toBe(4);
        expect(cropped.height).toBe(4);
    });
});

describe('resizeCanvasWithAnchor', () => {
    it('expands canvas placing content at top-left (anchor 0,0)', () => {
        const c = document.createElement('canvas');
        c.width = 4; c.height = 4;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = 'red';
        ctx.fillRect(0, 0, 4, 4);
        const result = resizeCanvasWithAnchor(c, 8, 8, 0, 0, 'transparent');
        expect(result.width).toBe(8);
        expect(result.height).toBe(8);
        // Content at top-left
        const px = pixelAt(result, 1, 1);
        expect(px.r).toBeGreaterThan(200);
        // Expansion area should be transparent
        const ext = pixelAt(result, 7, 7);
        expect(ext.a).toBe(0);
    });
});

// ── Store actions ─────────────────────────────────────────────────────────

describe('store: rotateCanvas', () => {
    beforeEach(reset);

    it('90° rotation updates store width/height', () => {
        const { rotateCanvas: storeRotate, width, height } = useEditorStore.getState();
        storeRotate(90);
        const s = useEditorStore.getState();
        expect(s.width).toBeCloseTo(height, 0);
        expect(s.height).toBeCloseTo(width, 0);
    });
});

describe('store: flipCanvas', () => {
    beforeEach(reset);

    it('horizontal flip preserves dimensions', () => {
        const { flipCanvas: storeFlip, width, height } = useEditorStore.getState();
        storeFlip('horizontal');
        const s = useEditorStore.getState();
        expect(s.width).toBe(width);
        expect(s.height).toBe(height);
    });

    it('horizontal flip mirrors pixel: red left col → after flip red is on right', () => {
        const store = useEditorStore.getState();
        const layer = store.layers[0];
        layer.ctx.fillStyle = 'red';
        layer.ctx.fillRect(0, 0, 1, layer.canvas.height);
        store.flipCanvas('horizontal');
        const rightPx = layer.ctx.getImageData(layer.canvas.width - 1, 5, 1, 1).data;
        expect(rightPx[0]).toBeGreaterThan(200);
    });
});

describe('store: resizeImage', () => {
    beforeEach(reset);

    it('scales the canvas and updates store dimensions', () => {
        const { resizeImage } = useEditorStore.getState();
        resizeImage(400, 300, 'nearest');
        const s = useEditorStore.getState();
        expect(s.width).toBe(400);
        expect(s.height).toBe(300);
        expect(s.layers[0].canvas.width).toBe(400);
        expect(s.layers[0].canvas.height).toBe(300);
    });

    it('undo and redo restore image resize dimensions', () => {
        const store = useEditorStore.getState();
        const before = { width: store.width, height: store.height };
        store.resizeImage(320, 240, 'nearest');
        expect(useEditorStore.getState().width).toBe(320);
        expect(useEditorStore.getState().layers[0].canvas.width).toBe(320);

        useEditorStore.getState().undo();
        expect(useEditorStore.getState().width).toBe(before.width);
        expect(useEditorStore.getState().height).toBe(before.height);
        expect(useEditorStore.getState().layers[0].canvas.width).toBe(before.width);

        useEditorStore.getState().redo();
        expect(useEditorStore.getState().width).toBe(320);
        expect(useEditorStore.getState().height).toBe(240);
    });
});

describe('store: resizeCanvas', () => {
    beforeEach(reset);

    it('expands canvas and updates store dimensions', () => {
        const { resizeCanvas } = useEditorStore.getState();
        resizeCanvas(1000, 800, 0.5, 0.5, 'transparent');
        const s = useEditorStore.getState();
        expect(s.width).toBe(1000);
        expect(s.height).toBe(800);
    });
});

describe('store: trimCanvas', () => {
    beforeEach(reset);

    it('trims transparent borders and updates dimensions', () => {
        const store = useEditorStore.getState();
        const layer = store.layers[0];
        // Paint a small red rect in the center of the 800×600 default canvas
        layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
        layer.ctx.fillStyle = 'red';
        layer.ctx.fillRect(100, 100, 50, 50);

        store.trimCanvas('transparent', { top: true, right: true, bottom: true, left: true });
        const s = useEditorStore.getState();
        // Should trim down to roughly 50×50
        expect(s.width).toBeLessThan(200);
        expect(s.height).toBeLessThan(200);
    });
});
