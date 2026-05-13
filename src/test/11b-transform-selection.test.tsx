import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Layer } from '../core/Layer';
import { TransformSelectionOverlay } from '../components/Canvas/TransformSelectionOverlay';
import { Viewport } from '../components/Canvas/Viewport';
import { useEditorStore } from '../store/editorStore';

function reset() {
    useEditorStore.getState().clearHistory();
    const layer = new Layer(100, 100, 'L');
    layer.ctx.fillStyle = '#00ff00';
    layer.ctx.fillRect(0, 0, 100, 100);
    useEditorStore.setState(s => ({
        ...s,
        width: 100,
        height: 100,
        zoom: 1,
        pan: { x: 0, y: 0 },
        layers: [layer],
        activeLayerId: layer.id,
        activeTool: 'marquee-rect',
        isTransformSelectionOpen: false,
        selection: {
            ...s.selection,
            hasSelection: true,
            mode: 'rect',
            path: [],
            polyPoints: [],
            operations: [{ mode: 'add', type: 'rect', path: [{ x: 10, y: 10 }, { x: 30, y: 30 }] }],
            isDraggingSelection: false,
            feather: 0,
        },
    }));
}

function selectedBounds() {
    const mask = useEditorStore.getState().selection.operations[0]?.mask?.data;
    if (!mask) throw new Error('expected mask selection');
    let minX = 100, minY = 100, maxX = -1, maxY = -1;
    for (let y = 0; y < 100; y++) {
        for (let x = 0; x < 100; x++) {
            if (mask[y * 100 + x] < 128) continue;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }
    }
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

async function renderOverlay(onClose = vi.fn()) {
    render(
        <>
            <div data-photoweb-document />
            <TransformSelectionOverlay zoom={1} panX={0} panY={0} onClose={onClose} />
        </>,
    );
    await screen.findByTestId('transform-selection-overlay');
    return onClose;
}

const originalRect = HTMLElement.prototype.getBoundingClientRect;

beforeEach(() => {
    reset();
    HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
        if ((this as HTMLElement).hasAttribute('data-photoweb-document')) {
            return {
                x: 0, y: 0, left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100,
                toJSON: () => ({}),
            } as DOMRect;
        }
        return originalRect.call(this);
    };
});

afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = originalRect;
    cleanup();
});

describe('11b Transform Selection', () => {
    it('right-clicking an active selection exposes Transform Selection', () => {
        render(<Viewport />);
        fireEvent.contextMenu(screen.getByTestId('viewport-workarea'), { clientX: 24, clientY: 24 });
        fireEvent.click(screen.getByText('Transform Selection'));
        expect(useEditorStore.getState().isTransformSelectionOpen).toBe(true);
    });

    it('corner dragging keeps the selection aspect ratio linked by default', async () => {
        await renderOverlay();
        fireEvent.mouseDown(screen.getByTestId('transform-selection-handle-se'), { clientX: 30, clientY: 30 });
        fireEvent.mouseMove(window, { clientX: 50, clientY: 30 });
        fireEvent.mouseUp(window);
        fireEvent.click(screen.getByTestId('transform-selection-commit'));

        const b = selectedBounds();
        expect(b.w).toBeGreaterThanOrEqual(38);
        expect(b.h).toBeGreaterThanOrEqual(38);
        expect(Math.abs(b.w - b.h)).toBeLessThanOrEqual(1);
    });

    it('holding Shift while dragging unlocks the linked aspect ratio', async () => {
        await renderOverlay();
        fireEvent.mouseDown(screen.getByTestId('transform-selection-handle-se'), { clientX: 30, clientY: 30 });
        fireEvent.mouseMove(window, { clientX: 50, clientY: 30, shiftKey: true });
        fireEvent.mouseUp(window);
        fireEvent.click(screen.getByTestId('transform-selection-commit'));

        const b = selectedBounds();
        expect(b.w).toBeGreaterThanOrEqual(38);
        expect(b.h).toBeGreaterThanOrEqual(18);
        expect(b.h).toBeLessThan(30);
    });

    it('linked W/H readouts resize the outline proportionally', async () => {
        await renderOverlay();
        fireEvent.change(screen.getByTestId('transform-selection-w'), { target: { value: '40' } });
        fireEvent.click(screen.getByTestId('transform-selection-commit'));

        const b = selectedBounds();
        expect(b.w).toBeGreaterThanOrEqual(38);
        expect(b.h).toBeGreaterThanOrEqual(38);
        expect(Math.abs(b.w - b.h)).toBeLessThanOrEqual(1);
    });

    it('Escape cancels without changing the original selection', async () => {
        const onClose = await renderOverlay();
        fireEvent.mouseDown(screen.getByTestId('transform-selection-handle-se'), { clientX: 30, clientY: 30 });
        fireEvent.mouseMove(window, { clientX: 50, clientY: 50 });
        fireEvent.keyDown(window, { key: 'Escape' });

        expect(onClose).toHaveBeenCalled();
        expect(useEditorStore.getState().selection.operations[0].path).toEqual([{ x: 10, y: 10 }, { x: 30, y: 30 }]);
    });
});
