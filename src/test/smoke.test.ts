import { describe, it, expect } from 'vitest';
import { pixelAt } from './simulator';

describe('test harness', () => {
    it('canvas2d returns real ImageData (node-canvas backed)', () => {
        const c = document.createElement('canvas');
        c.width = 10;
        c.height = 10;
        const ctx = c.getContext('2d');
        if (!ctx) throw new Error('no ctx');
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, 10, 10);
        const px = pixelAt(c, 5, 5);
        expect(px.r).toBe(255);
        expect(px.g).toBe(0);
        expect(px.b).toBe(0);
        expect(px.a).toBe(255);
    });

    it('crypto.randomUUID is available', () => {
        const id = crypto.randomUUID();
        expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
});
