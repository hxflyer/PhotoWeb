import { describe, it, expect, beforeEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { TypeOverlayMount } from '../components/Canvas/TypeOverlayMount';
import { setEditingType, cancelEditingType, typeToolState } from '../tools/type';
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
                style: {
                    fontFamily: 'system-ui',
                    fontSize: 32,
                    fontWeight: 400,
                    fontStyle: 'normal',
                    color: '#000',
                    letterSpacing: 0,
                    lineHeight: 1.2,
                    textAlign: 'left',
                },
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
                style: {
                    fontFamily: 'system-ui',
                    fontSize: 24,
                    fontWeight: 400,
                    fontStyle: 'normal',
                    color: '#000',
                    letterSpacing: 0,
                    lineHeight: 1.2,
                    textAlign: 'left',
                },
                transform: { x: 0, y: 0, width: 100, height: 30, rotation: 0 },
            });
        });
        expect(container.querySelector('[contenteditable]')).toBeTruthy();
        act(() => { cancelEditingType(); });
        expect(container.querySelector('[contenteditable]')).toBeNull();
    });

    it('typeToolState.editing is null after cancel', () => {
        setEditingType({
            id: 't',
            text: '',
            orientation: 'horizontal',
            style: {
                fontFamily: 'system-ui',
                fontSize: 24,
                fontWeight: 400,
                fontStyle: 'normal',
                color: '#000',
                letterSpacing: 0,
                lineHeight: 1.2,
                textAlign: 'left',
            },
            transform: { x: 0, y: 0, width: 100, height: 30, rotation: 0 },
        });
        expect(typeToolState.editing).not.toBeNull();
        cancelEditingType();
        expect(typeToolState.editing).toBeNull();
    });
});
