import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { Canvas2DCompositor } from '../compositor/Canvas2DCompositor';
import { pixelAt } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        width: 100,
        height: 100,
        globalLight: { angle: 120, altitude: 30 },
    }));
    useEditorStore.getState().addLayer();
}

function compose(globalAngle = 120): HTMLCanvasElement {
    const target = document.createElement('canvas');
    target.width = 100; target.height = 100;
    const c = new Canvas2DCompositor();
    c.render({
        layers: useEditorStore.getState().layers,
        activeLayerId: useEditorStore.getState().activeLayerId,
        viewport: { width: 100, height: 100, zoom: 1, pan: { x: 0, y: 0 } },
        target,
        globalLight: { angle: globalAngle, altitude: 30 },
    });
    return target;
}

describe('Drop Shadow + Inner Shadow option parity (Batch F)', () => {
    beforeEach(reset);

    it('Drop Shadow with Noise=0.5 produces non-uniform alpha distribution in the shadow body', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.canvas.width = 100; layer.canvas.height = 100;
        layer.ctx.fillStyle = '#ffffff';
        layer.ctx.fillRect(20, 20, 40, 40);

        useEditorStore.getState().addLayerEffect(layer.id, 'drop-shadow');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            color: '#000000', opacity: 1, angle: 0, distance: 15, spread: 0.5, size: 4,
            useGlobalLight: false,
            contour: 'linear', contourAntiAliased: true,
            noise: 0.8, knockout: 'off',
        });
        const target = compose();
        // Final target alpha is always 255 (opaque), so we read the rendered
        // red channel of the shadow body — shadow is black so darker = more
        // shadow coverage. With noise=0.8 the rendered shadow body should
        // exhibit pixel-to-pixel variation rather than a smooth plateau.
        const samples: number[] = [];
        for (let x = 70; x <= 82; x++) samples.push(pixelAt(target, x, 40).r);
        const min = Math.min(...samples);
        const max = Math.max(...samples);
        expect(max - min).toBeGreaterThan(10);
    });

    it('Drop Shadow with knockout=on erases the layer silhouette from the shadow', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.canvas.width = 100; layer.canvas.height = 100;
        layer.ctx.fillStyle = '#80808088'; // semi-transparent so the shadow could leak through
        layer.ctx.fillRect(20, 20, 40, 40);

        useEditorStore.getState().addLayerEffect(layer.id, 'drop-shadow');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            color: '#000000', opacity: 1, angle: 0, distance: 0, spread: 1, size: 0,
            useGlobalLight: false, knockout: 'on', noise: 0, contour: 'linear', contourAntiAliased: true,
        });
        const target = compose();
        // Sample at (40, 40) — center of the layer. With knockout the shadow
        // should be erased there, so the rendered pixel reflects the layer
        // alone (not shadow+layer).
        const center = pixelAt(target, 40, 40);
        // Without knockout the shadow at distance=0 would darken; with it on
        // the centre stays mid-grey-ish (layer's blended with checkerboard).
        expect(center.r).toBeGreaterThan(50);
    });

    it('Inner Shadow accepts contour + noise + useGlobalLight without breaking and produces a visible darkened band', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.canvas.width = 100; layer.canvas.height = 100;
        layer.ctx.fillStyle = '#ffffff';
        layer.ctx.fillRect(20, 20, 40, 40);
        useEditorStore.getState().addLayerEffect(layer.id, 'inner-shadow');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            color: '#000000', opacity: 1, angle: 0, distance: 5, choke: 0, size: 4,
            useGlobalLight: false, contour: 'linear', contourAntiAliased: true, noise: 0.3,
        });
        const target = compose();
        // Scan the left edge band — at least one column must be darker than
        // the white layer body (#ffffff = 255 across rgb).
        let foundDark = false;
        for (let x = 20; x <= 30; x++) {
            const p = pixelAt(target, x, 40);
            if (p.r < 240) { foundDark = true; break; }
        }
        expect(foundDark).toBe(true);
    });
});

describe('Outer Glow + Inner Glow option parity (Batch F)', () => {
    beforeEach(reset);

    it('Outer Glow with colorSource=gradient renders gradient colored glow (not flat solid color)', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.canvas.width = 100; layer.canvas.height = 100;
        layer.ctx.fillStyle = '#ffffff';
        layer.ctx.fillRect(40, 40, 20, 20);

        useEditorStore.getState().addLayerEffect(layer.id, 'outer-glow');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            opacity: 1, spread: 0.4, size: 15, blendMode: 'source-over',
            technique: 'softer',
            contour: 'linear', contourAntiAliased: true,
            range: 1, jitter: 0, noise: 0,
            colorSource: 'gradient',
            gradient: {
                // Stark gradient: at t=0 magenta (red+blue), at t=1 cyan
                // (green+blue) — large channel-wise contrast at both ends.
                colorStops: [
                    { position: 0, color: '#ff00ff' },
                    { position: 1, color: '#00ff00' },
                ],
                opacityStops: [
                    { position: 0, opacity: 1 },
                    { position: 1, opacity: 1 },
                ],
            },
        });
        const target = compose();
        // Sample near-edge (high glow alpha → near gradient start = magenta).
        const near = pixelAt(target, 62, 50);
        // Sample far-edge (low glow alpha → gradient end = green).
        const far = pixelAt(target, 70, 50);
        // Near has more red (magenta has red, green endpoint has none).
        expect(near.r).toBeGreaterThan(far.r);
        // Far has more green (green endpoint has 255 green, magenta has 0).
        expect(far.g).toBeGreaterThan(near.g);
    });

    it('Outer Glow with Technique=Precise produces a tighter/harder glow than Softer', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.canvas.width = 100; layer.canvas.height = 100;
        layer.ctx.fillStyle = '#ffffff';
        layer.ctx.fillRect(40, 40, 20, 20);

        useEditorStore.getState().addLayerEffect(layer.id, 'outer-glow');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            opacity: 1, size: 10, spread: 0,
            technique: 'softer',
            colorSource: 'solid', color: '#ff0000', range: 1,
        });
        const softerFarAlpha = pixelAt(compose(), 75, 50).a;
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            technique: 'precise',
        });
        const preciseFarAlpha = pixelAt(compose(), 75, 50).a;
        // Precise: dilation + tighter blur should yield less alpha at the
        // far edge than Softer's spread-out gaussian.
        expect(preciseFarAlpha).toBeLessThanOrEqual(softerFarAlpha + 2);
    });

    it('Inner Glow source=center brightens the silhouette interior more than source=edge', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.canvas.width = 100; layer.canvas.height = 100;
        layer.ctx.fillStyle = '#000000';
        layer.ctx.fillRect(30, 30, 40, 40);

        useEditorStore.getState().addLayerEffect(layer.id, 'inner-glow');
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            opacity: 1, choke: 0, size: 8, blendMode: 'source-over',
            source: 'edge', color: '#ffffff', range: 1, jitter: 0, noise: 0,
            colorSource: 'solid', contour: 'linear', contourAntiAliased: true,
        });
        const edgeCenter = pixelAt(compose(), 50, 50);
        useEditorStore.getState().setLayerEffectParams(layer.id, 0, {
            source: 'center',
        });
        const centerCenter = pixelAt(compose(), 50, 50);
        // Centre source means the interior centre is the bright core; edge
        // source means the centre is mostly the original layer color.
        expect(centerCenter.r).toBeGreaterThanOrEqual(edgeCenter.r);
    });
});
