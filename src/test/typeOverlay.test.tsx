import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import { TypeOverlayMount } from '../components/Canvas/TypeOverlayMount';
import { TextEditOverlay } from '../components/Canvas/TextEditOverlay';
import { setEditingType, cancelEditingType, typeToolState, defaultTextStyle, updateEditingStyle, getEditingStyle } from '../tools/type';
import { useEditorStore } from '../store/editorStore';

function reset() {
    cancelEditingType();
    useEditorStore.setState((s) => ({ ...s, layers: [], activeLayerId: null }));
}

describe('TypeOverlayMount', () => {
    beforeEach(() => { cleanup(); reset(); });

    it('renders nothing when no type-edit is active', () => {
        const { container } = render(<TypeOverlayMount />);
        expect(container.querySelector('[contenteditable]')).toBeNull();
    });

    it('mounts a contenteditable overlay when setEditingType is called', () => {
        const { container } = render(<TypeOverlayMount />);
        act(() => {
            setEditingType({
                id: 'test-type',
                text: 'hello',
                orientation: 'horizontal',
                style: { ...defaultTextStyle, fontSize: 32, color: '#000' },
                transform: { x: 50, y: 60, width: 200, height: 40, rotation: 0 },
            });
        });
        const editable = container.querySelector('[contenteditable]') as HTMLElement | null;
        expect(editable).toBeTruthy();
        expect(editable!.innerText).toBe('hello');
    });

    it('cancelEditingType unmounts the overlay', () => {
        const { container } = render(<TypeOverlayMount />);
        act(() => {
            setEditingType({
                id: 't',
                text: '',
                orientation: 'horizontal',
                style: { ...defaultTextStyle, fontSize: 24, color: '#000' },
                transform: { x: 0, y: 0, width: 100, height: 30, rotation: 0 },
            });
        });
        expect(container.querySelector('[contenteditable]')).toBeTruthy();
        act(() => { cancelEditingType(); });
        expect(container.querySelector('[contenteditable]')).toBeNull();
    });

    it('typing does not overwrite the editable content mid-stroke (regression)', () => {
        const { container } = render(<TypeOverlayMount />);
        act(() => {
            setEditingType({
                id: 'r', text: '', orientation: 'horizontal',
                style: { ...defaultTextStyle, fontSize: 32 },
                transform: { x: 10, y: 10, width: 200, height: 40, rotation: 0 },
            });
        });
        const editable = container.querySelector('[contenteditable]') as HTMLElement;
        expect(editable).toBeTruthy();
        // Simulate typing: user types 'h' then 'i' — onInput fires with the cumulative innerText.
        act(() => {
            editable.innerText = 'h';
            editable.dispatchEvent(new Event('input', { bubbles: true }));
        });
        // Even though the editing state's text was updated to 'h', the next keystroke must NOT
        // reset innerText (which would erase the in-progress 'h' before 'i' is committed).
        act(() => {
            editable.innerText = 'hi';
            editable.dispatchEvent(new Event('input', { bubbles: true }));
        });
        // The DOM should still contain "hi" — no clobber.
        expect(editable.innerText).toBe('hi');
        cancelEditingType();
    });

    it('keeps text-edit mouse and key events out of the canvas tool handlers', () => {
        const parentMouseDown = vi.fn();
        const parentMouseMove = vi.fn();
        const parentMouseUp = vi.fn();
        const parentKeyDown = vi.fn();
        const { container } = render(
            <div
                onMouseDown={parentMouseDown}
                onMouseMove={parentMouseMove}
                onMouseUp={parentMouseUp}
                onKeyDown={parentKeyDown}
            >
                <TypeOverlayMount />
            </div>,
        );
        act(() => {
            setEditingType({
                id: 'events',
                text: 'hello world',
                orientation: 'horizontal',
                style: { ...defaultTextStyle, fontSize: 32 },
                transform: { x: 10, y: 10, width: 240, height: 40, rotation: 0 },
            });
        });

        const editable = container.querySelector('[contenteditable]') as HTMLElement;
        expect(fireEvent.mouseDown(editable)).toBe(true);
        expect(fireEvent.mouseMove(editable)).toBe(true);
        expect(fireEvent.mouseUp(editable)).toBe(true);
        fireEvent.keyDown(editable, { key: 'a' });

        expect(parentMouseDown).not.toHaveBeenCalled();
        expect(parentMouseMove).not.toHaveBeenCalled();
        expect(parentMouseUp).not.toHaveBeenCalled();
        expect(parentKeyDown).not.toHaveBeenCalled();
        expect(typeToolState.editing).not.toBeNull();
    });

    it('updateEditingStyle patches the active text-edit style live', () => {
        setEditingType({
            id: 'live', text: 'hi', orientation: 'horizontal',
            style: { ...defaultTextStyle, fontSize: 32, color: '#000' },
            transform: { x: 0, y: 0, width: 100, height: 30, rotation: 0 },
        });
        updateEditingStyle({ fontSize: 64, fauxBold: true, allCaps: true });
        const s = getEditingStyle();
        expect(s.fontSize).toBe(64);
        expect(s.fauxBold).toBe(true);
        expect(s.allCaps).toBe(true);
        // The fields the user didn't touch are preserved.
        expect(s.fontFamily).toBe(defaultTextStyle.fontFamily);
        cancelEditingType();
    });

    it('updateEditingStyle with no active edit updates the default style for next click', () => {
        cancelEditingType();
        updateEditingStyle({ fontSize: 99 });
        // getEditingStyle returns defaultTextStyle when no active edit.
        expect(getEditingStyle().fontSize).toBe(99);
        expect(defaultTextStyle.fontSize).toBe(99);
        // Reset to keep other tests stable.
        updateEditingStyle({ fontSize: 32 });
    });

    it('typeToolState.editing is null after cancel', () => {
        setEditingType({
            id: 't',
            text: '',
            orientation: 'horizontal',
            style: { ...defaultTextStyle, fontSize: 24, color: '#000' },
            transform: { x: 0, y: 0, width: 100, height: 30, rotation: 0 },
        });
        expect(typeToolState.editing).not.toBeNull();
        cancelEditingType();
        expect(typeToolState.editing).toBeNull();
    });

    it('resizes paragraph text boxes in canvas units when viewport is zoomed', () => {
        const onTransformChange = vi.fn();
        const { container } = render(
            <TextEditOverlay
                visible
                transform={{ x: 10, y: 20, width: 100, height: 50, rotation: 0 }}
                style={{ ...defaultTextStyle, fontSize: 32 }}
                initialValue="text"
                textMode="box"
                zoom={2}
                onChange={() => {}}
                onTransformChange={onTransformChange}
                onCommit={() => {}}
                onCancel={() => {}}
            />,
        );

        const eastHandle = container.querySelector('[title="Resize e"]') as HTMLElement;
        fireEvent.pointerDown(eastHandle, { clientX: 100, clientY: 50 });
        fireEvent.pointerMove(window, { clientX: 120, clientY: 50 });
        fireEvent.pointerUp(window);

        expect(onTransformChange).toHaveBeenLastCalledWith({ x: 10, y: 20, width: 110, height: 50, rotation: 0 });
    });
});
