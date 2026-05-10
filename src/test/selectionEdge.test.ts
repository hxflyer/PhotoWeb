import { describe, expect, it } from 'vitest';
import { quantizeSelectionMask, traceSelectionMaskLoops } from '../utils/selectionUtils';

describe('selection edge tracing', () => {
    it('quantizes a feathered mask at the edge threshold', () => {
        const mask = new Float32Array([
            0, 0.49, 0.5,
            0.51, 1, 0,
        ]);

        expect(Array.from(quantizeSelectionMask(mask, 3, 2))).toEqual([
            0, 0, 1,
            1, 1, 0,
        ]);
    });

    it('traces separate outer and inner loops for a punched selection mask', () => {
        const width = 5;
        const height = 5;
        const mask = new Float32Array(width * height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
                    mask[y * width + x] = 1;
                }
            }
        }

        const loops = traceSelectionMaskLoops(mask, width, height);
        expect(loops).toHaveLength(2);
        expect(loops.map(loop => loop.length).sort((a, b) => a - b)).toEqual([4, 4]);
    });
});
