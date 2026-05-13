import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { Layer } from '../core/Layer';
import { ColorRangeDialog } from '../components/Dialogs/ColorRangeDialog';
import { useEditorStore } from '../store/editorStore';
import { buildColorRangeMask } from '../tools/colorRange';

function resetWithHalfRedBlue() {
    cleanup();
    useEditorStore.getState().clearHistory();
    const layer = new Layer(2, 1, 'colors');
    layer.ctx.fillStyle = '#ff0000';
    layer.ctx.fillRect(0, 0, 1, 1);
    layer.ctx.fillStyle = '#0000ff';
    layer.ctx.fillRect(1, 0, 1, 1);
    useEditorStore.setState(s => ({
        ...s,
        width: 2,
        height: 1,
        layers: [layer],
        activeLayerId: layer.id,
        primaryColor: '#ff0000',
        dialogs: { ...s.dialogs, isColorRangeDialogOpen: true },
        selectionDialogPrefs: {
            ...s.selectionDialogPrefs,
            colorRange: { select: 'sampled', fuzziness: 40, localized: false, range: 100, invert: false },
        },
    }));
}

async function waitForPreview() {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
}

describe('14b Color Range completion', () => {
    beforeEach(resetWithHalfRedBlue);

    it('sampled Color Range produces partial alpha inside the fuzziness falloff', () => {
        const image = new ImageData(3, 1);
        image.data.set([255, 0, 0, 255], 0);
        image.data.set([245, 0, 0, 255], 4);
        image.data.set([210, 0, 0, 255], 8);

        const mask = buildColorRangeMask(image, {
            samples: [{ color: '#ff0000', mode: 'add' }],
            fuzziness: 20,
        });

        expect(mask.data[0]).toBe(255);
        expect(mask.data[1]).toBeGreaterThan(0);
        expect(mask.data[1]).toBeLessThan(255);
        expect(mask.data[2]).toBe(0);
    });

    it('preview mode can render the selection on a white matte', async () => {
        render(<ColorRangeDialog />);
        await waitForPreview();

        fireEvent.change(screen.getByTestId('color-range-preview-mode'), { target: { value: 'on-white' } });
        await waitForPreview();

        const preview = screen.getByTestId('color-range-preview') as HTMLCanvasElement;
        const pixel = preview.getContext('2d')!.getImageData(225, 100, 1, 1).data;
        expect(pixel[0]).toBeGreaterThan(240);
        expect(pixel[1]).toBeGreaterThan(240);
        expect(pixel[2]).toBeGreaterThan(240);
    });

    it('Image preview mode shows the source image instead of the mask', async () => {
        render(<ColorRangeDialog />);
        await waitForPreview();

        fireEvent.click(screen.getByTestId('color-range-dialog-preview-image'));
        await waitForPreview();

        const preview = screen.getByTestId('color-range-preview') as HTMLCanvasElement;
        const pixel = preview.getContext('2d')!.getImageData(225, 100, 1, 1).data;
        expect(pixel[2]).toBeGreaterThan(200);
        expect(pixel[0]).toBeLessThan(80);
    });

    it('persists Color Range controls on OK', async () => {
        render(<ColorRangeDialog />);
        fireEvent.change(screen.getByTestId('color-range-preset'), { target: { value: 'blues' } });
        fireEvent.change(screen.getByTestId('color-range-fuzziness-input'), { target: { value: '88' } });
        fireEvent.click(screen.getByTestId('color-range-localized'));
        fireEvent.change(screen.getByTestId('color-range-range-input'), { target: { value: '7' } });
        fireEvent.click(screen.getByTestId('color-range-invert'));
        fireEvent.click(screen.getByTestId('color-range-ok'));

        expect(useEditorStore.getState().selectionDialogPrefs.colorRange).toEqual({
            select: 'blues',
            fuzziness: 88,
            localized: true,
            range: 7,
            invert: true,
        });
    });
});
