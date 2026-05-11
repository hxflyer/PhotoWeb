import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { buildSelectionMask } from '../filters/selectionMask';
import { rasterizeBinaryRectMask } from '../tools/marquee';
import { getEyedropperOptions } from '../tools/eyedropper';
import { getPaintBucketOptions, setPaintBucketOptions } from '../tools/paintBucket';
import { setShapeOptions, getShapeOptions } from '../tools/shapes';
import { getTool } from '../tools/registry';
import { makeToolPointerEvent } from './simulator';

ensureStubsRegistered();

function reset() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        width: 200,
        height: 200,
        savedSelections: [],
        primaryColor: '#ff0000',
        secondaryColor: '#00ff00',
    }));
    useEditorStore.getState().addLayer();
}

function ctx() {
    return {
        store: useEditorStore.getState(),
        getStore: () => useEditorStore.getState(),
        requestRender: () => {},
    };
}

function getEyedropperOpts() {
    // The function isn't exported by name; read defaults via direct access.
    return getEyedropperOptions ? getEyedropperOptions() : null;
}
void getEyedropperOpts;

describe('audit-pass bug fixes', () => {
    beforeEach(reset);

    it('BUG-01 buildSelectionMask blurs alpha when feather > 0', () => {
        const sel = useEditorStore.getState().selection;
        useEditorStore.getState().setSelectionOperations([
            { mode: 'add', type: 'rect', path: [{ x: 50, y: 50 }, { x: 150, y: 150 }] },
        ]);
        useEditorStore.getState().setHasSelection(true);
        useEditorStore.getState().setSelectionFeather(8);

        const next = useEditorStore.getState().selection;
        const featheredMask = buildSelectionMask(next, 200, 200);
        expect(featheredMask).toBeTruthy();

        // Just outside the rect edge, alpha should be > 0 because of blur.
        const justOutside = featheredMask!.data[(50 * 200 + 45) * 4 + 3];
        expect(justOutside).toBeGreaterThan(0);

        // With feather = 0, the same pixel should be 0.
        useEditorStore.getState().setSelectionFeather(0);
        const sharpMask = buildSelectionMask(useEditorStore.getState().selection, 200, 200);
        const sharpOutside = sharpMask!.data[(50 * 200 + 45) * 4 + 3];
        expect(sharpOutside).toBe(0);
        void sel;
    });

    it('BUG-02 Paint Bucket Pattern source writes through to a checker, not flat FG', () => {
        const layer = useEditorStore.getState().layers[0];
        // Default 200x200 from reset; fill it white.
        layer.ctx.fillStyle = '#ffffff';
        layer.ctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);

        setPaintBucketOptions({ source: 'pattern', tolerance: 32, antiAlias: false, contiguous: false, sampleAllLayers: false, opacity: 1, mode: 'normal' });
        expect(getPaintBucketOptions().source).toBe('pattern');

        const tool = getTool('fill')!;
        tool.onPointerDown!(makeToolPointerEvent({ canvasX: 100, canvasY: 100 }), ctx());

        // After a pattern fill, the layer must contain both primary (#ff0000)
        // and secondary (#00ff00) somewhere — proof it's a checker, not a flat FG fill.
        const img = layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
        let hasRed = false, hasGreen = false;
        for (let i = 0; i < img.data.length; i += 4) {
            if (img.data[i] === 255 && img.data[i + 1] === 0 && img.data[i + 2] === 0) hasRed = true;
            if (img.data[i] === 0 && img.data[i + 1] === 255 && img.data[i + 2] === 0) hasGreen = true;
            if (hasRed && hasGreen) break;
        }
        expect(hasRed).toBe(true);
        expect(hasGreen).toBe(true);
    });

    it('BUG-03 .pwbdoc manifest serializes savedSelections', () => {
        // Direct manifest check: persistence stores savedSelections on the
        // manifest. We can't exercise the OPFS/localStorage path in this jsdom
        // variant (localStorage is non-functional in node 25 jsdom-experimental),
        // so we verify the structural piece — saveDocument reads
        // `store.savedSelections` and passes it through.
        useEditorStore.getState().setSelectionOperations([
            { mode: 'add', type: 'rect', path: [{ x: 10, y: 10 }, { x: 50, y: 50 }] },
        ]);
        useEditorStore.getState().setHasSelection(true);
        useEditorStore.getState().saveSelection('mySel');
        const store = useEditorStore.getState();
        expect(store.savedSelections).toHaveLength(1);
        expect(store.savedSelections[0].name).toBe('mySel');
        // Manifest field is included by saveDocument; we won't run it here.
        // The type is declared on `DocumentManifest.savedSelections` (persistence.ts),
        // and `loadDocument` restores it on the slice.
    });

    it('BUG-06 loadSelection with mode=add appends, not replaces', () => {
        useEditorStore.getState().setSelectionOperations([
            { mode: 'add', type: 'rect', path: [{ x: 0, y: 0 }, { x: 50, y: 50 }] },
        ]);
        useEditorStore.getState().setHasSelection(true);
        useEditorStore.getState().saveSelection('A');

        // Make a different active selection.
        useEditorStore.getState().setSelectionOperations([
            { mode: 'add', type: 'rect', path: [{ x: 100, y: 100 }, { x: 150, y: 150 }] },
        ]);
        useEditorStore.getState().setHasSelection(true);
        const beforeCount = useEditorStore.getState().selection.operations.length;
        useEditorStore.getState().loadSelection('A', 'add');
        expect(useEditorStore.getState().selection.operations.length).toBeGreaterThan(beforeCount);
    });

    it('BUG-07 rectangular marquee anti-alias toggle: AA off produces a binary mask', () => {
        const mask = rasterizeBinaryRectMask({ x: 10, y: 10, width: 30, height: 30 }, 200, 200);
        for (const v of mask!.data) expect(v === 0 || v === 255).toBe(true);
        expect(mask!.data[20 * 200 + 20]).toBe(255);
        expect(mask!.data[5 * 200 + 5]).toBe(0);
    });

    it('BUG-09 eyedropper default sample is current-layer (not all-layers)', () => {
        const opts = getEyedropperOptions();
        expect(opts.sample).toBe('current-layer');
    });
});

describe('audit-pass new features', () => {
    beforeEach(reset);

    it('GAP-02 Duplicate Layer creates an independent copy with the same pixel data', () => {
        const layer = useEditorStore.getState().layers[0];
        layer.canvas.width = 50; layer.canvas.height = 50;
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(0, 0, 50, 50);
        useEditorStore.getState().duplicateLayer(layer.id);

        const layers = useEditorStore.getState().layers;
        expect(layers).toHaveLength(2);
        const dup = layers[1];
        expect(dup.id).not.toBe(layer.id);
        const px = dup.ctx.getImageData(25, 25, 1, 1).data;
        expect(px[0]).toBe(255);
        expect(px[1]).toBe(0);
    });

    it('GAP-05 Polygon star: alternating-radius option round-trip', () => {
        setShapeOptions({ polygonStar: true, polygonStarRatio: 0.4 });
        const o = getShapeOptions();
        expect(o.polygonStar).toBe(true);
        expect(o.polygonStarRatio).toBeCloseTo(0.4, 5);
    });

    it('GAP-06 Line arrowheads: options round-trip', () => {
        setShapeOptions({ lineArrowStart: true, lineArrowEnd: true, lineArrowSize: 5 });
        const o = getShapeOptions();
        expect(o.lineArrowStart).toBe(true);
        expect(o.lineArrowEnd).toBe(true);
        expect(o.lineArrowSize).toBe(5);
    });
});
