import { Layer } from '../core/Layer';
import type { LayerColorTag } from '../core/Layer';
import type { HistoryAction, HistoryEntry } from '../core/history';

export type SelectionMode = 'rect' | 'circle' | 'lasso' | 'lasso-poly';

export interface SelectionMaskData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
}

export interface SelectionOperation {
    mode: 'add' | 'sub';
    path: { x: number; y: number }[];
    type: SelectionMode;
    mask?: SelectionMaskData;
}

export interface SelectionState {
    hasSelection: boolean;
    mode: SelectionMode;
    path: { x: number; y: number }[];
    polyPoints: { x: number; y: number }[];
    operations: SelectionOperation[];
    isDraggingSelection: boolean;
    feather?: number;
    isFreeEditMode: boolean;
}

export interface DialogState {
    isFeatherDialogOpen: boolean;
    filterDialog: { isOpen: boolean; filterId: string; params: Record<string, unknown> };
    adjustmentDialog: { isOpen: boolean; adjustmentId: string; params: Record<string, unknown> };
    isImageSizeOpen: boolean;
    isCanvasSizeOpen: boolean;
    isTrimOpen: boolean;
    isColorPickerOpen: boolean;
    colorPickerTarget: 'primary' | 'secondary' | 'type';
    isExportDialogOpen: boolean;
    isNewDocumentDialogOpen: boolean;
    isRefineEdgeDialogOpen: boolean;
}

export interface BrushSettings {
    size: number;
    opacity: number;
    hardness: number;
    flow: number;
}

export type ToolId =
    | 'move'
    | 'brush'
    | 'eraser'
    | 'select'
    | 'fill'
    | 'clone-stamp'
    | 'gradient'
    | 'crop'
    | 'shape-rect'
    | 'shape-circle'
    // Phase 1 tool registry IDs — pointer events dispatched via src/tools/registry.ts
    | 'marquee-rect'
    | 'marquee-ellipse'
    | 'lasso'
    | 'lasso-poly'
    | 'magic-wand'
    | 'quick-selection'
    | 'pencil'
    | 'dodge'
    | 'burn'
    | 'sponge'
    | 'pen'
    | 'freeform-pen'
    | 'path-selection'
    | 'direct-selection'
    | 'eyedropper'
    | 'type-horizontal'
    | 'type-vertical'
    | 'hand'
    | 'zoom'
    | 'shape-rectangle'
    | 'shape-rounded-rectangle'
    | 'shape-ellipse'
    | 'shape-polygon'
    | 'shape-line'
    | 'shape-custom';

export interface DocumentSlice {
    width: number;
    height: number;
    hasAutosave: boolean;
    documentName: string;
    setCanvasSize: (width: number, height: number) => void;
    rotateCanvas: (degrees: number) => void;
    flipCanvas: (axis: 'horizontal' | 'vertical') => void;
    resizeImage: (newW: number, newH: number, method: import('../core/imageTransforms').ResampleMethod) => void;
    resizeCanvas: (newW: number, newH: number, anchorX: number, anchorY: number, extensionColor: string) => void;
    trimCanvas: (basis: import('../core/imageTransforms').TrimBasis, sides: { top: boolean; right: boolean; bottom: boolean; left: boolean }) => void;
    newDocument: (w: number, h: number, bg: string) => void;
    openImageAsDocument: (img: HTMLImageElement, name: string) => void;
    setDocumentName: (name: string) => void;
    setHasAutosave: (has: boolean) => void;
    dismissAutosave: () => void;
    saveFile: (name: string) => Promise<void>;
    loadFile: (name: string) => Promise<void>;
}

export interface LayersSlice {
    layers: Layer[];
    activeLayerId: string | null;
    addLayer: () => void;
    addLayerFromImage: (img: HTMLImageElement, name: string) => void;
    addLayerFromContent: (content: HTMLCanvasElement, name: string, insertAfterId?: string) => void;
    removeLayer: (id: string) => void;
    reorderLayers: (dragIndex: number, hoverIndex: number) => void;
    setLayerOpacity: (id: string, opacity: number) => void;
    setLayerFill: (id: string, fill: number) => void;
    setLayerBlendMode: (id: string, mode: GlobalCompositeOperation) => void;
    mergeLayerDown: (id: string) => void;
    mergeVisible: () => void;
    stampVisible: () => void;
    flattenImage: () => void;
    layerViaCopy: () => void;
    layerViaCut: () => void;
    setActiveLayer: (id: string) => void;
    toggleLayerVisibility: (id: string) => void;
    soloLayer: (id: string) => void;
    renameLayer: (id: string, name: string) => void;
    setLayerLock: (id: string, kind: 'all' | 'transparency' | 'image' | 'position', value: boolean) => void;
    setLayerColorTag: (id: string, tag: LayerColorTag) => void;
    addFillLayer: (data: import('../core/fillLayer').FillLayerData, name?: string) => void;
    addAdjustmentLayer: (adjustmentId: string, params?: Record<string, unknown>, name?: string) => void;
    addLayerMask: (id: string, mode: 'reveal-all' | 'hide-all') => void;
    removeLayerMask: (id: string) => void;
    setLayerMaskEnabled: (id: string, enabled: boolean) => void;
    setLayerMaskLinked: (id: string, linked: boolean) => void;
    invertLayerMask: (id: string) => void;
    applyLayerMask: (id: string) => void;
}

export interface SavedSelection {
    name: string;
    ops: SelectionOperation[];
}

export interface SelectionSlice {
    selection: SelectionState;
    savedSelections: SavedSelection[];
    setSelectionMode: (mode: SelectionMode) => void;
    setSelectionPath: (path: { x: number; y: number }[]) => void;
    setSelectionOperations: (
        ops: SelectionOperation[]
    ) => void;
    addSelectionOperation: (op: SelectionOperation) => void;
    setHasSelection: (has: boolean) => void;
    setIsDraggingSelection: (is: boolean) => void;
    clearSelection: () => void;
    toggleInvertSelection: () => void;
    setSelectionFeather: (radius: number) => void;
    setFreeEditMode: (mode: boolean) => void;
    setPolyPoints: (points: { x: number; y: number }[]) => void;
    expandSelection: (px: number) => void;
    contractSelection: (px: number) => void;
    smoothSelection: () => void;
    borderSelection: (width: number) => void;
    saveSelection: (name: string) => void;
    loadSelection: (name: string) => void;
    pathToSelection: () => void;
    selectionToPath: () => void;
}

export interface ToolsSlice {
    activeTool: ToolId;
    brushSettings: BrushSettings;
    cloneSource: { x: number; y: number } | null;
    shapeSettings: { filled: boolean };
    setTool: (tool: ToolId) => void;
    setBrushSize: (size: number) => void;
    setBrushHardness: (hardness: number) => void;
    setBrushOpacity: (opacity: number) => void;
    setBrushFlow: (flow: number) => void;
    setCloneSource: (point: { x: number; y: number } | null) => void;
}

export type ActiveChannel = 'rgb' | 'r' | 'g' | 'b';

export interface ViewSlice {
    zoom: number;
    pan: { x: number; y: number };
    showRulers: boolean;
    showGrid: boolean;
    gridSize: number;
    snapEnabled: boolean;
    quickMaskMode: boolean;
    enablePerfLogging: boolean;
    activeChannel: ActiveChannel;
    setZoom: (zoom: number) => void;
    setPan: (x: number, y: number) => void;
    setShowRulers: (show: boolean) => void;
    setShowGrid: (show: boolean) => void;
    setGridSize: (size: number) => void;
    setSnapEnabled: (snap: boolean) => void;
    setQuickMaskMode: (on: boolean) => void;
    setEnablePerfLogging: (on: boolean) => void;
    setActiveChannel: (channel: ActiveChannel) => void;
}

export interface ColorSlice {
    primaryColor: string;
    secondaryColor: string;
    swatches: string[];
    setPrimaryColor: (color: string) => void;
    setSecondaryColor: (color: string) => void;
    swapColors: () => void;
    resetColors: () => void;
    addSwatch: (color: string) => void;
    removeSwatch: (index: number) => void;
}

export interface PanelsSlice {
    dialogs: DialogState;
    setFeatherDialogOpen: (open: boolean) => void;
    openFilterDialog: (filterId: string, params?: Record<string, unknown>) => void;
    closeFilterDialog: () => void;
    openAdjustmentDialog: (adjustmentId: string, params?: Record<string, unknown>) => void;
    closeAdjustmentDialog: () => void;
    openImageSizeDialog: () => void;
    openCanvasSizeDialog: () => void;
    openTrimDialog: () => void;
    closeImageSizeDialog: () => void;
    closeCanvasSizeDialog: () => void;
    closeTrimDialog: () => void;
    openColorPicker: (target: 'primary' | 'secondary' | 'type') => void;
    closeColorPicker: () => void;
    openExportDialog: () => void;
    closeExportDialog: () => void;
    openNewDocumentDialog: () => void;
    closeNewDocumentDialog: () => void;
    openRefineEdgeDialog: () => void;
    closeRefineEdgeDialog: () => void;
}

export interface HistorySlice {
    historyTick: number;
    historyEntries: HistoryEntry[];
    currentHistoryIndex: number;
    canUndo: boolean;
    canRedo: boolean;
    commitHistory: (action: HistoryAction) => HistoryEntry;
    undo: () => HistoryEntry | null;
    redo: () => HistoryEntry | null;
    revertToHistoryIndex: (index: number) => void;
    clearHistory: () => void;
    commitSnapshot: (label?: string) => void;
}

export interface Toast {
    id: string;
    message: string;
    type: 'info' | 'error' | 'success';
}

export interface ToastsSlice {
    toasts: Toast[];
    addToast: (message: string, type?: Toast['type']) => void;
    removeToast: (id: string) => void;
}

export type EditorStore =
    & DocumentSlice
    & LayersSlice
    & SelectionSlice
    & ToolsSlice
    & ViewSlice
    & ColorSlice
    & PanelsSlice
    & HistorySlice
    & ToastsSlice;
