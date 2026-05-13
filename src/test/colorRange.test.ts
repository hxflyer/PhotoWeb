import { beforeEach, describe, expect, it } from 'vitest';
import { Layer } from '../core/Layer';
import { useEditorStore } from '../store/editorStore';
import { applyColorRangeSelection, buildColorRangeMask } from '../tools/colorRange';

describe('Color Range selection', () => {
    beforeEach(() => {
        useEditorStore.getState().clearHistory();
        useEditorStore.setState(s => ({
            ...s,
            width: 4,
            height: 2,
            layers: [],
            activeLayerId: null,
            selection: {
                ...s.selection,
                hasSelection: false,
                path: [],
                operations: [],
            },
        }));
    });

    it('builds a mask from sampled color and fuzziness', () => {
        const image = new ImageData(3, 1);
        image.data.set([255, 0, 0, 255], 0);
        image.data.set([250, 4, 4, 255], 4);
        image.data.set([0, 0, 255, 255], 8);

        const tight = buildColorRangeMask(image, { samples: [{ color: '#ff0000', mode: 'add' }], fuzziness: 0 });
        expect([...tight.data]).toEqual([255, 0, 0]);

        const fuzzy = buildColorRangeMask(image, { samples: [{ color: '#ff0000', mode: 'add' }], fuzziness: 10 });
        expect(fuzzy.data[0]).toBe(255);
        expect(fuzzy.data[1]).toBeGreaterThan(0);
        expect(fuzzy.data[1]).toBeLessThan(255);
        expect(fuzzy.data[2]).toBe(0);
    });

    it('applies color range as an undoable selection operation', () => {
        const layer = new Layer(4, 2, 'Color source');
        layer.ctx.fillStyle = '#ff0000';
        layer.ctx.fillRect(0, 0, 2, 2);
        layer.ctx.fillStyle = '#0000ff';
        layer.ctx.fillRect(2, 0, 2, 2);
        useEditorStore.setState(s => ({
            ...s,
            layers: [layer],
            activeLayerId: layer.id,
        }));

        const selected = applyColorRangeSelection(useEditorStore.getState(), {
            samples: [{ color: '#ff0000', mode: 'add' }],
            fuzziness: 5,
        });

        expect(selected).toBe(true);
        const op = useEditorStore.getState().selection.operations[0];
        expect(op.mask?.data[0]).toBe(255);
        expect(op.mask?.data[1]).toBe(255);
        expect(op.mask?.data[2]).toBe(0);
        expect(useEditorStore.getState().selection.hasSelection).toBe(true);

        useEditorStore.getState().undo();
        expect(useEditorStore.getState().selection.hasSelection).toBe(false);

        useEditorStore.getState().redo();
        expect(useEditorStore.getState().selection.operations[0].mask?.data[0]).toBe(255);
    });

    it('subtract samples remove matching pixels from the range', () => {
        const image = new ImageData(2, 1);
        image.data.set([255, 0, 0, 255], 0);
        image.data.set([250, 4, 4, 255], 4);

        const mask = buildColorRangeMask(image, {
            samples: [
                { color: '#ff0000', mode: 'add' },
                { color: '#fa0404', mode: 'sub' },
            ],
            fuzziness: 10,
        });

        expect([...mask.data]).toEqual([0, 0]);
    });
});
