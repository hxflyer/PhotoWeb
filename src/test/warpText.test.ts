import { describe, it, expect, beforeEach } from 'vitest';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { commitTypeLayer, defaultTextStyle, type TypeLayerData } from '../tools/type';
import { applyTextWarp } from '../utils/textWarp';

ensureStubsRegistered();

function makeTypeData(warp: TypeLayerData['warp']): TypeLayerData {
    return {
        id: 't1',
        text: 'WARP',
        style: { ...defaultTextStyle, fontSize: 28, color: '#000000' },
        styleRuns: [],
        orientation: 'horizontal',
        textMode: 'point',
        transform: { x: 10, y: 30, width: 100, height: 40, rotation: 0 },
        bounds: { x: 10, y: 30, w: 80, h: 30 },
        warp,
    };
}

describe('Warp Text rasterization', () => {
    beforeEach(() => {
        useEditorStore.getState().clearHistory();
        useEditorStore.setState(s => ({ ...s, width: 200, height: 100, layers: [], activeLayerId: null }));
    });

    it('style: none renders identically to no warp at all', () => {
        const layer = new Layer(200, 100, 'L', 'type');
        const data = makeTypeData(undefined);
        commitTypeLayer(layer.canvas, data);
        const unwarped = layer.ctx.getImageData(10, 30, 80, 30);

        const layer2 = new Layer(200, 100, 'L', 'type');
        const data2 = makeTypeData({ style: 'none', bend: 50, distortH: 0, distortV: 0, horizontal: true });
        commitTypeLayer(layer2.canvas, data2);
        const noopWarp = layer2.ctx.getImageData(10, 30, 80, 30);

        let diff = 0;
        for (let i = 0; i < unwarped.data.length; i++) {
            diff += Math.abs(unwarped.data[i] - noopWarp.data[i]);
        }
        // Identical (or near-identical to anti-alias noise).
        expect(diff).toBeLessThan(10);
    });

    it('style: arc with bend=50 produces a different pixel pattern than no warp', () => {
        const layer = new Layer(200, 100, 'L', 'type');
        const data = makeTypeData({ style: 'arc', bend: 50, distortH: 0, distortV: 0, horizontal: true });
        commitTypeLayer(layer.canvas, data);
        const warped = layer.ctx.getImageData(10, 30, 80, 30);

        const layer2 = new Layer(200, 100, 'L', 'type');
        const data2 = makeTypeData(undefined);
        commitTypeLayer(layer2.canvas, data2);
        const unwarped = layer2.ctx.getImageData(10, 30, 80, 30);

        let diff = 0;
        for (let i = 0; i < warped.data.length; i++) {
            diff += Math.abs(warped.data[i] - unwarped.data[i]);
        }
        expect(diff).toBeGreaterThan(100); // visibly different
    });

    it('applyTextWarp with arc shifts the top-center row up (negative dy)', () => {
        const src = document.createElement('canvas');
        src.width = 40; src.height = 40;
        const sctx = src.getContext('2d')!;
        sctx.fillStyle = '#ff0000';
        sctx.fillRect(0, 18, 40, 4); // a horizontal red bar at the vertical middle

        const dest = document.createElement('canvas');
        dest.width = 40; dest.height = 40;
        const dctx = dest.getContext('2d')!;
        dctx.clearRect(0, 0, 40, 40);

        applyTextWarp(
            dctx, src,
            { style: 'arc', bend: 100, distortH: 0, distortV: 0, horizontal: true },
            { x: 0, y: 0, w: 40, h: 40 },
        );

        // After an arc-up warp (bend=100), pixels around the center of the bar
        // (u=0.5) should be displaced upward — the source row at y=20 maps to
        // a higher destination row.
        const center = dctx.getImageData(20, 0, 1, 40).data;
        // Find the topmost red-dominant row in the destination column.
        let topRed = -1;
        for (let y = 0; y < 40; y++) {
            if (center[y * 4] > 100 && center[y * 4 + 3] > 0) { topRed = y; break; }
        }
        // Source had red starting at y=18; the warped column should show red
        // at y < 18 (pulled upward) somewhere along the path.
        expect(topRed).toBeGreaterThanOrEqual(0);
        expect(topRed).toBeLessThan(18);
    });

    it('style: wave produces oscillating displacement (different from arc)', () => {
        // Synthesize a source canvas with a horizontal red bar — avoids
        // depending on jsdom/node-canvas font rendering for the assertion.
        const src = document.createElement('canvas');
        src.width = 80; src.height = 30;
        const sctx = src.getContext('2d')!;
        sctx.fillStyle = '#ff0000';
        sctx.fillRect(0, 13, 80, 4);

        const arcDest = document.createElement('canvas');
        arcDest.width = 80; arcDest.height = 30;
        applyTextWarp(
            arcDest.getContext('2d')!,
            src,
            { style: 'arc', bend: 100, distortH: 0, distortV: 0, horizontal: true },
            { x: 0, y: 0, w: 80, h: 30 },
        );

        const waveDest = document.createElement('canvas');
        waveDest.width = 80; waveDest.height = 30;
        applyTextWarp(
            waveDest.getContext('2d')!,
            src,
            { style: 'wave', bend: 100, distortH: 0, distortV: 0, horizontal: true },
            { x: 0, y: 0, w: 80, h: 30 },
        );

        const arcImg = arcDest.getContext('2d')!.getImageData(0, 0, 80, 30);
        const waveImg = waveDest.getContext('2d')!.getImageData(0, 0, 80, 30);

        let diff = 0;
        for (let i = 0; i < arcImg.data.length; i++) {
            diff += Math.abs(arcImg.data[i] - waveImg.data[i]);
        }
        // The two warp styles produce visibly different rasters.
        expect(diff).toBeGreaterThan(50);
    });
});
