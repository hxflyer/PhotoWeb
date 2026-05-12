import type { StateCreator } from 'zustand';
import type { EditorStore, PanelId, PanelsSlice, PanelVisibility, SelectionDialogPrefs } from './types';

const PANEL_VIS_STORAGE_KEY = 'photoweb-panel-visibility';
const SELECTION_DIALOG_PREFS_KEY = 'photoweb-selection-dialog-prefs';

function defaultSelectionDialogPrefs(): SelectionDialogPrefs {
    return {
        defringeWidth: 1,
        borderWidth: 5,
        smoothRadius: 3,
        expandPx: 5,
        contractPx: 5,
        refineEdge: {
            remember: false,
            radius: 0,
            smooth: 0,
            feather: 0,
            contrast: 0,
            shiftEdge: 0,
            smartRadius: false,
        },
        colorRange: {
            select: 'sampled',
            fuzziness: 40,
            localized: false,
            range: 100,
            invert: false,
        },
    };
}

function loadSelectionDialogPrefs(): SelectionDialogPrefs {
    if (typeof localStorage === 'undefined') return defaultSelectionDialogPrefs();
    try {
        const raw = localStorage.getItem(SELECTION_DIALOG_PREFS_KEY);
        if (!raw) return defaultSelectionDialogPrefs();
        const parsed = JSON.parse(raw) as Partial<SelectionDialogPrefs>;
        const base = defaultSelectionDialogPrefs();
        return {
            ...base,
            ...parsed,
            refineEdge: { ...base.refineEdge, ...(parsed.refineEdge ?? {}) },
            colorRange: { ...base.colorRange, ...(parsed.colorRange ?? {}) },
        };
    } catch {
        return defaultSelectionDialogPrefs();
    }
}

function persistSelectionDialogPrefs(prefs: SelectionDialogPrefs): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(SELECTION_DIALOG_PREFS_KEY, JSON.stringify(prefs));
    } catch {
        // Quota or storage disabled — non-fatal.
    }
}

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
        'brush-presets': true,
        'pattern-presets': true,
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
        isDefringeDialogOpen: false,
    },
    panelVisibility: loadPanelVisibility(),
    copiedLayerStyle: null,
    isScaleEffectsDialogOpen: false,
    isBorderSelectionDialogOpen: false,
    isSmoothSelectionDialogOpen: false,
    isExpandSelectionDialogOpen: false,
    isContractSelectionDialogOpen: false,
    isTransformSelectionOpen: false,
    selectionDialogPrefs: loadSelectionDialogPrefs(),
    setSelectionDialogPref: (key, value) => set(state => {
        const next = { ...state.selectionDialogPrefs, [key]: value };
        persistSelectionDialogPrefs(next);
        return { selectionDialogPrefs: next };
    }),
    openBorderSelectionDialog: () => set({ isBorderSelectionDialogOpen: true }),
    closeBorderSelectionDialog: () => set({ isBorderSelectionDialogOpen: false }),
    openSmoothSelectionDialog: () => set({ isSmoothSelectionDialogOpen: true }),
    closeSmoothSelectionDialog: () => set({ isSmoothSelectionDialogOpen: false }),
    openExpandSelectionDialog: () => set({ isExpandSelectionDialogOpen: true }),
    closeExpandSelectionDialog: () => set({ isExpandSelectionDialogOpen: false }),
    openContractSelectionDialog: () => set({ isContractSelectionDialogOpen: true }),
    closeContractSelectionDialog: () => set({ isContractSelectionDialogOpen: false }),
    openTransformSelection: () => set({ isTransformSelectionOpen: true }),
    closeTransformSelection: () => set({ isTransformSelectionOpen: false }),
    setCopiedLayerStyle: (effects) => set({ copiedLayerStyle: effects }),
    openScaleEffectsDialog: () => set({ isScaleEffectsDialogOpen: true }),
    closeScaleEffectsDialog: () => set({ isScaleEffectsDialogOpen: false }),
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
    toggleAllPanels: () => set(state => {
        const ids = Object.keys(state.panelVisibility) as PanelId[];
        const anyVisible = ids.some(id => state.panelVisibility[id]);
        const target = !anyVisible;
        const next: PanelVisibility = { ...state.panelVisibility };
        ids.forEach(id => { next[id] = target; });
        persistPanelVisibility(next);
        return { panelVisibility: next };
    }),
    toggleAllPanelsExceptCanvas: () => set(state => {
        // Shift+Tab hides every panel — including the toolbox — leaving only the
        // canvas, menu bar, and status bar visible. A second press restores all.
        const ids = Object.keys(state.panelVisibility) as PanelId[];
        const anyVisible = ids.some(id => state.panelVisibility[id]);
        const target = !anyVisible;
        const next: PanelVisibility = { ...state.panelVisibility };
        ids.forEach(id => { next[id] = target; });
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
    openDefringeDialog: () => set(state => ({ dialogs: { ...state.dialogs, isDefringeDialogOpen: true } })),
    closeDefringeDialog: () => set(state => ({ dialogs: { ...state.dialogs, isDefringeDialogOpen: false } })),
});
