import type { StateCreator } from 'zustand';
import type { EditorStore, PanelsSlice } from './types';

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
    },
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
});
