import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { LayersPanel } from '../components/Panels/LayersPanel';
import { useEditorStore } from '../store/editorStore';
import { ensureStubsRegistered } from '../tools/stubs';

ensureStubsRegistered();

beforeEach(() => {
    useEditorStore.getState().clearHistory();
    useEditorStore.setState(s => ({
        ...s,
        layers: [],
        activeLayerId: null,
        selectedLayerIds: [],
        layerSelectionAnchorId: null,
        width: 200,
        height: 200,
    }));
    useEditorStore.getState().addLayer();
});

afterEach(() => cleanup());

describe('LayersPanel — drag into group, multi-select, context menu', () => {
    it('drops a layer into a group folder (default = top of group children)', () => {
        useEditorStore.getState().createLayerGroup('Group A');
        useEditorStore.getState().addLayer();
        useEditorStore.getState().addLayer();
        const ids = useEditorStore.getState().layers.map(l => l.id);
        const groupLayer = useEditorStore.getState().layers.find(l => l.kind === 'group')!;
        const otherLayer = useEditorStore.getState().layers.find(l => l.id !== groupLayer.id && l.id !== ids[0])!;
        // Drop otherLayer INTO groupLayer at the top
        useEditorStore.getState().moveLayerToGroup(otherLayer.id, groupLayer.id, 'top');
        const after = useEditorStore.getState().layers.find(l => l.id === otherLayer.id);
        expect(after?.parentId).toBe(groupLayer.id);
    });

    it('drops a layer at the bottom of a group with Shift held (position: bottom)', () => {
        useEditorStore.getState().createLayerGroup('Group A');
        useEditorStore.getState().addLayer();
        const groupLayer = useEditorStore.getState().layers.find(l => l.kind === 'group')!;
        const targetLayer = useEditorStore.getState().layers.find(l => l.id !== groupLayer.id)!;
        // First add some children to the group
        useEditorStore.getState().addLayer();
        const child = useEditorStore.getState().layers.at(-1)!;
        useEditorStore.getState().moveLayerToGroup(child.id, groupLayer.id, 'top');
        // Now drop the target at the BOTTOM
        useEditorStore.getState().moveLayerToGroup(targetLayer.id, groupLayer.id, 'bottom');
        const layers = useEditorStore.getState().layers;
        const children = layers.filter(l => l.parentId === groupLayer.id);
        expect(children[children.length - 1].id).toBe(targetLayer.id);
    });

    it('refuses to put a group inside one of its own descendants', () => {
        useEditorStore.getState().createLayerGroup('Parent');
        const parentGroup = useEditorStore.getState().layers.find(l => l.kind === 'group')!;
        useEditorStore.getState().createLayerGroup('Child');
        const childGroup = useEditorStore.getState().layers.filter(l => l.kind === 'group')[1];
        useEditorStore.getState().moveLayerToGroup(childGroup.id, parentGroup.id, 'top');
        // Try to drop parent into its own child — should be a no-op
        useEditorStore.getState().moveLayerToGroup(parentGroup.id, childGroup.id, 'top');
        const after = useEditorStore.getState().layers.find(l => l.id === parentGroup.id);
        expect(after?.parentId).toBe(null);
    });

    it('expands the target group when dropping into it', () => {
        useEditorStore.getState().createLayerGroup('Group A');
        useEditorStore.getState().addLayer();
        const groupLayer = useEditorStore.getState().layers.find(l => l.kind === 'group')!;
        // Collapse the group
        useEditorStore.getState().toggleLayerGroupExpanded(groupLayer.id);
        expect(useEditorStore.getState().layers.find(l => l.id === groupLayer.id)?.expanded).toBe(false);
        const target = useEditorStore.getState().layers.find(l => l.id !== groupLayer.id)!;
        useEditorStore.getState().moveLayerToGroup(target.id, groupLayer.id, 'top');
        expect(useEditorStore.getState().layers.find(l => l.id === groupLayer.id)?.expanded).toBe(true);
    });

    it('setSelectedLayerIds honors an explicit activeId so multi-selection survives clicks', () => {
        useEditorStore.getState().addLayer();
        useEditorStore.getState().addLayer();
        const ids = useEditorStore.getState().layers.map(l => l.id);
        useEditorStore.getState().setSelectedLayerIds([ids[0], ids[1], ids[2]], ids[1]);
        expect(useEditorStore.getState().selectedLayerIds).toEqual([ids[0], ids[1], ids[2]]);
        expect(useEditorStore.getState().activeLayerId).toBe(ids[1]);
    });

    it('right-click opens context menu with Blending Options + Layer Effects entries', () => {
        const { container } = render(<LayersPanel />);
        const layerId = useEditorStore.getState().layers[0].id;
        const row = container.querySelector(`[data-testid="layer-row-${layerId}"]`) as HTMLElement;
        fireEvent.contextMenu(row, { clientX: 100, clientY: 100 });
        const menu = container.querySelector('[data-testid="layer-context-menu"]');
        expect(menu).toBeTruthy();
        expect(container.querySelector('[data-testid="layer-context-blending-options"]')).toBeTruthy();
        expect(container.querySelector('[data-testid="layer-context-fx"]')).toBeTruthy();
    });

    it('clicking "Layer Effects ▸" opens the fx submenu with all 10 effect kinds', () => {
        const { container } = render(<LayersPanel />);
        const layerId = useEditorStore.getState().layers[0].id;
        const row = container.querySelector(`[data-testid="layer-row-${layerId}"]`) as HTMLElement;
        fireEvent.contextMenu(row, { clientX: 100, clientY: 100 });
        const fxButton = container.querySelector('[data-testid="layer-context-fx"]') as HTMLElement;
        fireEvent.click(fxButton);
        const submenu = container.querySelector('[data-testid="layer-context-fx-submenu"]');
        expect(submenu).toBeTruthy();
        for (const kind of ['drop-shadow', 'inner-shadow', 'outer-glow', 'inner-glow', 'bevel-emboss', 'satin', 'color-overlay', 'gradient-overlay', 'pattern-overlay', 'stroke']) {
            expect(container.querySelector(`[data-testid="layer-context-add-${kind}"]`)).toBeTruthy();
        }
    });

    it('clicking an effect in the submenu adds it to the layer', () => {
        const { container } = render(<LayersPanel />);
        const layerId = useEditorStore.getState().layers[0].id;
        const row = container.querySelector(`[data-testid="layer-row-${layerId}"]`) as HTMLElement;
        fireEvent.contextMenu(row, { clientX: 100, clientY: 100 });
        fireEvent.click(container.querySelector('[data-testid="layer-context-fx"]') as HTMLElement);
        fireEvent.click(container.querySelector('[data-testid="layer-context-add-drop-shadow"]') as HTMLElement);
        const layer = useEditorStore.getState().layers.find(l => l.id === layerId)!;
        expect(layer.effects.some(e => e.kind === 'drop-shadow')).toBe(true);
    });

    it('moveLayerToGroup with groupId=null moves a layer out to the root', () => {
        useEditorStore.getState().createLayerGroup('Parent');
        const groupLayer = useEditorStore.getState().layers.find(l => l.kind === 'group')!;
        useEditorStore.getState().addLayer();
        const child = useEditorStore.getState().layers.at(-1)!;
        useEditorStore.getState().moveLayerToGroup(child.id, groupLayer.id, 'top');
        expect(useEditorStore.getState().layers.find(l => l.id === child.id)?.parentId).toBe(groupLayer.id);
        useEditorStore.getState().moveLayerToGroup(child.id, null, 'top');
        expect(useEditorStore.getState().layers.find(l => l.id === child.id)?.parentId).toBe(null);
    });
});
