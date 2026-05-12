import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';
import { LayersPanel } from '../components/Panels/LayersPanel';
import { PanelFlyout, type PanelFlyoutItem } from '../components/Panels/PanelFlyout';

ensureStubsRegistered();

function resetWithLayers() {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState((s) => ({
        ...s,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        width: 100,
        height: 100,
    }));
    useEditorStore.getState().addLayer();
}

describe('PanelFlyout component (Batch F)', () => {
    afterEach(cleanup);

    it('shows the menu when the hamburger trigger is clicked', () => {
        let called = 0;
        const items: PanelFlyoutItem[] = [
            { label: 'First Item', onClick: () => { called += 1; } },
            { label: 'Second Item', onClick: () => {} },
        ];
        const { getByTestId, queryByTestId } = render(<PanelFlyout items={items} testId="t" />);
        expect(queryByTestId('t-menu')).toBeNull();
        fireEvent.click(getByTestId('t'));
        expect(getByTestId('t-menu')).toBeTruthy();
        fireEvent.click(getByTestId('panel-flyout-item-first-item'));
        expect(called).toBe(1);
        // Menu closes after selection.
        expect(queryByTestId('t-menu')).toBeNull();
    });

    it('renders separators and disabled items', () => {
        const items: PanelFlyoutItem[] = [
            { label: 'Enabled' },
            { separator: true, label: '' },
            { label: 'Disabled', disabled: true },
        ];
        const { getByTestId } = render(<PanelFlyout items={items} testId="t" />);
        fireEvent.click(getByTestId('t'));
        const disabledBtn = getByTestId('panel-flyout-item-disabled') as HTMLButtonElement;
        expect(disabledBtn.disabled).toBe(true);
    });
});

describe('LayersPanel hamburger flyout (Batch F)', () => {
    beforeEach(resetWithLayers);
    afterEach(cleanup);

    it('opens the Layers flyout and lists the canonical Photoshop menu items', () => {
        const { getByTestId } = render(<LayersPanel />);
        fireEvent.click(getByTestId('layers-panel-flyout'));
        expect(getByTestId('layers-panel-flyout-menu')).toBeTruthy();
        expect(getByTestId('panel-flyout-item-new-layer')).toBeTruthy();
        expect(getByTestId('panel-flyout-item-new-group')).toBeTruthy();
        expect(getByTestId('panel-flyout-item-duplicate-layer')).toBeTruthy();
        expect(getByTestId('panel-flyout-item-merge-down')).toBeTruthy();
        expect(getByTestId('panel-flyout-item-merge-visible')).toBeTruthy();
        expect(getByTestId('panel-flyout-item-flatten-image')).toBeTruthy();
    });

    it('selecting "New Group" via the flyout adds a group layer', () => {
        const beforeGroups = useEditorStore.getState().layers.filter(l => l.kind === 'group').length;
        const { getByTestId } = render(<LayersPanel />);
        fireEvent.click(getByTestId('layers-panel-flyout'));
        fireEvent.click(getByTestId('panel-flyout-item-new-group'));
        const afterGroups = useEditorStore.getState().layers.filter(l => l.kind === 'group').length;
        expect(afterGroups).toBe(beforeGroups + 1);
    });

    it('selecting "New Layer" via the flyout adds a new layer', () => {
        const before = useEditorStore.getState().layers.length;
        const { getByTestId } = render(<LayersPanel />);
        fireEvent.click(getByTestId('layers-panel-flyout'));
        fireEvent.click(getByTestId('panel-flyout-item-new-layer'));
        const after = useEditorStore.getState().layers.length;
        expect(after).toBe(before + 1);
    });

    it('selecting "Flatten Image" collapses all layers into one', () => {
        useEditorStore.getState().addLayer();
        useEditorStore.getState().addLayer();
        expect(useEditorStore.getState().layers.length).toBeGreaterThan(1);
        const { getByTestId } = render(<LayersPanel />);
        fireEvent.click(getByTestId('layers-panel-flyout'));
        fireEvent.click(getByTestId('panel-flyout-item-flatten-image'));
        expect(useEditorStore.getState().layers.length).toBe(1);
    });
});
