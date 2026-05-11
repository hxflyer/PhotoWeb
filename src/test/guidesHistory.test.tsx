import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { NewGuideDialog } from '../components/Dialogs/NewGuideDialog';

function reset() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        width: 400,
        height: 400,
        guides: [],
        showGuides: true,
        guidesLocked: false,
        isNewGuideDialogOpen: false,
    }));
}

describe('GUIDE-02 — New Guide dialog and history wrapping', () => {
    beforeEach(() => {
        cleanup();
        reset();
    });

    it('opening the New Guide dialog, picking Horizontal + 100, OK adds a guide', () => {
        render(<NewGuideDialog isOpen onClose={() => useEditorStore.getState().setNewGuideDialogOpen(false)} />);

        // Default orientation is horizontal; set position to 100 and click OK.
        const posInput = screen.getByLabelText('Position') as HTMLInputElement;
        fireEvent.change(posInput, { target: { value: '100' } });
        fireEvent.click(screen.getByText('OK'));

        const guides = useEditorStore.getState().guides;
        expect(guides).toHaveLength(1);
        expect(guides[0]).toEqual({ orientation: 'horizontal', position: 100 });
    });

    it('undo removes the new guide, redo restores it', () => {
        useEditorStore.getState().addGuideWithHistory('horizontal', 100);
        expect(useEditorStore.getState().guides).toHaveLength(1);

        useEditorStore.getState().undo();
        expect(useEditorStore.getState().guides).toHaveLength(0);

        useEditorStore.getState().redo();
        expect(useEditorStore.getState().guides).toHaveLength(1);
        expect(useEditorStore.getState().guides[0].position).toBe(100);
    });

    it('moveGuideWithHistory creates a single undo entry restoring the prior position', () => {
        useEditorStore.getState().addGuideWithHistory('horizontal', 100);
        const beforeEntries = useEditorStore.getState().historyEntries.length;

        useEditorStore.getState().moveGuideWithHistory(0, 200);
        expect(useEditorStore.getState().guides[0].position).toBe(200);
        expect(useEditorStore.getState().historyEntries.length).toBe(beforeEntries + 1);

        useEditorStore.getState().undo();
        expect(useEditorStore.getState().guides[0].position).toBe(100);
    });

    it('begin/update/commit guide drag records exactly one history entry', () => {
        useEditorStore.getState().addGuideWithHistory('horizontal', 100);
        const beforeEntries = useEditorStore.getState().historyEntries.length;

        useEditorStore.getState().beginGuideDrag(0);
        useEditorStore.getState().updateGuideDrag(150);
        useEditorStore.getState().updateGuideDrag(180);
        useEditorStore.getState().updateGuideDrag(220);
        useEditorStore.getState().commitGuideDrag();

        expect(useEditorStore.getState().guides[0].position).toBe(220);
        expect(useEditorStore.getState().historyEntries.length).toBe(beforeEntries + 1);

        useEditorStore.getState().undo();
        expect(useEditorStore.getState().guides[0].position).toBe(100);
    });

    it('clearGuidesWithHistory then undo restores all guides', () => {
        useEditorStore.getState().addGuideWithHistory('horizontal', 50);
        useEditorStore.getState().addGuideWithHistory('vertical', 75);
        useEditorStore.getState().addGuideWithHistory('horizontal', 200);
        expect(useEditorStore.getState().guides).toHaveLength(3);

        useEditorStore.getState().clearGuidesWithHistory();
        expect(useEditorStore.getState().guides).toHaveLength(0);

        useEditorStore.getState().undo();
        const restored = useEditorStore.getState().guides;
        expect(restored).toHaveLength(3);
        expect(restored[0]).toEqual({ orientation: 'horizontal', position: 50 });
        expect(restored[1]).toEqual({ orientation: 'vertical', position: 75 });
        expect(restored[2]).toEqual({ orientation: 'horizontal', position: 200 });
    });

    it('showGuides=false flips the viewSlice flag so Viewport can skip rendering', () => {
        expect(useEditorStore.getState().showGuides).toBe(true);
        useEditorStore.getState().setShowGuides(false);
        expect(useEditorStore.getState().showGuides).toBe(false);
        useEditorStore.getState().setShowGuides(true);
        expect(useEditorStore.getState().showGuides).toBe(true);
    });

    it('guidesLocked=true makes moveGuideWithHistory a no-op (no history entry)', () => {
        useEditorStore.getState().addGuideWithHistory('horizontal', 100);
        const beforeEntries = useEditorStore.getState().historyEntries.length;

        useEditorStore.getState().setGuidesLocked(true);
        useEditorStore.getState().moveGuideWithHistory(0, 300);

        expect(useEditorStore.getState().guides[0].position).toBe(100);
        expect(useEditorStore.getState().historyEntries.length).toBe(beforeEntries);
    });

    it('guidesLocked=true makes the drag session a no-op', () => {
        useEditorStore.getState().addGuideWithHistory('horizontal', 100);
        const beforeEntries = useEditorStore.getState().historyEntries.length;

        useEditorStore.getState().setGuidesLocked(true);
        useEditorStore.getState().beginGuideDrag(0);
        useEditorStore.getState().updateGuideDrag(250);
        useEditorStore.getState().commitGuideDrag();

        expect(useEditorStore.getState().guides[0].position).toBe(100);
        expect(useEditorStore.getState().historyEntries.length).toBe(beforeEntries);
    });

    it('adding 3 guides then undoing once leaves exactly 2', () => {
        useEditorStore.getState().addGuideWithHistory('horizontal', 10);
        useEditorStore.getState().addGuideWithHistory('vertical', 20);
        useEditorStore.getState().addGuideWithHistory('horizontal', 30);
        expect(useEditorStore.getState().guides).toHaveLength(3);

        useEditorStore.getState().undo();
        expect(useEditorStore.getState().guides).toHaveLength(2);
        expect(useEditorStore.getState().guides[0].position).toBe(10);
        expect(useEditorStore.getState().guides[1].position).toBe(20);
    });

    it('removeGuideWithHistory undoes back to the original guides', () => {
        useEditorStore.getState().addGuideWithHistory('horizontal', 50);
        useEditorStore.getState().addGuideWithHistory('vertical', 75);
        expect(useEditorStore.getState().guides).toHaveLength(2);

        useEditorStore.getState().removeGuideWithHistory(0);
        expect(useEditorStore.getState().guides).toHaveLength(1);
        expect(useEditorStore.getState().guides[0].orientation).toBe('vertical');

        useEditorStore.getState().undo();
        const restored = useEditorStore.getState().guides;
        expect(restored).toHaveLength(2);
        expect(restored[0]).toEqual({ orientation: 'horizontal', position: 50 });
    });

    it('Esc keydown closes the New Guide dialog without adding a guide', () => {
        const onClose = () => useEditorStore.getState().setNewGuideDialogOpen(false);
        useEditorStore.getState().setNewGuideDialogOpen(true);
        render(<NewGuideDialog isOpen onClose={onClose} />);

        const dialog = screen.getByRole('dialog');
        fireEvent.keyDown(dialog, { key: 'Escape' });
        expect(useEditorStore.getState().guides).toHaveLength(0);
        expect(useEditorStore.getState().isNewGuideDialogOpen).toBe(false);
    });

    it('Enter keydown inside the dialog commits the guide', () => {
        const onClose = () => useEditorStore.getState().setNewGuideDialogOpen(false);
        useEditorStore.getState().setNewGuideDialogOpen(true);
        render(<NewGuideDialog isOpen onClose={onClose} />);

        const posInput = screen.getByLabelText('Position') as HTMLInputElement;
        fireEvent.change(posInput, { target: { value: '42' } });
        fireEvent.keyDown(posInput, { key: 'Enter' });

        const guides = useEditorStore.getState().guides;
        expect(guides).toHaveLength(1);
        expect(guides[0]).toEqual({ orientation: 'horizontal', position: 42 });
        expect(useEditorStore.getState().isNewGuideDialogOpen).toBe(false);
    });

    it('vertical radio + negative position is accepted', () => {
        render(<NewGuideDialog isOpen onClose={() => useEditorStore.getState().setNewGuideDialogOpen(false)} />);

        fireEvent.click(screen.getByLabelText('Vertical'));
        const posInput = screen.getByLabelText('Position') as HTMLInputElement;
        fireEvent.change(posInput, { target: { value: '-25' } });
        fireEvent.click(screen.getByText('OK'));

        const guides = useEditorStore.getState().guides;
        expect(guides).toHaveLength(1);
        expect(guides[0]).toEqual({ orientation: 'vertical', position: -25 });
    });
});
