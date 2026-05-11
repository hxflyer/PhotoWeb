import { Layer } from '../core/Layer';
import type { LayerColorTag } from '../core/Layer';
import type { CompoundHistoryAction, DocumentHistoryCommandOptions, GenericHistoryAction, HistoryAction, HistoryEntry } from '../core/history';

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
    isSaveSelectionDialogOpen: boolean;
    isLoadSelectionDialogOpen: boolean;
    isColorRangeDialogOpen: boolean;
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

export type LayerEditTarget = 'layer' | 'mask';

export interface LayersSlice {
    layers: Layer[];
    activeLayerId: string | null;
    selectedLayerIds: string[];
    layerSelectionAnchorId: string | null;
    activeLayerEditTarget: LayerEditTarget;
    setActiveLayerEditTarget: (target: LayerEditTarget) => void;
    addLayer: () => void;
    createLayerGroup: (name?: string) => void;
    groupLayers: (layerIds: string[], name?: string) => void;
    ungroupLayerGroup: (groupId: string) => void;
    toggleLayerGroupExpanded: (groupId: string) => void;
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
    addLayerMaskFromSelection: (id: string, mode: 'reveal' | 'hide') => void;
    removeLayerMask: (id: string) => void;
    setLayerMaskEnabled: (id: string, enabled: boolean) => void;
    setLayerMaskLinked: (id: string, linked: boolean) => void;
    invertLayerMask: (id: string) => void;
    applyLayerMask: (id: string) => void;
    setLayerMaskDensity: (id: string, density: number) => void;
    setLayerMaskFeather: (id: string, feather: number) => void;
    setLayerAdjustmentParams: (id: string, params: Record<string, unknown>) => void;
    setLayerFillData: (id: string, data: import('../core/fillLayer').FillLayerData) => void;
    setLayerName: (id: string, name: string) => void;
    duplicateLayer: (id: string) => void;
    rasterizeTypeLayer: (id: string) => void;
    addLayerEffect: (id: string, kind: import('../core/Layer').LayerEffectKind) => void;
    removeLayerEffect: (id: string, index: number) => void;
    setLayerEffectEnabled: (id: string, index: number, enabled: boolean) => void;
    setLayerEffectParams: (id: string, index: number, params: Record<string, unknown>) => void;
    selectLayer: (id: string, mode?: 'replace' | 'toggle' | 'range') => void;
    selectAllLayers: () => void;
    deselectLayers: () => void;
    alignSelectedLayers: (
        alignment: 'left' | 'horizontal-center' | 'right' | 'top' | 'vertical-center' | 'bottom',
        target?: 'selection' | 'canvas'
    ) => void;
    distributeSelectedLayers: (
        distribution: 'left' | 'horizontal-center' | 'right' | 'top' | 'vertical-center' | 'bottom'
    ) => void;
}

export interface SavedSelection {
    name: string;
    ops: SelectionOperation[];
}

export interface RefineEdgeOptions {
    radius: number;     // 0..250  Gaussian-style blur of the mask alpha
    smooth: number;     // 0..100  median-style contour smoothing
    feather: number;    // 0..250  global feather applied via setSelectionFeather
    contrast: number;   // 0..100  steepens the alpha falloff
    shiftEdge: number;  // -100..100  positive expands, negative contracts
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
    refineEdge: (opts: RefineEdgeOptions) => void;
    saveSelection: (name: string) => void;
    loadSelection: (name: string, mode?: 'replace' | 'add' | 'sub' | 'intersect') => void;
    pathToSelection: () => void;
    selectionToPath: () => void;
}

export interface BrushPreset {
    id: string;
    name: string;
    settings: BrushSettings;
    smoothing?: number;     // 0..1
    spacing?: number;       // 0..1+
}

export interface ToolPreset {
    id: string;
    name: string;
    toolId: ToolId;
    // Free-form snapshot of the tool's current options at preset-creation time.
    // Each tool may opt-in by implementing a `captureOptions()` / `applyOptions()`
    // pair; absent that, the preset is captured by deep-cloning a known subset.
    optionsBlob: Record<string, unknown>;
}

export interface PatternPreset {
    id: string;
    name: string;
    width: number;
    height: number;
    // Base64 PNG data URL of the captured tile.
    dataUrl: string;
}

export interface ToolsSlice {
    activeTool: ToolId;
    brushSettings: BrushSettings;
    cloneSource: { x: number; y: number } | null;
    shapeSettings: { filled: boolean };
    brushPresets: BrushPreset[];
    toolPresets: ToolPreset[];
    patternPresets: PatternPreset[];
    activePatternId: string | null;
    setTool: (tool: ToolId) => void;
    setBrushSize: (size: number) => void;
    setBrushHardness: (hardness: number) => void;
    setBrushOpacity: (opacity: number) => void;
    setBrushFlow: (flow: number) => void;
    setCloneSource: (point: { x: number; y: number } | null) => void;
    saveBrushPreset: (name: string, extras?: { smoothing?: number; spacing?: number }) => void;
    applyBrushPreset: (id: string) => void;
    removeBrushPreset: (id: string) => void;
    saveToolPreset: (name: string, optionsBlob: Record<string, unknown>) => void;
    applyToolPreset: (id: string, apply: (blob: Record<string, unknown>) => void) => void;
    removeToolPreset: (id: string) => void;
    definePattern: (name: string, source: HTMLCanvasElement | ImageData) => string;
    removePatternPreset: (id: string) => void;
    setActivePatternId: (id: string | null) => void;
}

export type ActiveChannel = 'rgb' | 'r' | 'g' | 'b';

export interface ChannelVisibility {
    r: boolean;
    g: boolean;
    b: boolean;
}

export interface ViewSlice {
    zoom: number;
    pan: { x: number; y: number };
    showRulers: boolean;
    showGrid: boolean;
    showSelectionEdges: boolean;
    gridSize: number;
    snapEnabled: boolean;
    guides: { orientation: 'horizontal' | 'vertical'; position: number }[];
    quickMaskMode: boolean;
    enablePerfLogging: boolean;
    activeChannel: ActiveChannel;
    channelVisibility: ChannelVisibility;
    setZoom: (zoom: number) => void;
    setPan: (x: number, y: number) => void;
    setShowRulers: (show: boolean) => void;
    setShowGrid: (show: boolean) => void;
    setShowSelectionEdges: (show: boolean) => void;
    setGridSize: (size: number) => void;
    setSnapEnabled: (snap: boolean) => void;
    addGuide: (orientation: 'horizontal' | 'vertical', position: number) => void;
    removeGuide: (index: number) => void;
    moveGuide: (index: number, position: number) => void;
    clearGuides: () => void;
    setQuickMaskMode: (on: boolean) => void;
    setEnablePerfLogging: (on: boolean) => void;
    setActiveChannel: (channel: ActiveChannel) => void;
    setChannelVisibility: (channel: 'r' | 'g' | 'b', visible: boolean) => void;
    toggleChannelVisibility: (channel: 'r' | 'g' | 'b') => void;
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

export type PanelId =
    | 'history' | 'layers' | 'channels' | 'paths'
    | 'color' | 'swatches' | 'adjustments'
    | 'properties' | 'character' | 'paragraph'
    | 'navigator' | 'info' | 'tools';

export type PanelVisibility = Record<PanelId, boolean>;

export interface PanelsSlice {
    dialogs: DialogState;
    panelVisibility: PanelVisibility;
    togglePanelVisibility: (panel: PanelId) => void;
    setPanelVisibility: (panel: PanelId, visible: boolean) => void;
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
    openSaveSelectionDialog: () => void;
    closeSaveSelectionDialog: () => void;
    openLoadSelectionDialog: () => void;
    closeLoadSelectionDialog: () => void;
    openColorRangeDialog: () => void;
    closeColorRangeDialog: () => void;
}

export interface HistorySlice {
    historyTick: number;
    historyEntries: HistoryEntry[];
    currentHistoryIndex: number;
    historyMaxSize: number;
    canUndo: boolean;
    canRedo: boolean;
    commitHistory: (action: HistoryAction) => HistoryEntry;
    executeCommand: (action: GenericHistoryAction) => HistoryEntry;
    executeCompoundCommand: (action: CompoundHistoryAction) => HistoryEntry;
    executeDocumentCommand: (options: DocumentHistoryCommandOptions) => HistoryEntry;
    undo: () => HistoryEntry | null;
    redo: () => HistoryEntry | null;
    revertToHistoryIndex: (index: number) => void;
    clearHistory: () => void;
    setHistoryMaxSize: (maxSize: number) => void;
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

export type RequirementStatus =
    | 'todo'
    | 'queued'
    | 'running'
    | 'done'
    | 'blocked'
    | 'failed'
    | 'needs-review'
    | 'cancelled';

export interface RequirementVerification {
    typecheck: 'pass' | 'fail' | 'not-run';
    lint: 'pass' | 'fail' | 'not-run';
    tests: 'pass' | 'fail' | 'not-run';
}

export interface RequirementReviewWorkspace {
    branchName: string;
    worktreePath: string;
    baseRef: string;
}

export interface RequirementItem {
    id: string;
    title: string;
    rawPrompt: string;
    normalizedPrompt: string;
    status: RequirementStatus;
    createdAt: string;
    updatedAt: string;
    startedAt?: string;
    completedAt?: string;
    source: 'user' | 'host' | 'agent';
    priority: 'low' | 'normal' | 'high';
    sourceContext?: {
        documentName?: string;
        activeTool?: string;
        activeLayerId?: string | null;
        selectedLayerIds?: string[];
        zoom?: number;
    };
    resultSummary?: string;
    failureReason?: string;
    changedFiles: string[];
    verification: RequirementVerification;
    runner?: string;
    reviewWorkspace?: RequirementReviewWorkspace;
    appliedAt?: string;
    mergeCommit?: string;
}

export interface RequirementsSlice {
    isRequirementsOverlayOpen: boolean;
    requirementsConnection: 'connecting' | 'online' | 'offline';
    requirementsDraft: string;
    selectedRequirementId: string | null;
    requirements: RequirementItem[];
    requirementLogs: Record<string, string[]>;
    setRequirementsOverlayOpen: (open: boolean) => void;
    toggleRequirementsOverlay: () => void;
    setRequirementsConnection: (connection: 'connecting' | 'online' | 'offline') => void;
    setRequirementsDraft: (draft: string) => void;
    selectRequirement: (id: string | null) => void;
    replaceRequirements: (items: RequirementItem[]) => void;
    upsertRequirement: (item: RequirementItem) => void;
    removeRequirement: (id: string) => void;
    appendRequirementLog: (requirementId: string, line: string) => void;
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
    & ToastsSlice
    & RequirementsSlice;
