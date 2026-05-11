import { describe, it, expect, beforeEach } from 'vitest';
import { Layer } from '../core/Layer';
import { createWorkPathFromLayer } from '../tools/textToPath';
import { getPaths, setActivePath } from '../tools/pen';

function resetPaths() {
    const paths = [...getPaths()];
    for (const p of paths) {
        const idx = getPaths().indexOf(p);
        if (idx >= 0) getPaths().splice(idx, 1);
    }
    setActivePath(null);
}

describe('GAP-07b Create Work Path from layer alpha', () => {
    beforeEach(() => resetPaths());

    it('traces a filled rectangle into a closed path with at least 4 anchors', () => {
        const layer = new Layer(40, 40, 'box', 'raster');
        layer.ctx.fillStyle = '#000';
        layer.ctx.fillRect(10, 10, 20, 20);
        const before = getPaths().length;
        const added = createWorkPathFromLayer(layer);
        expect(added).toBeGreaterThan(0);
        expect(getPaths().length).toBe(before + added);
        const newest = getPaths()[getPaths().length - 1];
        expect(newest.closed).toBe(true);
        expect(newest.anchors.length).toBeGreaterThanOrEqual(4);
    });

    it('returns 0 for an empty layer', () => {
        const layer = new Layer(20, 20, 'empty', 'raster');
        const added = createWorkPathFromLayer(layer);
        expect(added).toBe(0);
    });

    it('traces two disjoint regions as two paths', () => {
        const layer = new Layer(60, 30, 'two', 'raster');
        layer.ctx.fillStyle = '#000';
        layer.ctx.fillRect(5, 5, 10, 10);
        layer.ctx.fillRect(40, 5, 10, 10);
        const before = getPaths().length;
        const added = createWorkPathFromLayer(layer);
        expect(added).toBeGreaterThanOrEqual(2);
        expect(getPaths().length).toBe(before + added);
    });
});
