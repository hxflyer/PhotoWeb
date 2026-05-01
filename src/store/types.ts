import { Layer } from '../core/Layer';
import type { LayerColorTag } from '../core/Layer';
import type { HistoryAction, HistoryEntry } from '../core/history';

export type SelectionMode = 'rect' | 'circle' | 'lasso' | 'lasso-poly';

export interface SelectionState {
    hasSelection: boolean;
    mode: SelectionMode;
    path: { x: number; y: number }[];
    polyPoints: { x: number; y: number }[];
    operations: { mode: 'add' | 'sub'; path: { x: number; y: number }[]; type: SelectionMode }[];
    isDraggingSelection: boolean;
    feather?: number;
    isFreeEditMode: boolean;
}

export interface DialogState {
    isFeatherDialogOpen: boolean;
}

export interface BrushSettings {
    size: number;
    opacity: number;
    hardness: number;
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
    | 'shape-circle';

export interface DocumentSlice {
    width: number;
    height: number;
    setCanvasSize: (width: number, height: number) => void;
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

export interface SelectionSlice {
    selection: SelectionState;
    setSelectionMode: (mode: SelectionMode) => void;
    setSelectionPath: (path: { x: number; y: number }[]) => void;
    setSelectionOperations: (
        ops: { mode: 'add' | 'sub'; path: { x: number; y: number }[]; type: SelectionMode }[]
    ) => void;
    addSelectionOperation: (op: {
        mode: 'add' | 'sub';
        path: { x: number; y: number }[];
        type: SelectionMode;
    }) => void;
    setHasSelection: (has: boolean) => void;
    setIsDraggingSelection: (is: boolean) => void;
    clearSelection: () => void;
    toggleInvertSelection: () => void;
    setSelectionFeather: (radius: number) => void;
    setFreeEditMode: (mode: boolean) => void;
    setPolyPoints: (points: { x: number; y: number }[]) => void;
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
    setCloneSource: (point: { x: number; y: number } | null) => void;
}

export interface ViewSlice {
    zoom: number;
    pan: { x: number; y: number };
    setZoom: (zoom: number) => void;
    setPan: (x: number, y: number) => void;
}

export interface ColorSlice {
    primaryColor: string;
    secondaryColor: string;
    setPrimaryColor: (color: string) => void;
    setSecondaryColor: (color: string) => void;
    swapColors: () => void;
}

export interface PanelsSlice {
    dialogs: DialogState;
    setFeatherDialogOpen: (open: boolean) => void;
}

export interface HistorySlice {
    historyTick: number;
    historyEntries: HistoryEntry[];
    canUndo: boolean;
    canRedo: boolean;
    commitHistory: (action: HistoryAction) => HistoryEntry;
    undo: () => HistoryEntry | null;
    redo: () => HistoryEntry | null;
    clearHistory: () => void;
}

export type EditorStore =
    & DocumentSlice
    & LayersSlice
    & SelectionSlice
    & ToolsSlice
    & ViewSlice
    & ColorSlice
    & PanelsSlice
    & HistorySlice;
