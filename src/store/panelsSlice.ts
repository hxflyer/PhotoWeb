import type { StateCreator } from 'zustand';
import type { EditorStore, PanelsSlice, PanelVisibility } from './types';

const PANEL_VIS_STORAGE_KEY = 'photoweb-panel-visibility';

function defaultPanelVisibility(): PanelVisibility {
    return {
        history: true,
        layers: true,
        channels: true,
        paths: true,
        color: true,
        swatches: true,
        adjustments: true,
        properties: true,
        character: true,
        paragraph: true,
        navigator: true,
        info: true,
        tools: true,
    };
}

function loadPanelVisibility(): PanelVisibility {
    if (typeof localStorage === 'undefined') return defaultPanelVisibility();
    try {
        const raw = localStorage.getItem(PANEL_VIS_STORAGE_KEY);
        if (!raw) return defaultPanelVisibility();
        const parsed = JSON.parse(raw) as Partial<PanelVisibility>;
        return { ...defaultPanelVisibility(), ...parsed };
    } catch {
        return defaultPanelVisibility();
    }
}

function persistPanelVisibility(vis: PanelVisibility): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(PANEL_VIS_STORAGE_KEY, JSON.stringify(vis));
    } catch {
        // Quota exceeded or storage disabled — non-fatal.
    }
}

export const createPanelsSlice: StateCreator<EditorStore, [], [], PanelsSlice> = (set) => ({
    dialogs: {
        isFeatherDialogOpen: false,
        filterDialog: { isOpen: false, filterId: '', params: {} },
        adjustmentDialog: { isOpen: false, adjustmentId: '', params: {} },
        isImageSizeOpen: false,
        isCanvasSizeOpen: false,
        isTrimOpen: false,
        isColorPickerOpen: false,
        colorPickerTarget: 'primary',
        isExportDialogOpen: false,
        isNewDocumentDialogOpen: false,
        isRefineEdgeDialogOpen: false,
        isSaveSelectionDialogOpen: false,
        isLoadSelectionDialogOpen: false,
        isColorRangeDialogOpen: false,
    },
    panelVisibility: loadPanelVisibility(),
    togglePanelVisibility: (panel) => set(state => {
        const next = { ...state.panelVisibility, [panel]: !state.panelVisibility[panel] };
        persistPanelVisibility(next);
        return { panelVisibility: next };
    }),
    setPanelVisibility: (panel, visible) => set(state => {
        const next = { ...state.panelVisibility, [panel]: visible };
        persistPanelVisibility(next);
        return { panelVisibility: next };
    }),
    setFeatherDialogOpen: (open) => set(state => ({ dialogs: { ...state.dialogs, isFeatherDialogOpen: open } })),
    openFilterDialog: (filterId, params) => set(state => ({
        dialogs: { ...state.dialogs, filterDialog: { isOpen: true, filterId, params: params ?? {} } },
    })),
    closeFilterDialog: () => set(state => ({
        dialogs: { ...state.dialogs, filterDialog: { ...state.dialogs.filterDialog, isOpen: false } },
    })),
    openAdjustmentDialog: (adjustmentId, params) => set(state => ({
        dialogs: { ...state.dialogs, adjustmentDialog: { isOpen: true, adjustmentId, params: params ?? {} } },
    })),
    closeAdjustmentDialog: () => set(state => ({
        dialogs: { ...state.dialogs, adjustmentDialog: { ...state.dialogs.adjustmentDialog, isOpen: false } },
    })),
    openImageSizeDialog: () => set(state => ({ dialogs: { ...state.dialogs, isImageSizeOpen: true } })),
    openCanvasSizeDialog: () => set(state => ({ dialogs: { ...state.dialogs, isCanvasSizeOpen: true } })),
    openTrimDialog: () => set(state => ({ dialogs: { ...state.dialogs, isTrimOpen: true } })),
    closeImageSizeDialog: () => set(state => ({ dialogs: { ...state.dialogs, isImageSizeOpen: false } })),
    closeCanvasSizeDialog: () => set(state => ({ dialogs: { ...state.dialogs, isCanvasSizeOpen: false } })),
    closeTrimDialog: () => set(state => ({ dialogs: { ...state.dialogs, isTrimOpen: false } })),
    openColorPicker: (target) => set(state => ({ dialogs: { ...state.dialogs, isColorPickerOpen: true, colorPickerTarget: target } })),
    closeColorPicker: () => set(state => ({ dialogs: { ...state.dialogs, isColorPickerOpen: false } })),
    openExportDialog: () => set(state => ({ dialogs: { ...state.dialogs, isExportDialogOpen: true } })),
    closeExportDialog: () => set(state => ({ dialogs: { ...state.dialogs, isExportDialogOpen: false } })),
    openNewDocumentDialog: () => set(state => ({ dialogs: { ...state.dialogs, isNewDocumentDialogOpen: true } })),
    closeNewDocumentDialog: () => set(state => ({ dialogs: { ...state.dialogs, isNewDocumentDialogOpen: false } })),
    openRefineEdgeDialog: () => set(state => ({ dialogs: { ...state.dialogs, isRefineEdgeDialogOpen: true } })),
    closeRefineEdgeDialog: () => set(state => ({ dialogs: { ...state.dialogs, isRefineEdgeDialogOpen: false } })),
    openSaveSelectionDialog: () => set(state => ({ dialogs: { ...state.dialogs, isSaveSelectionDialogOpen: true } })),
    closeSaveSelectionDialog: () => set(state => ({ dialogs: { ...state.dialogs, isSaveSelectionDialogOpen: false } })),
    openLoadSelectionDialog: () => set(state => ({ dialogs: { ...state.dialogs, isLoadSelectionDialogOpen: true } })),
    closeLoadSelectionDialog: () => set(state => ({ dialogs: { ...state.dialogs, isLoadSelectionDialogOpen: false } })),
    openColorRangeDialog: () => set(state => ({ dialogs: { ...state.dialogs, isColorRangeDialogOpen: true } })),
    closeColorRangeDialog: () => set(state => ({ dialogs: { ...state.dialogs, isColorRangeDialogOpen: false } })),
});
